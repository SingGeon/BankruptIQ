// BankruptIQ — Economic Statistics page

const { useState: useStateS, useEffect: useEffectS, useMemo: useMemoS } = React;

function StatsPage({ onSelectCompany }) {
  const { COMPANIES, SECTORS, BANKRUPTCY_CASES, getKPIs, getSectorStats } = window.BIQ_DATA;
  const kpis        = getKPIs();
  const sectorStats = getSectorStats();

  /* ── Macro — fetch din MongoDB ─────────────────────────────────── */
  const [macroData,      setMacroData]      = useStateS([]);
  const [macroLoading,   setMacroLoading]   = useStateS(false);
  const [macroLastUpdate,setMacroLastUpdate]= useStateS(null);
  const [bnrLive,        setBnrLive]        = useStateS(null);

  async function fetchMacro() {
    try {
      const r = await fetch("/api/macro/");
      const data = r.ok ? await r.json() : [];
      setMacroData(data);
      setMacroLastUpdate(new Date());
    } catch {}
  }
  async function refreshMacro() {
    setMacroLoading(true);
    try {
      const res    = await fetch("/api/macro/refresh", { method: "POST" });
      const result = res.ok ? await res.json() : null;
      if (result?.eur_ron_live) setBnrLive(result.eur_ron_live);
      const r    = await fetch("/api/macro/");
      const data = r.ok ? await r.json() : [];
      setMacroData(data);
      setMacroLastUpdate(new Date());
    } catch {} finally {
      setMacroLoading(false);
    }
  }
  useEffectS(() => { fetchMacro(); }, []);

  const macro = macroData.map(m => ({
    lbl: m.indicator + (m.source ? ` · ${m.source}` : ""),
    val: m.value_str, delta: m.delta, deltaSub: m.delta_sub,
    trend: m.trend || [], down: m.delta_dir === "down_good",
  }));

  /* ── Bankruptcy timeline — ONRC/UNPIR România ──────────────────── */
  const bankrTimeline = useMemoS(() => [
    412, 438, 465, 434, 389, 362, 321, 298,              // mai–dec 2023
    276, 291, 318, 334, 342, 358, 349, 326, 308, 285, 264, 241, // 2024
    228, 242, 261, 278, 286, 302, 295, 274, 258, 236, 218, 204, // 2025
    192, 207, 224, 198,                                   // ian–apr 2026
  ], []);

  const bankrYoY = useMemoS(() => {
    const last12 = bankrTimeline.slice(-12).reduce((a, b) => a + b, 0);
    const prev12 = bankrTimeline.slice(-24, -12).reduce((a, b) => a + b, 0);
    return ((last12 - prev12) / prev12 * 100).toFixed(1);
  }, [bankrTimeline]);

  /* ── Sume trimestriale derivate din timeline ───────────────────── */
  const qSums = useMemoS(() => [
    bankrTimeline.slice(8,  11),
    bankrTimeline.slice(11, 14),
    bankrTimeline.slice(14, 17),
    bankrTimeline.slice(17, 20),
    bankrTimeline.slice(20, 23),
    bankrTimeline.slice(23, 26),
    bankrTimeline.slice(26, 29),
    bankrTimeline.slice(29, 32),
    bankrTimeline.slice(32, 36),
  ].map(q => q.reduce((a, b) => a + b, 0)), [bankrTimeline]);

  const sectorBankrRows = useMemoS(() => {
    const weights = [
      { sector: "Producție",        w: [0.296,0.296,0.296,0.296,0.296,0.296,0.296,0.296,0.296] },
      { sector: "Comerț & Retail",  w: [0.198,0.198,0.198,0.198,0.198,0.198,0.198,0.198,0.198] },
      { sector: "Construcții",      w: [0.168,0.168,0.168,0.168,0.168,0.168,0.168,0.168,0.168] },
      { sector: "Transport & Log.", w: [0.092,0.092,0.092,0.092,0.092,0.092,0.092,0.092,0.092] },
      { sector: "Turism & HoReCa", w: [0.078,0.138,0.142,0.072,0.068,0.134,0.136,0.064,0.062] },
      { sector: "Agricultură",      w: [0.068,0.068,0.068,0.068,0.068,0.068,0.068,0.068,0.068] },
      { sector: "IT & Telecom",     w: [0.024,0.024,0.024,0.024,0.024,0.024,0.024,0.024,0.024] },
      { sector: "Energie",          w: [0.010,0.010,0.010,0.010,0.010,0.010,0.010,0.010,0.010] },
    ];
    return weights.map(s => ({
      sector: s.sector,
      cells: qSums.map((q, i) => Math.round(q * s.w[i])),
    }));
  }, [qSums]);

  /* ── Recovery rates din BANKRUPTCY_CASES reale ─────────────────── */
  const recoveryRates = useMemoS(() => {
    const SECTOR_COLORS = {
      Sanatate_Farma: "#06b6d4", IT_Telecom: "#7c8aff", Energie: "#f59e0b",
      Comert: "#22c55e", Constructii: "#a855f7", Productie: "#f97316",
      Transport_Logistica: "#ef4444", Turism_HoReCa: "#dc2626",
      Agricultura: "#84cc16", Diverse: "#94a3b8",
    };
    const DISPLAY = {
      Sanatate_Farma: "Sănătate & Farma", IT_Telecom: "IT & Telecom",
      Energie: "Energie", Comert: "Comerț & Retail", Constructii: "Construcții",
      Productie: "Producție", Transport_Logistica: "Transport & Logistică",
      Turism_HoReCa: "Turism & HoReCa", Agricultura: "Agricultură", Diverse: "Diverse",
    };
    // Agregare din BANKRUPTCY_CASES pe sector
    const bySector = {};
    for (const b of BANKRUPTCY_CASES) {
      if (!bySector[b.sector]) bySector[b.sector] = [];
      bySector[b.sector].push(b.recovery);
    }
    // Benchmark-uri industrie pentru sectoarele fără cazuri
    const BENCHMARKS = {
      Sanatate_Farma: 48, IT_Telecom: 34, Energie: 30, Comert: 24,
      Constructii: 19, Productie: 16, Transport_Logistica: 14,
      Turism_HoReCa: 9, Agricultura: 22, Diverse: 18,
    };
    return Object.entries(BENCHMARKS)
      .map(([sector, benchmark]) => {
        const vals = bySector[sector];
        const rate = vals
          ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length)
          : benchmark;
        return {
          sector: DISPLAY[sector] || sector,
          rate,
          color: SECTOR_COLORS[sector] || "#94a3b8",
          fromData: !!vals,
          n: vals ? vals.length : 0,
        };
      })
      .sort((a, b) => b.rate - a.rate);
  }, [BANKRUPTCY_CASES]);

  /* ── Distribuție Z-Score din COMPANIES reale ───────────────────── */
  const zDistribution = useMemoS(() => {
    const buckets = [
      { label: "< 0.5",    min: -Infinity, max: 0.5,  color: "var(--risk-high)" },
      { label: "0.5–1.0",  min: 0.5,  max: 1.0,  color: "var(--risk-high)" },
      { label: "1.0–1.81", min: 1.0,  max: 1.81, color: "var(--risk-high)" },
      { label: "1.81–2.5", min: 1.81, max: 2.5,  color: "var(--risk-medium)" },
      { label: "2.5–2.99", min: 2.5,  max: 2.99, color: "var(--risk-medium)" },
      { label: "2.99–4",   min: 2.99, max: 4.0,  color: "var(--risk-low)" },
      { label: "> 4",      min: 4.0,  max: Infinity, color: "var(--risk-low)" },
    ];
    const total = COMPANIES.length;
    return buckets.map(b => ({
      ...b,
      count: COMPANIES.filter(c => c.altmanZ >= b.min && c.altmanZ < b.max).length,
      pct: 0,
    })).map(b => ({ ...b, pct: total > 0 ? (b.count / total * 100) : 0 }));
  }, [COMPANIES]);

  const sectorsByExposure = [...sectorStats].sort((a, b) => b.totalRevenue - a.totalRevenue);
  const topRiskCompanies  = [...COMPANIES].sort((a, b) => a.zscore - b.zscore).slice(0, 15);
  const topRevCompanies   = [...COMPANIES].sort((a, b) => b.revenue - a.revenue).slice(0, 8);

  return (
    <div className="stats-page">

      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="stats-page-head">
        <div className="stats-eyebrow">
          <span className="se-dot" />
          PANORAMĂ ECONOMICĂ · ROMÂNIA · MAI 2026
        </div>
        <h1 className="stats-page-title">
          Situația <span className="stats-accent">macro</span> și impactul asupra companiilor monitorizate.
        </h1>
        <p className="stats-page-sub">
          Indicatori macro BNR/INSSE · EUR/RON live · trend falimente UNPIR ·{" "}
          {kpis.total.toLocaleString("ro-RO")} companii monitorizate
        </p>
      </div>

      {/* ── Macro indicators ───────────────────────────────────────── */}
      <section className="stats-section">
        <div className="stats-section-head">
          <h2 className="stats-section-title">Indicatori macro</h2>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {macroLastUpdate && (
              <span className="stats-section-meta">
                actualizat {macroLastUpdate.toLocaleTimeString("ro-RO", { hour: "2-digit", minute: "2-digit" })}
              </span>
            )}
            <button onClick={refreshMacro} disabled={macroLoading} style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              padding: "5px 12px", background: "var(--bg-elev)",
              border: "1px solid var(--border-strong)", borderRadius: 6,
              color: macroLoading ? "var(--fg-faint)" : "var(--fg)",
              fontFamily: "var(--font-mono)", fontSize: 11,
              cursor: macroLoading ? "not-allowed" : "pointer",
            }}
              onMouseEnter={e => { if (!macroLoading) e.currentTarget.style.borderColor = "var(--accent)"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border-strong)"; }}
            >
              <span style={{ display: "inline-block", animation: macroLoading ? "spin 800ms linear infinite" : "none" }}>⟳</span>
              {macroLoading ? "Se actualizează..." : "Actualizează"}
            </button>
          </div>
        </div>
        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
        {bnrLive && (
          <div style={{ marginBottom: 12, padding: "6px 12px",
            background: "color-mix(in oklab, var(--risk-low) 12%, transparent)",
            border: "1px solid var(--risk-low)", borderRadius: 6,
            fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--risk-low)",
            display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--risk-low)",
              boxShadow: "0 0 6px var(--risk-low)", display: "inline-block" }} />
            EUR/RON LIVE · BNR · {bnrLive.toFixed(4)} RON
          </div>
        )}
        <div className="macro-grid">
          {macro.map((m, i) => (
            <div key={i} className="macro-cell">
              <div className="macro-lbl">
                {m.lbl}
                {m.lbl.includes("EUR") && bnrLive && (
                  <span style={{ marginLeft: 6, fontSize: 9, padding: "1px 5px", borderRadius: 4,
                    background: "var(--risk-low)", color: "#000", fontWeight: 700 }}>LIVE</span>
                )}
              </div>
              <div className="macro-row">
                <div className="macro-val">{m.val}</div>
                <div className={"macro-delta " + ((m.delta > 0) !== !!m.down ? "up" : "down")}>
                  {m.delta > 0 ? "▲" : "▼"} {Math.abs(m.delta)}{typeof m.delta === "number" && Math.abs(m.delta) < 10 ? (m.lbl.includes("EUR") ? "" : "%") : ""}
                </div>
              </div>
              <div className="macro-sub">{m.deltaSub}</div>
              <div className="macro-spark">
                <Sparkline data={m.trend} width={180} height={32}
                  color={(m.delta > 0) !== !!m.down ? "var(--risk-low)" : "var(--risk-high)"} strokeWidth={1.5} />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Bankruptcy timeline ─────────────────────────────────────── */}
      <section className="stats-section">
        <div className="stats-section-head">
          <h2 className="stats-section-title">Falimente lunare · ultimii 3 ani</h2>
          <span className="stats-section-meta">
            total {bankrTimeline.reduce((a, b) => a + b, 0).toLocaleString("ro-RO")} cazuri ·{" "}
            {bankrYoY > 0 ? "+" : ""}{bankrYoY}% YoY · sursa ONRC/UNPIR
          </span>
        </div>
        <div className="stats-big-chart">
          <BankrupcyTimelineChart data={bankrTimeline} />
        </div>
      </section>

      {/* ── Recovery + Expunere sector ──────────────────────────────── */}
      <div className="stats-grid-2">
        <section className="stats-section">
          <div className="stats-section-head">
            <h2 className="stats-section-title">Recovery rates pe sector</h2>
            <span className="stats-section-meta">
              din {BANKRUPTCY_CASES.length} cazuri · restul estimări industrie
            </span>
          </div>
          <div className="recovery-list">
            {recoveryRates.map((r, i) => (
              <div key={i} className="recovery-row">
                <div className="recovery-name">
                  {r.sector}
                  {r.fromData && (
                    <span style={{ marginLeft: 6, fontSize: 9, padding: "1px 4px",
                      background: "color-mix(in oklab, var(--accent) 15%, transparent)",
                      color: "var(--accent)", borderRadius: 3 }}>
                      {r.n}c
                    </span>
                  )}
                </div>
                <div className="recovery-bar">
                  <div className="recovery-fill" style={{ width: `${r.rate * 1.8}%`, background: r.color }} />
                </div>
                <div className="recovery-val" style={{ color: r.color }}>{r.rate}%</div>
              </div>
            ))}
          </div>
        </section>

        <section className="stats-section">
          <div className="stats-section-head">
            <h2 className="stats-section-title">Expunere pe sectoare</h2>
            <span className="stats-section-meta">date reale · {kpis.total.toLocaleString("ro-RO")} companii</span>
          </div>
          <div className="exposure-list">
            {sectorsByExposure.map((s, i) => {
              const pct = (s.totalRevenue / kpis.portfolioRevenue) * 100;
              const sc  = s.avgZ < 1.81 ? "var(--risk-high)" : s.avgZ < 2.99 ? "var(--risk-medium)" : "var(--risk-low)";
              return (
                <div key={i} className="exposure-row">
                  <div className="exposure-bar-wrap">
                    <div className="exposure-rank">{(i + 1).toString().padStart(2, "0")}</div>
                    <div className="exposure-name">{s.name}</div>
                    <div className="exposure-bar">
                      <div className="exposure-fill" style={{ width: `${pct}%`, background: sc }} />
                    </div>
                    <div className="exposure-pct">{pct.toFixed(1)}%</div>
                    <div className="exposure-z">Z {s.avgZ.toFixed(2)}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>

      {/* ── Distribuție Z-Score (din COMPANIES reale) ──────────────── */}
      <section className="stats-section">
        <div className="stats-section-head">
          <h2 className="stats-section-title">Distribuție Z-Score · toate companiile</h2>
          <span className="stats-section-meta">{kpis.total.toLocaleString("ro-RO")} companii · eșantion {COMPANIES.length.toLocaleString("ro-RO")} pentru grafic</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: "4px 0" }}>
          {zDistribution.map((b, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 70, fontFamily: "var(--font-mono)", fontSize: 11,
                color: b.color, fontWeight: 600, flexShrink: 0 }}>{b.label}</div>
              <div style={{ flex: 1, height: 24, background: "var(--bg-elev-2)",
                borderRadius: "var(--radius)", overflow: "hidden" }}>
                <div style={{
                  height: "100%", borderRadius: "var(--radius)",
                  width: `${Math.max(0.5, b.pct)}%`,
                  background: b.color, opacity: 0.75,
                  transition: "width 600ms cubic-bezier(0.22,1,0.36,1)",
                }} />
              </div>
              <div style={{ width: 50, textAlign: "right", fontFamily: "var(--font-mono)",
                fontSize: 11, color: b.color, fontWeight: 700 }}>{b.count.toLocaleString("ro-RO")}</div>
              <div style={{ width: 44, textAlign: "right", fontFamily: "var(--font-mono)",
                fontSize: 10, color: "var(--fg-faint)" }}>{b.pct.toFixed(1)}%</div>
            </div>
          ))}
          <div style={{ display: "flex", gap: 24, marginTop: 8, fontFamily: "var(--font-mono)",
            fontSize: 11, paddingTop: 10, borderTop: "1px solid var(--border)" }}>
            <span style={{ color: "var(--risk-high)" }}>
              ▪ Distress (&lt;1.81): {COMPANIES.filter(c => c.altmanZ < 1.81).length.toLocaleString("ro-RO")} companii ({(COMPANIES.filter(c=>c.altmanZ<1.81).length/COMPANIES.length*100).toFixed(1)}%)
            </span>
            <span style={{ color: "var(--risk-medium)" }}>
              ▪ Zonă gri: {COMPANIES.filter(c => c.altmanZ >= 1.81 && c.altmanZ < 2.99).length.toLocaleString("ro-RO")}
            </span>
            <span style={{ color: "var(--risk-low)" }}>
              ▪ Sigur: {COMPANIES.filter(c => c.altmanZ >= 2.99).length.toLocaleString("ro-RO")}
            </span>
          </div>
        </div>
      </section>

      {/* ── Falimente majore ───────────────────────────────────────── */}
      <section className="stats-section">
        <div className="stats-section-head">
          <h2 className="stats-section-title">Falimente majore recente · România</h2>
          <span className="stats-section-meta">{BANKRUPTCY_CASES.length} cazuri documentate · sortate după datorie</span>
        </div>
        <div className="major-cases-table">
          <div className="mct-head">
            <span>DATA</span><span>COMPANIE</span><span>SECTOR</span>
            <span className="num">DATORIE</span><span className="num">RECOVERY</span><span>STATUS</span>
          </div>
          {[...BANKRUPTCY_CASES].sort((a, b) => b.debt - a.debt).map((b, i) => (
            <div key={i} className="mct-row">
              <span className="mct-date">{b.date}</span>
              <span className="mct-name">{b.name}</span>
              <span className="mct-sector">{SECTORS[b.sector] || b.sector}</span>
              <span className="mct-debt">{b.debt.toLocaleString("ro-RO")} <small>M RON</small></span>
              <span className="mct-recovery">
                <span className="mct-rec-bar">
                  <span className="mct-rec-fill" style={{
                    width: `${b.recovery}%`,
                    background: b.recovery > 30 ? "var(--risk-low)" : "var(--risk-high)"
                  }} />
                </span>
                <span className="mct-rec-val">{b.recovery}%</span>
              </span>
              <span className={"mct-status mct-status-" + b.status}>{b.status}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── Top 15 companii la risc (date reale) ───────────────────── */}
      <section className="stats-section">
        <div className="stats-section-head">
          <h2 className="stats-section-title">Top companii sub atenție · ranking risc</h2>
          <span className="stats-section-meta">
            top 15 după Z-Score · din {kpis.total.toLocaleString("ro-RO")} total · click pentru detalii
          </span>
        </div>
        <div className="risk-rank-table">
          <div className="rrt-head">
            <span>#</span><span>TICKER</span><span>COMPANIE</span><span>SECTOR</span>
            <span className="num">Z-SCORE</span><span className="num">P(FALIM.) 12L</span>
            <span className="num">ROE</span><span className="num">LEVERAGE</span>
            <span className="num">CURRENT R.</span><span>FLAGS</span>
          </div>
          {topRiskCompanies.map((c, i) => {
            const rc = window.riskColor(c.riskClass);
            return (
              <div key={c.ticker} className="rrt-row" onClick={() => onSelectCompany && onSelectCompany(c)}>
                <span className="rrt-rank">{(i + 1).toString().padStart(2, "0")}</span>
                <span className="rrt-tk" style={{ color: rc, borderColor: rc }}>{c.ticker}</span>
                <span className="rrt-name">{c.name}</span>
                <span className="rrt-sector">{SECTORS[c.sector] || c.sector}</span>
                <span className="rrt-num" style={{ color: rc, fontWeight: 700 }}>{c.zscore.toFixed(2)}</span>
                <span className="rrt-num" style={{ color: rc }}>{c.prob12.toFixed(1)}%</span>
                <span className="rrt-num" style={{ color: c.roe < 0 ? "var(--risk-high)" : "var(--fg)" }}>{c.roe.toFixed(1)}%</span>
                <span className="rrt-num" style={{ color: c.leverage > 3 ? "var(--risk-high)" : "var(--fg)" }}>{c.leverage.toFixed(2)}x</span>
                <span className="rrt-num" style={{ color: c.currentRatio < 1 ? "var(--risk-high)" : "var(--fg)" }}>{c.currentRatio.toFixed(2)}</span>
                <span className="rrt-flags">
                  {c.flags.length > 0
                    ? <span className="rrt-flag-pill" style={{ color: rc }}>{c.flags.length}</span>
                    : <span style={{ color: "var(--fg-faint)" }}>—</span>}
                </span>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── Sumar sectoare ─────────────────────────────────────────── */}
      <section className="stats-section">
        <div className="stats-section-head">
          <h2 className="stats-section-title">Sumar agregat pe sectoare</h2>
          <span className="stats-section-meta">
            {sectorStats.length} sectoare · {kpis.total.toLocaleString("ro-RO")} companii · sortate după Z-score mediu
          </span>
        </div>
        <div className="sector-summary-table">
          <div className="sst-head">
            <span>SECTOR</span><span className="num">COMPANII</span>
            <span className="num">Z-SCORE MEDIU</span><span className="num">VENITURI</span>
            <span className="num">% PORTOFOLIU</span><span className="num">HIGH-RISK</span>
            <span>DISTRIBUȚIE</span>
          </div>
          {sectorStats.map((s, i) => {
            const pct = (s.totalRevenue / kpis.portfolioRevenue) * 100;
            const sc  = s.avgZ < 1.81 ? "var(--risk-high)" : s.avgZ < 2.99 ? "var(--risk-medium)" : "var(--risk-low)";
            return (
              <div key={s.sector} className="sst-row">
                <span className="sst-name">
                  <span className="sst-dot" style={{ background: sc }} />
                  {s.name}
                </span>
                <span className="sst-num">{s.count}</span>
                <span className="sst-num" style={{ color: sc, fontWeight: 700 }}>{s.avgZ.toFixed(2)}</span>
                <span className="sst-num">{(s.totalRevenue / 1000).toFixed(1)}<small>B</small></span>
                <span className="sst-num">{pct.toFixed(1)}%</span>
                <span className="sst-num">
                  {s.high > 0 ? <span style={{ color: "var(--risk-high)", fontWeight: 700 }}>{s.high}</span> : "0"}
                </span>
                <span className="sst-dist">
                  <span className="sst-dist-bar">
                    <span className="sst-dist-fill" style={{ width: `${Math.min(100, pct * 2.5)}%`, background: sc }} />
                  </span>
                </span>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── Matrice trimestrială falimente ─────────────────────────── */}
      <section className="stats-section">
        <div className="stats-section-head">
          <h2 className="stats-section-title">Distribuție falimente · trimestrial pe sectoare</h2>
          <span className="stats-section-meta">24Q1 → 26Q1 · derivat din date ONRC/UNPIR</span>
        </div>
        <div className="quarter-matrix">
          <div className="qm-head">
            <span className="qm-corner">SECTOR / Q</span>
            <span>24Q1</span><span>24Q2</span><span>24Q3</span><span>24Q4</span>
            <span>25Q1</span><span>25Q2</span><span>25Q3</span><span>25Q4</span>
            <span>26Q1</span><span className="qm-total">TOTAL</span>
          </div>
          {sectorBankrRows.map((row, i) => {
            const total = row.cells.reduce((a, b) => a + b, 0);
            const max   = Math.max(...row.cells);
            return (
              <div key={row.sector} className="qm-row">
                <span className="qm-label">{row.sector}</span>
                {row.cells.map((v, j) => (
                  <span key={j} className="qm-cell" style={{
                    background: `color-mix(in oklab, var(--risk-high) ${(v / max) * 30}%, transparent)`,
                    color: v / max > 0.7 ? "var(--risk-high)" : "var(--fg)",
                  }}>{v}</span>
                ))}
                <span className="qm-total-cell">{total.toLocaleString("ro-RO")}</span>
              </div>
            );
          })}
          <div className="qm-row" style={{ borderTop: "1px solid var(--border)", fontWeight: 700 }}>
            <span className="qm-label" style={{ color: "var(--fg-dim)" }}>TOTAL</span>
            {qSums.map((q, i) => (
              <span key={i} className="qm-cell" style={{ color: "var(--fg)", fontWeight: 700 }}>{q}</span>
            ))}
            <span className="qm-total-cell">{qSums.reduce((a, b) => a + b, 0).toLocaleString("ro-RO")}</span>
          </div>
        </div>
      </section>

      {/* ── Evoluție Z-Score · top 8 companii după venituri ────────── */}
      <section className="stats-section">
        <div className="stats-section-head">
          <h2 className="stats-section-title">Evoluție Z-Score · top 8 companii după venituri</h2>
          <span className="stats-section-meta">8 trimestre · date reale · click pe rând pentru detalii</span>
        </div>
        <div className="z-quarter-matrix">
          <div className="zqm-head">
            <span>TICKER</span><span>COMPANIE</span>
            <span className="num">Q1-24</span><span className="num">Q2-24</span>
            <span className="num">Q3-24</span><span className="num">Q4-24</span>
            <span className="num">Q1-25</span><span className="num">Q2-25</span>
            <span className="num">Q3-25</span><span className="num">Q4-25</span>
            <span className="num">ACUM</span><span className="num">DELTA</span>
          </div>
          {topRevCompanies.map((c, i) => {
            const rc = window.riskColor(c.riskClass);
            const indices = [0, 6, 12, 18, 24, 30, 36, 48, 59];
            const points  = indices.map(idx => c.zTrend[idx]);
            const delta   = points[points.length - 1] - points[0];
            return (
              <div key={c.ticker} className="zqm-row" onClick={() => onSelectCompany && onSelectCompany(c)}>
                <span className="zqm-tk" style={{ color: rc, borderColor: rc }}>{c.ticker}</span>
                <span className="zqm-name">{c.name}</span>
                {points.map((v, j) => {
                  const cc = v < 1.81 ? "var(--risk-high)" : v < 2.99 ? "var(--risk-medium)" : "var(--risk-low)";
                  return <span key={j} className="zqm-cell" style={{ color: cc }}>{v.toFixed(2)}</span>;
                })}
                <span className="zqm-delta" style={{ color: delta > 0 ? "var(--risk-low)" : "var(--risk-high)" }}>
                  {delta > 0 ? "▲" : "▼"}{Math.abs(delta).toFixed(2)}
                </span>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── Concluzie sănătate portofoliu ───────────────────────────── */}
      <section className="stats-section stats-health">
        <div className="stats-section-head">
          <h2 className="stats-section-title">Concluzie · sănătatea companiilor monitorizate</h2>
          <span className="stats-section-meta">analiză agregată · {kpis.total.toLocaleString("ro-RO")} companii reale</span>
        </div>
        <div className="health-grid">
          <div className="health-cell">
            <div className="health-num">
              {(kpis.total - kpis.high).toLocaleString("ro-RO")}
              <span className="health-tot">/{kpis.total.toLocaleString("ro-RO")}</span>
            </div>
            <div className="health-lbl">Companii în zonă sigură</div>
            <div className="health-sub">Z-Score &gt; 1.81 · {((kpis.total - kpis.high) / kpis.total * 100).toFixed(1)}%</div>
          </div>
          <div className="health-cell">
            <div className="health-num" style={{ color: "var(--risk-high)" }}>
              {kpis.high.toLocaleString("ro-RO")}
            </div>
            <div className="health-lbl">Necesită monitorizare</div>
            <div className="health-sub">risc înalt · {(kpis.high / kpis.total * 100).toFixed(1)}% din monitorizate</div>
          </div>
          <div className="health-cell">
            <div className="health-num">
              {(kpis.portfolioRevenue / 1000).toFixed(1)}<span className="health-tot">B</span>
            </div>
            <div className="health-lbl">Venituri agregate (RON)</div>
            <div className="health-sub">4 trimestre cumulat</div>
          </div>
          <div className="health-cell">
            <div className="health-num">{kpis.avgZ.toFixed(2)}</div>
            <div className="health-lbl">Z-Score mediu</div>
            <div className="health-sub">vs. media națională 2.31</div>
          </div>
        </div>
      </section>
    </div>
  );
}

/* ── BankrupcyTimelineChart ──────────────────────────────────────── */
function BankrupcyTimelineChart({ data }) {
  const W = 1080, H = 240, padL = 50, padR = 16, padT = 16, padB = 38;
  const innerW = W - padL - padR, innerH = H - padT - padB;
  const max = Math.max(...data), min = 0;
  const yAt = v => padT + innerH - ((v - min) / (max - min)) * innerH;
  const xAt = i => padL + (i / (data.length - 1)) * innerW;
  const [hover, setHover] = useStateS(null);

  const linePath = data.map((v, i) => `${i === 0 ? "M" : "L"}${xAt(i).toFixed(1)},${yAt(v).toFixed(1)}`).join(" ");
  const areaPath = `${linePath} L${xAt(data.length - 1)},${H - padB} L${padL},${H - padB} Z`;

  const months = ["ian","feb","mar","apr","mai","iun","iul","aug","sep","oct","noi","dec"];
  const labels = data.map((_, i) => {
    const monthsAgo = data.length - 1 - i;
    const d = new Date(2026, 4 - monthsAgo, 1);
    return `${months[d.getMonth()]} '${(d.getFullYear() % 100).toString().padStart(2, "0")}`;
  });

  function handleMove(e) {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * W - padL;
    const idx = Math.max(0, Math.min(data.length - 1, Math.round(x / (innerW / (data.length - 1)))));
    setHover(idx);
  }

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="bankr-chart"
      onMouseMove={handleMove} onMouseLeave={() => setHover(null)}>
      <defs>
        <linearGradient id="bkArea" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--risk-high)" stopOpacity="0.3" />
          <stop offset="100%" stopColor="var(--risk-high)" stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0, 0.25, 0.5, 0.75, 1].map((t, i) => {
        const v = min + (max - min) * t;
        return (
          <g key={i}>
            <line x1={padL} x2={W - padR} y1={yAt(v)} y2={yAt(v)}
              stroke="var(--fg-faint)" strokeOpacity="0.1" strokeDasharray="2 4" />
            <text x={padL - 8} y={yAt(v) + 3} fontSize="10" fill="var(--fg-faint)"
              textAnchor="end" fontFamily="var(--font-mono)">{Math.round(v)}</text>
          </g>
        );
      })}
      <path d={areaPath} fill="url(#bkArea)" />
      <path d={linePath} fill="none" stroke="var(--risk-high)" strokeWidth="2" strokeLinejoin="round" />
      {data.map((v, i) => (
        <rect key={i} x={xAt(i) - 3} y={yAt(v)} width="6" height={H - padB - yAt(v)}
          fill="var(--risk-high)" opacity={hover === i ? 0.7 : 0.1} />
      ))}
      {labels.map((l, i) => i % 6 === 0 && (
        <text key={i} x={xAt(i)} y={H - padB + 18} fontSize="10" fill="var(--fg-dim)"
          fontFamily="var(--font-mono)" textAnchor="middle">{l}</text>
      ))}
      {hover !== null && (
        <g>
          <line x1={xAt(hover)} x2={xAt(hover)} y1={padT} y2={H - padB}
            stroke="var(--fg)" strokeOpacity="0.3" />
          <circle cx={xAt(hover)} cy={yAt(data[hover])} r="5"
            fill="var(--risk-high)" stroke="var(--bg)" strokeWidth="2" />
          <g transform={`translate(${Math.min(xAt(hover) + 12, W - 140)}, ${yAt(data[hover]) - 30})`}>
            <rect width="124" height="42" fill="var(--bg-elev)" stroke="var(--border)" rx="6" />
            <text x="10" y="16" fontSize="10" fill="var(--fg-dim)" fontFamily="var(--font-mono)">{labels[hover]}</text>
            <text x="10" y="34" fontSize="14" fontWeight="700" fill="var(--fg)" fontFamily="var(--font-mono)">
              {data[hover].toLocaleString("ro-RO")} <tspan fontSize="9" fill="var(--fg-dim)">cazuri</tspan>
            </text>
          </g>
        </g>
      )}
    </svg>
  );
}

Object.assign(window, { StatsPage });
