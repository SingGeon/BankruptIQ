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

  /* ── Revenue trend (60 months, mil RON) ──────────────────────── */

  function buildRevenueTrend(base, name) {
    const out = [];
    let v = base * (0.6 + sr(name, 99) * 0.25);
    for (let i = 0; i < 60; i++) {
      const g = 1 + 0.022 + Math.sin(i * 0.38 + sr(name, i) * Math.PI) * 0.014;
      const noise = 1 + (sr(name, i + 200) - 0.5) * 0.05;
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

  // Base annual revenue by sector (mil RON) used for revenue synthesis
  const BASE_REV = {
    Agricultura: 70, Constructii: 150, IT_Telecom: 390,
    Comert: 620, Productie: 210, Transport_Logistica: 180,
    Sanatate_Farma: 160, Energie: 520, Turism_HoReCa: 90, Diverse: 60,
  };

  /* ── Fetch from API ───────────────────────────────────────────── */

  const rawCompanies = syncGet("/api/companies?limit=500") || [];

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

    let prob12;
    if (latest.risk_score != null) {
      prob12 = +(latest.risk_score * 0.6).toFixed(1);
    } else {
      prob12 = riskClass === "high"
        ? +(28 + sr(name) * 38).toFixed(1)
        : riskClass === "medium"
        ? +(7 + sr(name) * 22).toFixed(1)
        : +(sr(name) * 7).toFixed(1);
    }
    const prob24 = +Math.min(99, prob12 * 1.45).toFixed(1);
    const mlScore = +Math.max(0, Math.min(10, 10 - prob12 / 10)).toFixed(1);

    const baseRev = (BASE_REV[sector] || 80) * (0.4 + sr(name, 1) * 1.2);
    const revenueTrend = buildRevenueTrend(baseRev, name);
    const revenue = Math.round(revenueTrend[59]);
    const npmDecimal = ind.net_profit_margin / 100;
    const ebitda = Math.round(revenue * Math.max(0.005, npmDecimal + 0.075));
    const debt = Math.round(revenue * ind.debt_ratio * (1.4 + sr(name, 3)));
    const equity = Math.max(1, Math.round(debt * (1 - Math.min(0.98, ind.debt_ratio)) / Math.max(0.05, ind.debt_ratio)));

    COMPANIES.push({
      ticker: makeTicker(name, tickerSet),
      name,
      sector,
      hq: SECTOR_HQ[sector] || "București",
      employees: Math.round(25 + sr(name, 2) * 2800),
      founded: 1968 + Math.round(sr(name, 3) * 48),
      altmanZ: z,
      zscore: z,
      ohlsonO: ohlsonO(ind),
      mlScore,
      prob12,
      prob24,
      riskClass,
      zTrend,
      revenueTrend,
      industry_avg_z: 2.5, // updated below after all companies built
      revenue,
      ebitda,
      debt,
      equity,
      currentRatio: +ind.current_ratio.toFixed(2),
      leverage: +ind.debt_to_equity.toFixed(2),
      roe: +ind.return_on_equity.toFixed(1), // already in %
      flags: getFlags(ind, z),
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

  /* ── ALERTS ───────────────────────────────────────────────────── */

  const ALERTS = [];
  let aid = 1;

  for (const c of COMPANIES.filter(x => x.riskClass === "high").slice(0, 4)) {
    ALERTS.push({
      id: aid++, ticker: c.ticker, severity: "critical",
      time: `${Math.round(3 + sr(c.name, 7) * 55)} min în urmă`,
      title: "Alarmă critică — distress financiar",
      detail: `${c.name}: Z=${c.altmanZ.toFixed(2)}, P(faliment 12L)=${c.prob12}%, levier=${c.leverage.toFixed(2)}×.`,
    });
  }
  for (const c of COMPANIES.filter(x => x.riskClass === "high").slice(4, 8)) {
    ALERTS.push({
      id: aid++, ticker: c.ticker, severity: "high",
      time: `${Math.round(1 + sr(c.name, 8) * 4)} ore în urmă`,
      title: "Risc înalt detectat",
      detail: `${c.name}: Z=${c.altmanZ.toFixed(2)}. ${c.flags.slice(0, 2).map(f => FLAG_LABELS[f]).join("; ")}.`,
    });
  }
  for (const c of COMPANIES.filter(x => x.riskClass === "medium").slice(0, 5)) {
    ALERTS.push({
      id: aid++, ticker: c.ticker, severity: "medium",
      time: `${Math.round(2 + sr(c.name, 9) * 20)} ore în urmă`,
      title: "Monitorizare activă",
      detail: `${c.name}: Z în zona gri (${c.altmanZ.toFixed(2)}), monitorizare trimestrială recomandată.`,
    });
  }

  /* ── BANKRUPTCY_CASES ─────────────────────────────────────────── */

  const MONTHS_RO = ["Ian", "Feb", "Mar", "Apr", "Mai", "Iun", "Iul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const STATUSES = ["Lichidat", "Monitorizat", "Ieșit", "Activ"];

  const BANKRUPTCY_CASES = [
    { name: "Hidroelectrica SA", sector: "Energie", date: "Ian 2012", debt: 3200, recovery: 82, status: "Ieșit" },
    { name: "Astra Asigurări SA", sector: "Diverse", date: "Aug 2015", debt: 856, recovery: 12, status: "Lichidat" },
    { name: "Oltchim SA", sector: "Productie", date: "Ian 2013", debt: 1980, recovery: 34, status: "Ieșit" },
    { name: "Adesgo SA", sector: "Productie", date: "Mar 2019", debt: 128, recovery: 22, status: "Lichidat" },
    { name: "CMR Construct SRL", sector: "Constructii", date: "Sep 2020", debt: 94, recovery: 18, status: "Lichidat" },
    { name: "AgroInvest SRL", sector: "Agricultura", date: "Apr 2022", debt: 45, recovery: 28, status: "Lichidat" },
    { name: "FastRoute Logistics SA", sector: "Transport_Logistica", date: "Feb 2023", debt: 112, recovery: 35, status: "Monitorizat" },
    { name: "TurisActiv SRL", sector: "Turism_HoReCa", date: "Iun 2021", debt: 38, recovery: 15, status: "Lichidat" },
    ...COMPANIES.filter(c => c.riskClass === "high").slice(0, 4).map(c => ({
      name: c.name,
      sector: c.sector,
      date: `${MONTHS_RO[Math.round(sr(c.name) * 11)]} 2024`,
      debt: Math.round(c.debt * (0.3 + sr(c.name, 5) * 0.5)),
      recovery: Math.round(5 + sr(c.name, 6) * 32),
      status: STATUSES[Math.round(sr(c.name, 4) * 2)],
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
    return { total, high, medium, low, avgZ, totalAlerts: ALERTS.length, portfolioRevenue };
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
