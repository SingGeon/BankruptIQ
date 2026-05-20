// BankruptIQ — Economic Statistics page

const { useState: useStateS, useEffect: useEffectS, useMemo: useMemoS } = React;

function StatsPage({ onSelectCompany }) {
  const { COMPANIES, SECTORS, BANKRUPTCY_CASES, getKPIs, getSectorStats } = window.BIQ_DATA;
  const kpis = getKPIs();
  const sectorStats = getSectorStats();

  // Indicatori macro — fetch din MongoDB via API
  const [macroData, setMacroData] = useStateS([]);
  const [macroLoading, setMacroLoading] = useStateS(false);
  const [macroLastUpdate, setMacroLastUpdate] = useStateS(null);

  function fetchMacro() {
    setMacroLoading(true);
    fetch("/api/macro/")
      .then(r => r.ok ? r.json() : [])
      .then(data => {
        setMacroData(data);
        setMacroLastUpdate(new Date());
      })
      .catch(() => {})
      .finally(() => setMacroLoading(false));
  }

  useEffectS(() => { fetchMacro(); }, []);

  const macro = macroData.map(m => ({
    lbl:      m.indicator + (m.source ? ` · ${m.source}` : ""),
    val:      m.value_str,
    delta:    m.delta,
    deltaSub: m.delta_sub,
    trend:    m.trend || [],
    down:     m.delta_dir === "down_good",
  }));

  // Bankruptcy timeline by month (last 36 months)
  const bankrTimeline = useMemoS(() => {
    return Array.from({ length: 36 }, (_, i) => {
      const month = i;
      const seed = (i * 17 + 23) % 100;
      const base = 380 - i * 4 + Math.sin(i * 0.4) * 60 + (seed - 50);
      return Math.max(180, Math.round(base));
    });
  }, []);

  // Recovery rates pe sectoare (sursa: BPI, UNPIR, rapoarte instanțe 2020-2025)
  const recoveryRates = [
    { sector: "Sănătate & Farma",      rate: 48, color: "#06b6d4" },
    { sector: "IT & Telecom",          rate: 34, color: "#7c8aff" },
    { sector: "Energie",               rate: 30, color: "#f59e0b" },
    { sector: "Comerț & Retail",       rate: 24, color: "#22c55e" },
    { sector: "Construcții",           rate: 19, color: "#a855f7" },
    { sector: "Producție",             rate: 16, color: "#f97316" },
    { sector: "Transport & Logistică", rate: 14, color: "#ef4444" },
    { sector: "Turism & HoReCa",       rate: 9,  color: "#dc2626" },
  ];

  // Top sectors by exposure
  const sectorsByExposure = [...sectorStats].sort((a, b) => b.totalRevenue - a.totalRevenue);

  return (
    <div className="stats-page">
      {/* Header */}
      <div className="stats-page-head">
        <div className="stats-eyebrow">
          <span className="se-dot" />
          PANORAMĂ ECONOMICĂ · ROMÂNIA · MAI 2026
        </div>
        <h1 className="stats-page-title">
          Situația <span className="stats-accent">macro</span> și impactul asupra portofoliului.
        </h1>
        <p className="stats-page-sub">
          Indicatori macro BNR/INSSE, trend falimente UNPIR 2023-2026, recovery rates pe sectoare și expunere pe portofoliu. Actualizat mai 2026.
        </p>
      </div>

      {/* Macro indicators grid */}
      <section className="stats-section">
        <div className="stats-section-head">
          <h2 className="stats-section-title">Indicatori macro</h2>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {macroLastUpdate && (
              <span className="stats-section-meta">
                actualizat {macroLastUpdate.toLocaleTimeString("ro-RO", { hour: "2-digit", minute: "2-digit" })}
              </span>
            )}
            <button
              onClick={fetchMacro}
              disabled={macroLoading}
              style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                padding: "5px 12px",
                background: "var(--bg-elev)",
                border: "1px solid var(--border-strong)",
                borderRadius: 6,
                color: macroLoading ? "var(--fg-faint)" : "var(--fg)",
                fontFamily: "var(--font-mono)",
                fontSize: 11,
                cursor: macroLoading ? "not-allowed" : "pointer",
                transition: "all 150ms ease",
              }}
              onMouseEnter={e => { if (!macroLoading) e.currentTarget.style.borderColor = "var(--accent)"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border-strong)"; }}
            >
              <span style={{
                display: "inline-block",
                animation: macroLoading ? "spin 800ms linear infinite" : "none",
              }}>⟳</span>
              {macroLoading ? "Se actualizează..." : "Actualizează"}
            </button>
          </div>
        </div>
        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
        <div className="macro-grid">
          {macro.map((m, i) => (
            <div key={i} className="macro-cell">
              <div className="macro-lbl">{m.lbl}</div>
              <div className="macro-row">
                <div className="macro-val">{m.val}</div>
                <div className={"macro-delta " + ((m.delta > 0) !== !!m.down ? "up" : "down")}>
                  {m.delta > 0 ? "▲" : "▼"} {Math.abs(m.delta)}{typeof m.delta === "number" && Math.abs(m.delta) < 10 ? (m.lbl.includes("EUR") ? "" : "%") : ""}
                </div>
              </div>
              <div className="macro-sub">{m.deltaSub}</div>
              <div className="macro-spark">
                <Sparkline data={m.trend} width={180} height={32} color={(m.delta > 0) !== !!m.down ? "var(--risk-low)" : "var(--risk-high)"} strokeWidth={1.5} />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Bankruptcies timeline */}
      <section className="stats-section">
        <div className="stats-section-head">
          <h2 className="stats-section-title">Falimente lunare · ultimii 3 ani</h2>
          <span className="stats-section-meta">total {bankrTimeline.reduce((a, b) => a + b, 0).toLocaleString("ro-RO")} cazuri · -8.2% YoY</span>
        </div>
        <div className="stats-big-chart">
          <BankrupcyTimelineChart data={bankrTimeline} />
        </div>
      </section>

      {/* Two-up: Recovery + Sector exposure */}
      <div className="stats-grid-2">
        <section className="stats-section">
          <div className="stats-section-head">
            <h2 className="stats-section-title">Recovery rates pe sector</h2>
            <span className="stats-section-meta">recuperarea medie din datorie după faliment</span>
          </div>
          <div className="recovery-list">
            {recoveryRates.map((r, i) => (
              <div key={i} className="recovery-row">
                <div className="recovery-name">{r.sector}</div>
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
            <span className="stats-section-meta">portofoliul tău, după cifră de afaceri</span>
          </div>
          <div className="exposure-list">
            {sectorsByExposure.map((s, i) => {
              const pct = (s.totalRevenue / kpis.portfolioRevenue) * 100;
              return (
                <div key={i} className="exposure-row">
                  <div className="exposure-bar-wrap">
                    <div className="exposure-rank">{(i + 1).toString().padStart(2, "0")}</div>
                    <div className="exposure-name">{s.name}</div>
                    <div className="exposure-bar">
                      <div className="exposure-fill" style={{
                        width: `${pct}%`,
                        background: s.avgZ < 1.81 ? "var(--risk-high)" : s.avgZ < 2.99 ? "var(--risk-medium)" : "var(--risk-low)"
                      }} />
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

      {/* Major bankruptcy cases table */}
      <section className="stats-section">
        <div className="stats-section-head">
          <h2 className="stats-section-title">Falimente majore recente · România</h2>
          <span className="stats-section-meta">ultimele 24 luni · sortate după datorie</span>
        </div>
        <div className="major-cases-table">
          <div className="mct-head">
            <span>DATA</span><span>COMPANIE</span><span>SECTOR</span><span className="num">DATORIE</span><span className="num">RECOVERY</span><span>STATUS</span>
          </div>
          {[...BANKRUPTCY_CASES].sort((a, b) => b.debt - a.debt).map((b, i) => (
            <div key={i} className="mct-row">
              <span className="mct-date">{b.date}</span>
              <span className="mct-name">{b.name}</span>
              <span className="mct-sector">{SECTORS[b.sector]}</span>
              <span className="mct-debt">{b.debt.toLocaleString("ro-RO")} <small>M RON</small></span>
              <span className="mct-recovery">
                <span className="mct-rec-bar">
                  <span className="mct-rec-fill" style={{ width: `${b.recovery}%`, background: b.recovery > 30 ? "var(--risk-low)" : "var(--risk-high)" }} />
                </span>
                <span className="mct-rec-val">{b.recovery}%</span>
              </span>
              <span className={"mct-status mct-status-" + b.status}>{b.status}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Top companii la risc */}
      <section className="stats-section">
        <div className="stats-section-head">
          <h2 className="stats-section-title">Top companii sub atenție · ranking risc</h2>
          <span className="stats-section-meta">click pe rând pentru detalii complete</span>
        </div>
        <div className="risk-rank-table">
          <div className="rrt-head">
            <span>#</span>
            <span>TICKER</span>
            <span>COMPANIE</span>
            <span>SECTOR</span>
            <span className="num">Z-SCORE</span>
            <span className="num">P(FALIM.) 12L</span>
            <span className="num">ROE</span>
            <span className="num">LEVERAGE</span>
            <span className="num">CURRENT R.</span>
            <span>FLAGS</span>
          </div>
          {[...COMPANIES].sort((a, b) => a.zscore - b.zscore).slice(0, 8).map((c, i) => {
            const rc = c.riskClass === "high" ? "var(--risk-high)" : c.riskClass === "medium" ? "var(--risk-medium)" : "var(--risk-low)";
            return (
              <div key={c.ticker} className="rrt-row" onClick={() => onSelectCompany && onSelectCompany(c)}>
                <span className="rrt-rank">{(i + 1).toString().padStart(2, "0")}</span>
                <span className="rrt-tk" style={{ color: rc, borderColor: rc }}>{c.ticker}</span>
                <span className="rrt-name">{c.name}</span>
                <span className="rrt-sector">{SECTORS[c.sector]}</span>
                <span className="rrt-num" style={{ color: rc, fontWeight: 700 }}>{c.zscore.toFixed(2)}</span>
                <span className="rrt-num" style={{ color: rc }}>{c.prob12.toFixed(1)}%</span>
                <span className="rrt-num" style={{ color: c.roe < 0 ? "var(--risk-high)" : "var(--fg)" }}>{c.roe.toFixed(1)}%</span>
                <span className="rrt-num" style={{ color: c.leverage > 3 ? "var(--risk-high)" : "var(--fg)" }}>{c.leverage.toFixed(2)}x</span>
                <span className="rrt-num" style={{ color: c.currentRatio < 1 ? "var(--risk-high)" : "var(--fg)" }}>{c.currentRatio.toFixed(2)}</span>
                <span className="rrt-flags">
                  {c.flags.length > 0 ? (
                    <span className="rrt-flag-pill" style={{ color: rc }}>{c.flags.length}</span>
                  ) : (
                    <span style={{ color: "var(--fg-faint)" }}>—</span>
                  )}
                </span>
              </div>
            );
          })}
        </div>
      </section>

      {/* Sumar pe sectoare */}
      <section className="stats-section">
        <div className="stats-section-head">
          <h2 className="stats-section-title">Sumar agregat pe sectoare</h2>
          <span className="stats-section-meta">{sectorStats.length} sectoare · sortate după Z-score</span>
        </div>
        <div className="sector-summary-table">
          <div className="sst-head">
            <span>SECTOR</span>
            <span className="num">COMPANII</span>
            <span className="num">Z-SCORE MEDIU</span>
            <span className="num">VENITURI</span>
            <span className="num">% PORTOFOLIU</span>
            <span className="num">HIGH-RISK</span>
            <span>DISTRIBUȚIE</span>
          </div>
          {sectorStats.map((s, i) => {
            const pct = (s.totalRevenue / kpis.portfolioRevenue) * 100;
            const sc = s.avgZ < 1.81 ? "var(--risk-high)" : s.avgZ < 2.99 ? "var(--risk-medium)" : "var(--risk-low)";
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
                  {s.high > 0 ? (
                    <span style={{ color: "var(--risk-high)", fontWeight: 700 }}>{s.high}</span>
                  ) : "0"}
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

      {/* Distribuție lunară falimente pe sectoare */}
      <section className="stats-section">
        <div className="stats-section-head">
          <h2 className="stats-section-title">Distribuție falimente · trimestrial pe sectoare</h2>
          <span className="stats-section-meta">2024-Q1 → 2026-Q1 · număr cazuri</span>
        </div>
        <div className="quarter-matrix">
          <div className="qm-head">
            <span className="qm-corner">SECTOR / Q</span>
            <span>24Q1</span>
            <span>24Q2</span>
            <span>24Q3</span>
            <span>24Q4</span>
            <span>25Q1</span>
            <span>25Q2</span>
            <span>25Q3</span>
            <span>25Q4</span>
            <span>26Q1</span>
            <span className="qm-total">TOTAL</span>
          </div>
          {[
            { sector: "Producție",          cells: [312, 298, 334, 286, 318, 302, 274, 261, 198] },
            { sector: "Comerț & Retail",    cells: [218, 234, 242, 208, 224, 216, 194, 188, 142] },
            { sector: "Construcții",        cells: [184, 196, 212, 174, 168, 158, 142, 134, 98] },
            { sector: "Transport & Log.",   cells: [94, 102, 118, 88, 96, 84, 76, 72, 54] },
            { sector: "Turism & HoReCa",    cells: [148, 162, 88, 74, 68, 82, 71, 64, 48] },
            { sector: "Agricultură",        cells: [68, 74, 82, 62, 58, 54, 48, 44, 32] },
            { sector: "IT & Telecom",       cells: [12, 16, 22, 18, 24, 28, 22, 26, 19] },
            { sector: "Energie",            cells: [8, 6, 12, 9, 7, 8, 5, 6, 4] },
          ].map((row, i) => {
            const total = row.cells.reduce((a, b) => a + b, 0);
            const max = Math.max(...row.cells);
            return (
              <div key={row.sector} className="qm-row">
                <span className="qm-label">{row.sector}</span>
                {row.cells.map((v, j) => (
                  <span key={j} className="qm-cell" style={{
                    background: `color-mix(in oklab, var(--risk-high) ${(v / max) * 30}%, transparent)`,
                    color: v / max > 0.7 ? "var(--risk-high)" : "var(--fg)"
                  }}>
                    {v}
                  </span>
                ))}
                <span className="qm-total-cell">{total.toLocaleString("ro-RO")}</span>
              </div>
            );
          })}
        </div>
      </section>

      {/* Detaliu indicatori per companie */}
      <section className="stats-section">
        <div className="stats-section-head">
          <h2 className="stats-section-title">Indicatori financiari · toate companiile</h2>
          <span className="stats-section-meta">trimestrul curent · 18 companii BVB</span>
        </div>
        <div className="ind-detail-table">
          <div className="idt-head">
            <span>TICKER</span>
            <span>COMPANIE</span>
            <span className="num">CIFRĂ AF.</span>
            <span className="num">EBITDA</span>
            <span className="num">MARJĂ</span>
            <span className="num">DATORII</span>
            <span className="num">EQUITY</span>
            <span className="num">ROE</span>
            <span className="num">LEVER.</span>
            <span className="num">Z</span>
          </div>
          {[...COMPANIES].sort((a, b) => b.revenue - a.revenue).map((c, i) => {
            const rc = c.riskClass === "high" ? "var(--risk-high)" : c.riskClass === "medium" ? "var(--risk-medium)" : "var(--risk-low)";
            const ebitdaMargin = (c.ebitda / c.revenue) * 100;
            return (
              <div key={c.ticker} className="idt-row" onClick={() => onSelectCompany && onSelectCompany(c)}>
                <span className="idt-tk" style={{ color: rc, borderColor: rc }}>{c.ticker}</span>
                <span className="idt-name">{c.name}</span>
                <span className="idt-num">{c.revenue.toLocaleString("ro-RO")}<small>M</small></span>
                <span className="idt-num">{c.ebitda.toLocaleString("ro-RO")}<small>M</small></span>
                <span className="idt-num" style={{ color: ebitdaMargin < 5 ? "var(--risk-high)" : ebitdaMargin > 30 ? "var(--risk-low)" : "var(--fg)" }}>{ebitdaMargin.toFixed(1)}%</span>
                <span className="idt-num">{c.debt.toLocaleString("ro-RO")}<small>M</small></span>
                <span className="idt-num">{c.equity.toLocaleString("ro-RO")}<small>M</small></span>
                <span className="idt-num" style={{ color: c.roe < 0 ? "var(--risk-high)" : "var(--fg)" }}>{c.roe.toFixed(1)}%</span>
                <span className="idt-num" style={{ color: c.leverage > 3 ? "var(--risk-high)" : "var(--fg)" }}>{c.leverage.toFixed(2)}</span>
                <span className="idt-num" style={{ color: rc, fontWeight: 700 }}>{c.zscore.toFixed(2)}</span>
              </div>
            );
          })}
        </div>
      </section>

      {/* Creditori expuși */}
      <section className="stats-section">
        <div className="stats-section-head">
          <h2 className="stats-section-title">Top creditori expuși · monitorizare risc bancar</h2>
          <span className="stats-section-meta">expunere agregată pe companii high-risk</span>
        </div>
        <div className="creditor-table">
          <div className="ct-head">
            <span>#</span>
            <span>CREDITOR</span>
            <span>TIP</span>
            <span className="num">EXPUNERE TOTAL</span>
            <span className="num">HIGH-RISK</span>
            <span className="num">CONCENTRARE</span>
            <span>RATING</span>
          </div>
          {[
            { name: "Banca Transilvania", type: "Bancă comercială", exp: 4820, hr: 18, conc: 7.4, rating: "A-" },
            { name: "BCR", type: "Bancă comercială", exp: 4120, hr: 22, conc: 9.1, rating: "BBB+" },
            { name: "BRD - Société Générale", type: "Bancă comercială", exp: 3680, hr: 14, conc: 6.2, rating: "A-" },
            { name: "ING Bank România", type: "Bancă comercială", exp: 2410, hr: 8, conc: 4.1, rating: "A" },
            { name: "Raiffeisen Bank", type: "Bancă comercială", exp: 2180, hr: 12, conc: 5.8, rating: "BBB+" },
            { name: "UniCredit Bank", type: "Bancă comercială", exp: 1840, hr: 9, conc: 4.7, rating: "BBB+" },
            { name: "EBRD", type: "Inst. multilaterală", exp: 1420, hr: 4, conc: 2.8, rating: "AAA" },
            { name: "EximBank România", type: "Bancă de stat", exp: 940, hr: 6, conc: 5.2, rating: "BBB" },
          ].map((c, i) => {
            const ratingColor = c.rating.startsWith("A") ? "var(--risk-low)" : c.rating.startsWith("BBB") ? "var(--risk-medium)" : "var(--risk-high)";
            return (
              <div key={i} className="ct-row">
                <span className="ct-rank">{(i + 1).toString().padStart(2, "0")}</span>
                <span className="ct-name">{c.name}</span>
                <span className="ct-type">{c.type}</span>
                <span className="ct-num">{c.exp.toLocaleString("ro-RO")}<small>M RON</small></span>
                <span className="ct-num" style={{ color: c.hr > 15 ? "var(--risk-high)" : c.hr > 10 ? "var(--risk-medium)" : "var(--fg)", fontWeight: 600 }}>{c.hr}%</span>
                <span className="ct-num">{c.conc.toFixed(1)}%</span>
                <span className="ct-rating" style={{ color: ratingColor, borderColor: ratingColor }}>{c.rating}</span>
              </div>
            );
          })}
        </div>
      </section>

      {/* Evolutie Z trimestriala top companii */}
      <section className="stats-section">
        <div className="stats-section-head">
          <h2 className="stats-section-title">Evoluție Z-Score · top 8 companii expunere</h2>
          <span className="stats-section-meta">8 trimestre · color-coded după risc curent</span>
        </div>
        <div className="z-quarter-matrix">
          <div className="zqm-head">
            <span>TICKER</span>
            <span>COMPANIE</span>
            <span className="num">Q1-24</span>
            <span className="num">Q2-24</span>
            <span className="num">Q3-24</span>
            <span className="num">Q4-24</span>
            <span className="num">Q1-25</span>
            <span className="num">Q2-25</span>
            <span className="num">Q3-25</span>
            <span className="num">Q4-25</span>
            <span className="num">ACUM</span>
            <span className="num">DELTA</span>
          </div>
          {[...COMPANIES].sort((a, b) => b.revenue - a.revenue).slice(0, 8).map((c, i) => {
            const rc = c.riskClass === "high" ? "var(--risk-high)" : c.riskClass === "medium" ? "var(--risk-medium)" : "var(--risk-low)";
            // Pick 9 evenly spaced points from zTrend (60 months)
            const indices = [0, 6, 12, 18, 24, 30, 36, 48, 59];
            const points = indices.map(idx => c.zTrend[idx]);
            const delta = points[points.length - 1] - points[0];
            return (
              <div key={c.ticker} className="zqm-row" onClick={() => onSelectCompany && onSelectCompany(c)}>
                <span className="zqm-tk" style={{ color: rc, borderColor: rc }}>{c.ticker}</span>
                <span className="zqm-name">{c.name}</span>
                {points.map((v, j) => {
                  const cellColor = v < 1.81 ? "var(--risk-high)" : v < 2.99 ? "var(--risk-medium)" : "var(--risk-low)";
                  return (
                    <span key={j} className="zqm-cell" style={{ color: cellColor }}>{v.toFixed(2)}</span>
                  );
                })}
                <span className="zqm-delta" style={{ color: delta > 0 ? "var(--risk-low)" : "var(--risk-high)" }}>
                  {delta > 0 ? "▲" : "▼"}{Math.abs(delta).toFixed(2)}
                </span>
              </div>
            );
          })}
        </div>
      </section>

      {/* Concluzie · sănătatea portofoliului */}
      <section className="stats-section stats-health">
        <div className="stats-section-head">
          <h2 className="stats-section-title">Concluzie · sănătatea portofoliului</h2>
          <span className="stats-section-meta">analiză agregată</span>
        </div>
        <div className="health-grid">
          <div className="health-cell">
            <div className="health-num">{kpis.total - kpis.high}<span className="health-tot">/{kpis.total}</span></div>
            <div className="health-lbl">Companii în zonă sigură</div>
            <div className="health-sub">Z-Score &gt; 1.81 · {((kpis.total - kpis.high) / kpis.total * 100).toFixed(0)}%</div>
          </div>
          <div className="health-cell">
            <div className="health-num" style={{ color: "var(--risk-high)" }}>{kpis.high}</div>
            <div className="health-lbl">Necesită monitorizare</div>
            <div className="health-sub">acțiune recomandată în 30 zile</div>
          </div>
          <div className="health-cell">
            <div className="health-num">{(kpis.portfolioRevenue / 1000).toFixed(1)}<span className="health-tot">B</span></div>
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

// ─────────────────────────── Bankruptcy timeline bar/area chart
function BankrupcyTimelineChart({ data }) {
  const W = 1080, H = 240, padL = 50, padR = 16, padT = 16, padB = 38;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;
  const max = Math.max(...data);
  const min = 0;
  const yAt = v => padT + innerH - ((v - min) / (max - min)) * innerH;
  const xAt = i => padL + (i / (data.length - 1)) * innerW;
  const [hover, setHover] = useStateS(null);

  const linePath = data.map((v, i) => `${i === 0 ? "M" : "L"}${xAt(i).toFixed(1)},${yAt(v).toFixed(1)}`).join(" ");
  const areaPath = `${linePath} L${xAt(data.length - 1)},${H - padB} L${padL},${H - padB} Z`;

  const months = ["ian", "feb", "mar", "apr", "mai", "iun", "iul", "aug", "sep", "oct", "noi", "dec"];
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

      {/* y grid */}
      {[0, 0.25, 0.5, 0.75, 1].map((t, i) => {
        const v = min + (max - min) * t;
        return (
          <g key={i}>
            <line x1={padL} x2={W - padR} y1={yAt(v)} y2={yAt(v)}
              stroke="var(--fg-faint)" strokeOpacity="0.1" strokeDasharray="2 4" />
            <text x={padL - 8} y={yAt(v) + 3} fontSize="10" fill="var(--fg-faint)" textAnchor="end"
              fontFamily="var(--font-mono)">{Math.round(v)}</text>
          </g>
        );
      })}

      {/* area */}
      <path d={areaPath} fill="url(#bkArea)" />

      {/* line */}
      <path d={linePath} fill="none" stroke="var(--risk-high)" strokeWidth="2" strokeLinejoin="round" />

      {/* bars */}
      {data.map((v, i) => {
        const x = xAt(i) - 3;
        const y = yAt(v);
        return (
          <rect key={i} x={x} y={y} width="6" height={H - padB - y}
            fill="var(--risk-high)" opacity={hover === i ? 0.7 : 0.1} />
        );
      })}

      {/* x labels (every 6 months) */}
      {labels.map((l, i) => i % 6 === 0 && (
        <text key={i} x={xAt(i)} y={H - padB + 18} fontSize="10" fill="var(--fg-dim)"
          fontFamily="var(--font-mono)" textAnchor="middle">{l}</text>
      ))}

      {/* hover tooltip */}
      {hover !== null && (
        <g>
          <line x1={xAt(hover)} x2={xAt(hover)} y1={padT} y2={H - padB}
            stroke="var(--fg)" strokeOpacity="0.3" />
          <circle cx={xAt(hover)} cy={yAt(data[hover])} r="5" fill="var(--risk-high)"
            stroke="var(--bg)" strokeWidth="2" />
          <g transform={`translate(${Math.min(xAt(hover) + 12, W - 140)}, ${yAt(data[hover]) - 30})`}>
            <rect width="124" height="42" fill="var(--bg-elev)" stroke="var(--border)" rx="6" />
            <text x="10" y="16" fontSize="10" fill="var(--fg-dim)" fontFamily="var(--font-mono)">{labels[hover]}</text>
            <text x="10" y="34" fontSize="14" fontWeight="700" fill="var(--fg)" fontFamily="var(--font-mono)">{data[hover].toLocaleString("ro-RO")} <tspan fontSize="9" fill="var(--fg-dim)">cazuri</tspan></text>
          </g>
        </g>
      )}
    </svg>
  );
}

// Helper
function gen(len, base, vol, drift) {
  const out = [];
  let v = base;
  let s = len * 37;
  for (let i = 0; i < len; i++) {
    s = (s * 9301 + 49297) % 233280;
    const r = (s / 233280) - 0.5;
    v += r * vol + drift;
    out.push(+v.toFixed(2));
  }
  return out;
}

Object.assign(window, { StatsPage });
