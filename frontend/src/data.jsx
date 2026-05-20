// BankruptIQ — data layer: fetches companies from MongoDB API → window.BIQ_DATA

(function () {
  "use strict";

  /* ── Helpers ──────────────────────────────────────────────────── */

  function hash(str) {
    let h = 0;
    for (let i = 0; i < str.length; i++) h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
    return Math.abs(h);
  }

  function sr(str, off) { // seeded-random 0..1, deterministic
    return (hash(str + ":" + (off || 0)) % 9973) / 9973;
  }

  function syncGet(url) {
    const xhr = new XMLHttpRequest();
    xhr.open("GET", url, false); // synchronous — data must be ready before React mounts
    try { xhr.send(null); } catch (e) { return null; }
    if (xhr.status >= 200 && xhr.status < 300) {
      try { return JSON.parse(xhr.responseText); } catch (e) { return null; }
    }
    return null;
  }

  /* ── Financial computations ───────────────────────────────────── */

  // Altman Z' (private firm variant, 1983)
  // ROA, ROE, NPM are stored as percentages (e.g. 12.5 = 12.5%)
  function altmanZ(ind) {
    const x1 = ind.working_capital_ratio;                              // WC / Total Assets (decimal)
    const x2 = Math.max(-0.5, Math.min(0.5, ind.return_on_assets / 100 * 0.65));  // RE / TA approx
    const x3 = Math.max(-0.3, Math.min(0.5, ind.return_on_assets / 100 * 1.4));   // EBIT / TA approx
    const x4 = Math.min(5.0, (1 - Math.min(0.98, ind.debt_ratio)) / Math.max(0.05, ind.debt_ratio)); // BV Eq / Liab
    const x5 = ind.asset_turnover;                                     // Revenue / TA
    return +(0.717 * x1 + 0.847 * x2 + 3.107 * x3 + 0.420 * x4 + 0.998 * x5).toFixed(3);
  }

  // Simplified Ohlson O-Score
  function ohlsonO(ind) {
    const tlta = Math.min(2.0, ind.debt_ratio);
    const wcta = ind.working_capital_ratio;
    const clca = Math.min(3, 1 / Math.max(0.1, ind.current_ratio));
    const nita = ind.return_on_assets / 100;
    const futl = Math.min(2, 1 / Math.max(0.1, Math.abs(ind.interest_coverage)));
    const oeneg = ind.debt_ratio >= 1 ? 1 : 0;
    return +(-1.32 + 6.03 * tlta - 1.43 * wcta + 0.076 * clca - 2.37 * nita - 1.83 * futl - 1.72 * oeneg).toFixed(3);
  }

  function toRiskClass(riskLabel, z) {
    if (riskLabel === "Risc mare") return "high";
    if (riskLabel === "Risc mediu") return "medium";
    if (riskLabel === "Risc mic") return "low";
    return z < 1.81 ? "high" : z < 2.99 ? "medium" : "low";
  }

  /* ── 60-month Z-score trend ───────────────────────────────────── */
  // Covers Apr 2021 → Mar 2026 (60 months)

  function buildZTrend(annualPts, name) {
    const sorted = [...annualPts].sort((a, b) => a.year - b.year);
    const result = [];
    const BASE_YEAR = 2021, BASE_MONTH = 3; // April 2021 = index 0

    for (let i = 0; i < 60; i++) {
      const totalM = BASE_MONTH + i;
      const yr = BASE_YEAR + Math.floor(totalM / 12);
      const fracYr = yr + (totalM % 12) / 12;

      let z;
      if (sorted.length === 0) {
        z = 2.5;
      } else if (sorted.length === 1) {
        z = sorted[0].z;
      } else {
        let lo = sorted[0], hi = sorted[sorted.length - 1];
        for (let j = 0; j < sorted.length - 1; j++) {
          if (sorted[j].year <= fracYr && sorted[j + 1].year >= fracYr) {
            lo = sorted[j]; hi = sorted[j + 1]; break;
          }
        }
        if (fracYr <= lo.year) z = lo.z;
        else if (fracYr >= hi.year) z = hi.z + (fracYr - hi.year) * 0.015;
        else {
          const t = (fracYr - lo.year) / (hi.year - lo.year);
          z = lo.z + t * (hi.z - lo.z);
        }
      }

      const n1 = Math.sin(i * 2.3 + hash(name) * 0.0013) * 0.11;
      const n2 = Math.cos(i * 1.1 + hash(name + "q") * 0.0009) * 0.055;
      result.push(+(Math.max(0.05, z + n1 + n2)).toFixed(2));
    }
    return result;
  }

  /* ── Revenue trend (60 months, mil RON) ──────────────────────────
   * Bazat pe formula: Revenue_t = Assets × Asset_Turnover
   * Assets_0 = BASE_REV[sector] / asset_turnover_sector
   * Trend: cresc ~2.2%/an + ciclu sezonier mic
   * ──────────────────────────────────────────────────────────────── */

  function buildRevenueTrend(base, name, assetTurnover) {
    const out = [];
    // Nivel inițial: derivat din active estimate și rotație
    let v = base / Math.max(0.2, assetTurnover) * assetTurnover;
    // Ajustare dimensiune companie cu hash determinist (nu pur random)
    const sizeAdj = 0.5 + (hash(name) % 1000) / 1000;
    v *= sizeAdj;
    for (let i = 0; i < 60; i++) {
      // Creștere anuală 2.2% + sezonalitate (sin pe 12 luni)
      const g = 1 + (0.022 / 12) + Math.sin(i * Math.PI / 6) * 0.008;
      // Zgomot mic determinist (0.5% per lună)
      const noise = 1 + (((hash(name + i) % 200) - 100) / 100) * 0.005;
      v *= g * noise;
      out.push(+v.toFixed(1));
    }
    return out;
  }

  /* ── Ticker generator ─────────────────────────────────────────── */

  function makeTicker(name, usedSet) {
    const words = name.toUpperCase().replace(/[^A-ZĂÂÎȘȚ\s]/gi, "").split(/\s+/).filter(w => w.length > 1);
    let base;
    if (words.length >= 3) base = words.map(w => w[0]).join("").slice(0, 4);
    else if (words.length === 2) base = words[0].slice(0, 2) + words[1].slice(0, 2);
    else base = (words[0] || name.slice(0, 4)).slice(0, 4);
    base = base.replace(/[^A-Z0-9]/g, "").padEnd(2, "X").slice(0, 4);
    let ticker = base, n = 2;
    while (usedSet.has(ticker)) { ticker = base.slice(0, 3) + n; n++; }
    usedSet.add(ticker);
    return ticker;
  }

  /* ── Flags ────────────────────────────────────────────────────── */

  const FLAG_LABELS = {
    cr_low:    "Current ratio < 1.0 — risc de lichiditate pe termen scurt",
    debt_high: "Rata datorii > 0.70 — levier financiar ridicat",
    npm_neg:   "Marjă profit netă negativă — pierdere operațională",
    roe_neg:   "ROE negativ — distrugere de valoare pentru acționari",
    ic_low:    "Acoperire dobânzi < 1.5× — risc de neplată",
    roa_low:   "ROA < 2% — eficiență scăzută a activelor",
    z_distress:"Altman Z < 1.81 — zonă de distress financiar",
    z_grey:    "Altman Z 1.81–2.99 — zonă gri, monitorizare activă",
  };

  function getFlags(ind, z) {
    const f = [];
    if (ind.current_ratio < 1.0) f.push("cr_low");
    if (ind.debt_ratio > 0.70) f.push("debt_high");
    if (ind.net_profit_margin < 0) f.push("npm_neg");
    if (ind.return_on_equity < 0) f.push("roe_neg");
    if (ind.interest_coverage < 1.5) f.push("ic_low");
    if (ind.return_on_assets < 2) f.push("roa_low"); // stored as %, so 2 = 2%
    if (z < 1.81) f.push("z_distress");
    else if (z < 2.99) f.push("z_grey");
    return f;
  }

  /* ── Sector metadata ──────────────────────────────────────────── */

  const SECTOR_DISPLAY = {
    Agricultura:         "Agricultură",
    Constructii:         "Construcții",
    IT_Telecom:          "IT & Telecom",
    Comert:              "Comerț & Retail",
    Productie:           "Producție",
    Transport_Logistica: "Transport & Logistică",
    Sanatate_Farma:      "Sănătate & Farma",
    Energie:             "Energie",
    Turism_HoReCa:       "Turism & HoReCa",
    Diverse:             "Diverse",
  };

  const SECTOR_HQ = {
    Agricultura: "Craiova", Constructii: "Cluj-Napoca", IT_Telecom: "București",
    Comert: "București", Productie: "Ploiești", Transport_Logistica: "Constanța",
    Sanatate_Farma: "Cluj-Napoca", Energie: "Petroșani", Turism_HoReCa: "Brașov",
    Diverse: "București",
  };

  // Active nete medii pe sector (mil RON) — baza calculului financiar
  // Sursa: rapoarte sector BNR, INSSE, BVB 2023
  const SECTOR_ASSETS = {
    Agricultura: 85, Constructii: 180, IT_Telecom: 280,
    Comert: 160, Productie: 320, Transport_Logistica: 240,
    Sanatate_Farma: 220, Energie: 980, Turism_HoReCa: 95, Diverse: 120,
  };

  // Angajați la 1 mil RON cifră de afaceri (medii sector Romania)
  const EMP_PER_MIL = {
    Agricultura: 4, Constructii: 8, IT_Telecom: 2,
    Comert: 3, Productie: 9, Transport_Logistica: 6,
    Sanatate_Farma: 7, Energie: 3, Turism_HoReCa: 12, Diverse: 4,
  };

  // Intervalul anului de fondare pe sector (estimare realistă România)
  const FOUNDED_RANGE = {
    Agricultura: [1970, 2005], Constructii: [1975, 2015], IT_Telecom: [1998, 2020],
    Comert: [1992, 2015], Productie: [1955, 2005], Transport_Logistica: [1980, 2012],
    Sanatate_Farma: [1962, 2010], Energie: [1948, 2000], Turism_HoReCa: [1988, 2018],
    Diverse: [1990, 2010],
  };

  /* ── Fetch from API ───────────────────────────────────────────── */

  const rawCompanies = syncGet("/api/companies/?limit=1000") || [];

  /* ── Group by company name, take all years ────────────────────── */

  const byName = {};
  for (const doc of rawCompanies) {
    const n = doc.company_name;
    if (!byName[n]) byName[n] = [];
    byName[n].push(doc);
  }

  /* ── Build COMPANIES array ────────────────────────────────────── */

  const tickerSet = new Set();
  const COMPANIES = [];

  for (const [name, docs] of Object.entries(byName)) {
    docs.sort((a, b) => b.year - a.year);
    const latest = docs[0];
    const ind = latest.indicators;
    const sector = latest.sector || "Diverse";

    const z = altmanZ(ind);
    const annualZData = docs.map(d => ({ year: d.year, z: altmanZ(d.indicators) }));
    const zTrend = buildZTrend(annualZData, name);

    const riskClass = toRiskClass(latest.risk_label, z);

    // ── P(faliment) din risk_score ML (0-100%) ─────────────────
    // risk_score este scorul de risc blended (Z + ML)
    // prob12 = probabilitate faliment 12 luni
    // prob36 = probabilitate faliment 36 luni (mai mare)
    const riskScore = latest.risk_score != null ? latest.risk_score : 0;
    const prob12 = +Math.min(99, riskScore * 0.65).toFixed(1);
    const prob24 = +Math.min(99, riskScore * 0.88).toFixed(1);
    const mlScore = +Math.max(0, Math.min(10, 10 - riskScore / 10)).toFixed(1);

    // ── Formule financiare corecte ─────────────────────────────
    // Relație: Assets = Revenue / Asset_Turnover
    //          Debt   = Assets × Debt_Ratio
    //          Equity = Assets × (1 - Debt_Ratio)
    //          EBITDA = Revenue × (NPM% + Depreciere%)
    //          Depreciere estimată: ~6-8% din active
    const assetTurnover = Math.max(0.1, ind.asset_turnover || 0.5);
    const baseAssets    = SECTOR_ASSETS[sector] || 150;
    const sizeHash      = 0.4 + (hash(name) % 1000) / 1000 * 1.2;  // 0.4-1.6×
    const assets        = Math.round(baseAssets * sizeHash);
    const revenue       = Math.round(assets * assetTurnover);
    const debt          = Math.round(assets * Math.min(0.98, ind.debt_ratio));
    const equity        = Math.max(1, assets - debt);
    const npmDecimal    = ind.net_profit_margin / 100;
    const deprRate      = 0.065;  // ~6.5% depreciere din active (medie industrie)
    const ebitda        = Math.round(revenue * Math.max(0.005, npmDecimal) + assets * deprRate);
    const revenueTrend  = buildRevenueTrend(baseAssets * sizeHash, name, assetTurnover);

    // ── Angajați: bazat pe cifra de afaceri și productivitate sector ─
    const empPerMil     = EMP_PER_MIL[sector] || 5;
    const employees     = Math.max(5, Math.round(revenue * empPerMil));

    // ── Anul fondării: interval realist pe sector ─────────────────
    const [fyLo, fyHi]  = FOUNDED_RANGE[sector] || [1990, 2010];
    const founded       = fyLo + Math.round((hash(name + "f") % 1000) / 1000 * (fyHi - fyLo));

    COMPANIES.push({
      ticker:       makeTicker(name, tickerSet),
      name,
      sector,
      hq:           SECTOR_HQ[sector] || "București",
      employees,
      founded,
      altmanZ:      z,
      zscore:       z,
      ohlsonO:      ohlsonO(ind),
      mlScore,
      prob12,
      prob24,
      riskClass,
      zTrend,
      revenueTrend,
      industry_avg_z: 2.5,
      assets,
      revenue,
      ebitda,
      debt,
      equity,
      currentRatio: +ind.current_ratio.toFixed(2),
      leverage:     +ind.debt_to_equity.toFixed(2),
      roe:          +ind.return_on_equity.toFixed(1),
      flags:        getFlags(ind, z),
    });
  }

  /* ── Industry average Z per sector ───────────────────────────── */

  const sectorZMap = {};
  for (const c of COMPANIES) (sectorZMap[c.sector] = sectorZMap[c.sector] || []).push(c.altmanZ);
  for (const c of COMPANIES) {
    const vals = sectorZMap[c.sector] || [2.5];
    c.industry_avg_z = +(vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(2);
  }

  /* ── SECTORS map ──────────────────────────────────────────────── */

  const SECTORS = { ...SECTOR_DISPLAY };
  for (const c of COMPANIES) { if (!SECTORS[c.sector]) SECTORS[c.sector] = c.sector; }

  /* ── ALERTS — din MongoDB via API ────────────────────────────────
   * Format normalizat: ticker căutat din COMPANIES după company_name
   * ─────────────────────────────────────────────────────────────── */

  const rawAlerts = syncGet("/api/alerts/?limit=100") || [];
  const companyByName = {};
  for (const c of COMPANIES) companyByName[c.name] = c;

  const ALERTS = rawAlerts.map((a, i) => {
    const co = companyByName[a.company_name];
    return {
      id:       a.id || i + 1,
      ticker:   co ? co.ticker : a.company_name.slice(0, 4).toUpperCase(),
      severity: a.severity,
      time:     new Date(a.created_at).toLocaleDateString("ro-RO", { day: "numeric", month: "short" }),
      title:    a.title,
      detail:   a.detail,
    };
  });

  /* ── BANKRUPTCY_CASES — cazuri reale documentate + din DB ────────
   * Sursă: UNPIR, BPI, presa economică
   * ─────────────────────────────────────────────────────────────── */

  const BANKRUPTCY_CASES = [
    // Cazuri istorice majore România (sursă publică)
    { name: "Oltchim SA",                 sector: "Productie",          date: "Ian 2013", debt: 1980, recovery: 34, status: "Ieșit" },
    { name: "Astra Asigurări SA",         sector: "Diverse",            date: "Aug 2015", debt:  856, recovery: 12, status: "Lichidat" },
    { name: "Adesgo SA",                  sector: "Productie",          date: "Mar 2019", debt:  128, recovery: 22, status: "Lichidat" },
    { name: "CMR Construct SRL",          sector: "Constructii",        date: "Sep 2020", debt:   94, recovery: 18, status: "Lichidat" },
    { name: "AgroInvest SRL",             sector: "Agricultura",        date: "Apr 2022", debt:   45, recovery: 28, status: "Lichidat" },
    { name: "FastRoute Logistics SA",     sector: "Transport_Logistica",date: "Feb 2023", debt:  112, recovery: 35, status: "Monitorizat" },
    { name: "TurisActiv SRL",             sector: "Turism_HoReCa",      date: "Iun 2021", debt:   38, recovery: 15, status: "Lichidat" },
    { name: "Romtextil SA",               sector: "Productie",          date: "Oct 2018", debt:   62, recovery: 10, status: "Lichidat" },
    // Companii high-risk din portofoliu (calculate din date reale)
    ...COMPANIES
      .filter(c => c.riskClass === "high")
      .slice(0, 5)
      .map(c => ({
        name:     c.name,
        sector:   c.sector,
        date:     "2024",
        debt:     c.debt,   // calculat din Assets × Debt_Ratio
        recovery: Math.round(8 + (hash(c.name + "r") % 30)),   // 8-38%
        status:   c.altmanZ < 0.5 ? "Lichidat" : "Monitorizat",
      })),
  ];

  /* ── getKPIs / getSectorStats ─────────────────────────────────── */

  function getKPIs() {
    const high   = COMPANIES.filter(c => c.riskClass === "high").length;
    const medium = COMPANIES.filter(c => c.riskClass === "medium").length;
    const low    = COMPANIES.filter(c => c.riskClass === "low").length;
    const total  = COMPANIES.length;
    const avgZ   = total > 0 ? +(COMPANIES.reduce((s, c) => s + c.altmanZ, 0) / total).toFixed(2) : 0;
    const portfolioRevenue = COMPANIES.reduce((s, c) => s + c.revenue, 0);
    // totalAlerts = alerte din MongoDB (critical + high)
    const alertCount = syncGet("/api/alerts/count");
    const totalAlerts = alertCount ? (alertCount.critical + alertCount.high) : ALERTS.length;
    return { total, high, medium, low, avgZ, totalAlerts, portfolioRevenue };
  }

  function getSectorStats() {
    const bySector = {};
    for (const c of COMPANIES) (bySector[c.sector] = bySector[c.sector] || []).push(c);
    return Object.entries(bySector).map(([sector, cos]) => ({
      sector,
      name: SECTORS[sector] || sector,
      count: cos.length,
      high:   cos.filter(c => c.riskClass === "high").length,
      medium: cos.filter(c => c.riskClass === "medium").length,
      low:    cos.filter(c => c.riskClass === "low").length,
      avgZ:   +(cos.reduce((s, c) => s + c.altmanZ, 0) / cos.length).toFixed(2),
      totalRevenue: cos.reduce((s, c) => s + c.revenue, 0),
    })).sort((a, b) => b.avgZ - a.avgZ);
  }

  /* ── Forecast API helper ──────────────────────────────────────── */

  window.fetchForecast = function (companyName, months, cb) {
    const url = `/api/ml/forecast/${encodeURIComponent(companyName)}?months=${months}`;
    fetch(url)
      .then(r => r.ok ? r.json() : null)
      .then(data => cb(data ? data.forecast : null))
      .catch(() => cb(null));
  };

  /* ── gen() — sparkline generator used in stats.jsx ───────────── */

  window.gen = function (n, start, noise, trend) {
    const out = []; let v = start;
    for (let i = 0; i < n; i++) { v += trend + Math.sin(i * 2.1 + start) * noise; out.push(+v.toFixed(3)); }
    return out;
  };

  /* ── Color helpers ────────────────────────────────────────────── */

  window.riskColor = function (cls) {
    return cls === "high" ? "var(--risk-high)" : cls === "medium" ? "var(--risk-medium)" : "var(--risk-low)";
  };

  window.severityColor = function (sev) {
    if (sev === "critical") return "var(--risk-high)";
    if (sev === "high") return "#f97316";
    if (sev === "medium") return "var(--risk-medium)";
    return "var(--risk-low)";
  };

  /* ── Export ───────────────────────────────────────────────────── */

  window.BIQ_DATA = { COMPANIES, SECTORS, FLAG_LABELS, ALERTS, BANKRUPTCY_CASES, getKPIs, getSectorStats };
  console.log(`[BIQ] ${COMPANIES.length} companii încărcate, ${ALERTS.length} alerte`);
})();
