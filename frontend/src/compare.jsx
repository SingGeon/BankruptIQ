// BankruptIQ — comparator cu picker integrat

const { useState: useStateC, useMemo: useMemoC } = React;

const PALETTE = ["#7c8aff", "#22c55e", "#f59e0b", "#f87171"];
const MAX_SELECT = 4;

/* ── ComparePanel (apelat din app.jsx când există companii selectate din tabel) ── */
function ComparePanel({ companies, onClose, onRemove, period }) {
  if (!companies || companies.length === 0) return null;
  const periodLen = { "1Y": 12, "3Y": 36, "5Y": 60 }[period] || 60;
  const xLabels = Array.from({ length: periodLen }, (_, i) => {
    const monthsAgo = periodLen - 1 - i;
    const d = new Date(2026, 4 - monthsAgo, 1);
    return d.toLocaleDateString("ro-RO", { month: "short", year: "2-digit" });
  });
  const series = companies.map((c, i) => ({
    label: c.ticker,
    data: c.zTrend.slice(-periodLen),
    color: PALETTE[i % PALETTE.length],
  }));
  const metrics = [
    { key: "altmanZ",     label: "Altman Z",          fmt: v => v.toFixed(2),              better: "high" },
    { key: "prob12",      label: "P(faliment) 12L",   fmt: v => v.toFixed(1) + "%",        better: "low"  },
    { key: "prob24",      label: "P(faliment) 24L",   fmt: v => v.toFixed(1) + "%",        better: "low"  },
    { key: "mlScore",     label: "ML Score",           fmt: v => v.toFixed(1),              better: "high" },
    { key: "currentRatio",label: "Current Ratio",      fmt: v => v.toFixed(2),              better: "high" },
    { key: "leverage",    label: "Leverage",           fmt: v => v.toFixed(2) + "x",       better: "low"  },
    { key: "roe",         label: "ROE",                fmt: v => v.toFixed(1) + "%",        better: "high" },
    { key: "revenue",     label: "Cifră afaceri",      fmt: v => v.toLocaleString("ro-RO") + " mil", better: "high" },
    { key: "ebitda",      label: "EBITDA",             fmt: v => v.toLocaleString("ro-RO") + " mil", better: "high" },
  ];
  function bestIdx(m) {
    const vals = companies.map(c => c[m.key]);
    return m.better === "high" ? vals.indexOf(Math.max(...vals)) : vals.indexOf(Math.min(...vals));
  }
  return (
    <section className="card compare-card">
      <header className="card-head">
        <div>
          <h3 className="card-title">Comparator</h3>
          <div className="card-sub">{companies.length} companii · adaugă până la {MAX_SELECT - companies.length} mai multe bifând în tabel</div>
        </div>
        <button className="icon-btn" onClick={onClose}>✕</button>
      </header>
      <div className="compare-chart">
        <LineChart series={series} xLabels={xLabels} height={180} threshold={1.81} />
      </div>
      <div className="compare-grid" style={{ gridTemplateColumns: `160px repeat(${companies.length}, 1fr)` }}>
        <div className="compare-h">Indicator</div>
        {companies.map((c, i) => (
          <div key={c.ticker} className="compare-h compare-h-co">
            <span className="compare-dot" style={{ background: PALETTE[i % PALETTE.length] }} />
            <span style={{ fontFamily: "var(--font-mono)", fontWeight: 600 }}>{c.ticker}</span>
            <span style={{ marginLeft: "auto", fontSize: 10, color: "var(--fg-dim)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 80 }}>{c.name}</span>
            <button className="compare-remove" onClick={() => onRemove(c.ticker)}>−</button>
          </div>
        ))}
        {metrics.map(m => {
          const best = bestIdx(m);
          return (
            <React.Fragment key={m.key}>
              <div className="compare-l">{m.label}</div>
              {companies.map((c, i) => (
                <div key={c.ticker} className={"compare-v" + (i === best && companies.length > 1 ? " compare-best" : "")}>
                  {m.fmt(c[m.key])}
                  {i === best && companies.length > 1 && <span className="compare-best-mark">★</span>}
                </div>
              ))}
            </React.Fragment>
          );
        })}
      </div>
    </section>
  );
}

/* ── ComparatorPage — pagina dedicată din navigație ── */
function ComparatorPage({ period }) {
  const { COMPANIES, SECTORS } = window.BIQ_DATA;
  const [search, setSearch]     = useStateC("");
  const [selected, setSelected] = useStateC([]);   // tickere selectate
  const [riskF, setRiskF]       = useStateC("all");

  const periodLen = { "1Y": 12, "3Y": 36, "5Y": 60 }[period] || 60;

  const filtered = useMemoC(() => {
    const q = search.toLowerCase();
    return COMPANIES.filter(c => {
      if (riskF !== "all" && c.riskClass !== riskF) return false;
      if (q && !(`${c.ticker} ${c.name}`.toLowerCase().includes(q))) return false;
      return true;
    }).slice(0, 80);
  }, [search, riskF]);

  const selectedCompanies = selected.map(t => COMPANIES.find(c => c.ticker === t)).filter(Boolean);

  function toggle(ticker) {
    setSelected(prev => {
      if (prev.includes(ticker)) return prev.filter(t => t !== ticker);
      if (prev.length >= MAX_SELECT) return prev;
      return [...prev, ticker];
    });
  }

  const xLabels = Array.from({ length: periodLen }, (_, i) => {
    const monthsAgo = periodLen - 1 - i;
    const d = new Date(2026, 4 - monthsAgo, 1);
    return d.toLocaleDateString("ro-RO", { month: "short", year: "2-digit" });
  });

  const riskBtns = [
    { k: "all",    l: "Toate"  },
    { k: "low",    l: "Scăzut",  c: "var(--risk-low)"    },
    { k: "medium", l: "Mediu",   c: "var(--risk-medium)" },
    { k: "high",   l: "Înalt",   c: "var(--risk-high)"   },
  ];

  return (
    <div style={{ display: "flex", gap: "var(--gap)", alignItems: "flex-start" }}>

      {/* ── Picker companii (stânga) ── */}
      <div style={{ width: 300, flexShrink: 0, display: "flex", flexDirection: "column", gap: "var(--gap)" }}>

        <section className="card">
          <header className="card-head">
            <h3 className="card-title">Selectează companii</h3>
            <div className="card-sub">max {MAX_SELECT} · {selected.length} selectate</div>
          </header>
          <div className="card-body" style={{ paddingTop: 8 }}>
            {/* Search */}
            <div className="search-wrap" style={{ minWidth: "unset", marginBottom: 8 }}>
              <span className="search-icon">⌕</span>
              <input
                className="search-input"
                placeholder="Ticker sau denumire…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ fontSize: 12 }}
              />
            </div>

            {/* Risk filter */}
            <div className="filter-group" style={{ marginBottom: 10, display: "flex" }}>
              {riskBtns.map(b => (
                <button key={b.k} className={"chip" + (riskF === b.k ? " active" : "")} onClick={() => setRiskF(b.k)} style={{ flex: 1 }}>
                  {b.c && <span className="chip-dot" style={{ background: b.c }} />}
                  {b.l}
                </button>
              ))}
            </div>

            {/* Lista companii */}
            <div style={{ maxHeight: 480, overflowY: "auto", display: "flex", flexDirection: "column", gap: 2 }}>
              {filtered.map(c => {
                const rc = window.riskColor(c.riskClass);
                const isSelected = selected.includes(c.ticker);
                const selIdx = selected.indexOf(c.ticker);
                return (
                  <div
                    key={c.ticker}
                    onClick={() => toggle(c.ticker)}
                    style={{
                      display: "flex", alignItems: "center", gap: 8,
                      padding: "7px 8px",
                      borderRadius: "var(--radius)",
                      cursor: "pointer",
                      background: isSelected ? `color-mix(in oklab, ${PALETTE[selIdx]} 10%, transparent)` : "transparent",
                      border: isSelected ? `1px solid color-mix(in oklab, ${PALETTE[selIdx]} 30%, transparent)` : "1px solid transparent",
                      transition: "all 120ms",
                    }}
                  >
                    {/* Color dot / index */}
                    <div style={{
                      width: 20, height: 20, borderRadius: 4, flexShrink: 0,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      background: isSelected ? PALETTE[selIdx] : "var(--bg-elev-2)",
                      fontSize: 10, fontFamily: "var(--font-mono)", fontWeight: 700,
                      color: isSelected ? "var(--bg)" : "var(--fg-faint)",
                    }}>
                      {isSelected ? selIdx + 1 : ""}
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 700, color: rc }}>{c.ticker}</span>
                        <span style={{ fontSize: 11, color: "var(--fg-dim)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.name}</span>
                      </div>
                      <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--fg-faint)", marginTop: 1 }}>
                        Z {c.altmanZ.toFixed(2)} · P12 {c.prob12.toFixed(1)}%
                      </div>
                    </div>

                    <Sparkline data={c.zTrend.slice(-24)} width={50} height={18} color={rc} />
                  </div>
                );
              })}
              {filtered.length === 0 && (
                <div style={{ padding: 20, textAlign: "center", color: "var(--fg-faint)", fontSize: 12 }}>Nicio companie găsită</div>
              )}
            </div>
          </div>
        </section>

        {/* Selecție activă */}
        {selectedCompanies.length > 0 && (
          <section className="card">
            <header className="card-head">
              <h3 className="card-title">Selectate</h3>
            </header>
            <div className="card-body" style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {selectedCompanies.map((c, i) => (
                <div key={c.ticker} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: PALETTE[i], flexShrink: 0 }} />
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 700, color: PALETTE[i] }}>{c.ticker}</span>
                  <span style={{ fontSize: 11, color: "var(--fg-dim)", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.name}</span>
                  <button onClick={() => toggle(c.ticker)} style={{
                    background: "none", border: "none", color: "var(--fg-faint)", cursor: "pointer", fontSize: 13, padding: "0 2px"
                  }}>×</button>
                </div>
              ))}
              <button onClick={() => setSelected([])} style={{
                marginTop: 4, padding: "5px 10px", background: "none",
                border: "1px solid var(--border)", borderRadius: "var(--radius)",
                color: "var(--fg-dim)", fontSize: 11, cursor: "pointer", fontFamily: "var(--font-mono)"
              }}>Golește selecția</button>
            </div>
          </section>
        )}
      </div>

      {/* ── Grafice + metrici (dreapta) ── */}
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: "var(--gap)" }}>

        {selectedCompanies.length === 0 ? (
          <section className="card">
            <div style={{ padding: "60px 40px", textAlign: "center", color: "var(--fg-faint)" }}>
              <div style={{ fontSize: 32, marginBottom: 12, opacity: 0.3 }}>⇄</div>
              <div style={{ fontSize: 14, marginBottom: 6, color: "var(--fg-dim)" }}>Selectează companii din lista din stânga</div>
              <div style={{ fontSize: 12 }}>Poți alege până la {MAX_SELECT} companii pentru comparație</div>
            </div>
          </section>
        ) : (
          <>
            {/* Grafic Z-Score combinat */}
            <section className="card">
              <header className="card-head">
                <h3 className="card-title">Evoluție Z-Score</h3>
                <div className="card-sub">prag distress 1.81 · perioadă {period}</div>
              </header>
              <div style={{ padding: "0 var(--pad-card) var(--pad-card)" }}>
                <LineChart
                  series={selectedCompanies.map((c, i) => ({
                    label: c.ticker,
                    data: c.zTrend.slice(-periodLen),
                    color: PALETTE[i],
                  }))}
                  xLabels={xLabels}
                  height={260}
                  threshold={1.81}
                  yMin={0}
                  yMax={Math.ceil(Math.max(...selectedCompanies.flatMap(c => c.zTrend.slice(-periodLen))) + 0.5)}
                />
              </div>
            </section>

            {/* Z-Score live individual — unul per companie */}
            <div style={{ display: "grid", gridTemplateColumns: `repeat(${Math.min(selectedCompanies.length, 2)}, 1fr)`, gap: "var(--gap)" }}>
              {selectedCompanies.map((c, i) => {
                const rc = window.riskColor(c.riskClass);
                return (
                  <section key={c.ticker} className="card">
                    <header className="card-head" style={{ borderBottom: `2px solid ${PALETTE[i]}` }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: 14, color: PALETTE[i] }}>{c.ticker}</span>
                        <span style={{ fontSize: 12, color: "var(--fg-dim)" }}>{c.name}</span>
                      </div>
                      <span style={{
                        fontSize: 10, fontFamily: "var(--font-mono)", padding: "2px 8px",
                        borderRadius: 999, background: `color-mix(in oklab, ${rc} 15%, transparent)`,
                        color: rc, fontWeight: 700, border: `1px solid color-mix(in oklab, ${rc} 30%, transparent)`
                      }}>
                        {c.riskClass === "high" ? "RISC ÎNALT" : c.riskClass === "medium" ? "RISC MEDIU" : "RISC SCĂZUT"}
                      </span>
                    </header>
                    <div className="card-body">
                      <BigLiveChart value={c.altmanZ} trend={c.zTrend} threshold={1.81} good={2.99} />
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginTop: 12 }}>
                        {[
                          { l: "Altman Z",   v: c.altmanZ.toFixed(2),   color: rc },
                          { l: "P(falim.)",  v: c.prob12.toFixed(1)+"%", color: rc },
                          { l: "ML Score",   v: c.mlScore.toFixed(1),    color: "var(--accent)" },
                        ].map(kpi => (
                          <div key={kpi.l} style={{ textAlign: "center", padding: "8px 4px", background: "var(--bg-elev-2)", borderRadius: "var(--radius)" }}>
                            <div style={{ fontSize: 9, fontFamily: "var(--font-mono)", color: "var(--fg-faint)", letterSpacing: "0.1em", marginBottom: 4 }}>{kpi.l}</div>
                            <div style={{ fontSize: 18, fontWeight: 700, color: kpi.color, fontFamily: "var(--font-head)" }}>{kpi.v}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </section>
                );
              })}
            </div>

            {/* Tabel metrici comparativ */}
            <section className="card">
              <header className="card-head">
                <h3 className="card-title">Metrici comparative</h3>
              </header>
              <div className="compare-grid" style={{ gridTemplateColumns: `160px repeat(${selectedCompanies.length}, 1fr)` }}>
                <div className="compare-h">Indicator</div>
                {selectedCompanies.map((c, i) => (
                  <div key={c.ticker} className="compare-h compare-h-co">
                    <span className="compare-dot" style={{ background: PALETTE[i] }} />
                    <span style={{ fontFamily: "var(--font-mono)", fontWeight: 600 }}>{c.ticker}</span>
                  </div>
                ))}
                {[
                  { key: "altmanZ",      label: "Altman Z",         fmt: v => v.toFixed(2),                        better: "high" },
                  { key: "ohlsonO",      label: "Ohlson O-Score",   fmt: v => v.toFixed(2),                        better: "low"  },
                  { key: "prob12",       label: "P(faliment) 12L",  fmt: v => v.toFixed(1) + "%",                  better: "low"  },
                  { key: "mlScore",      label: "ML Score",         fmt: v => v.toFixed(1),                        better: "high" },
                  { key: "currentRatio", label: "Current Ratio",    fmt: v => v.toFixed(2),                        better: "high" },
                  { key: "leverage",     label: "Leverage",         fmt: v => v.toFixed(2) + "x",                  better: "low"  },
                  { key: "roe",          label: "ROE",              fmt: v => v.toFixed(1) + "%",                  better: "high" },
                  { key: "revenue",      label: "Cifră afaceri",    fmt: v => v.toLocaleString("ro-RO") + " mil",  better: "high" },
                  { key: "ebitda",       label: "EBITDA",           fmt: v => v.toLocaleString("ro-RO") + " mil",  better: "high" },
                ].map(m => {
                  const vals = selectedCompanies.map(c => c[m.key]);
                  const best = m.better === "high" ? vals.indexOf(Math.max(...vals)) : vals.indexOf(Math.min(...vals));
                  return (
                    <React.Fragment key={m.key}>
                      <div className="compare-l">{m.label}</div>
                      {selectedCompanies.map((c, i) => (
                        <div key={c.ticker} className={"compare-v" + (i === best && selectedCompanies.length > 1 ? " compare-best" : "")}>
                          {m.fmt(c[m.key])}
                          {i === best && selectedCompanies.length > 1 && <span className="compare-best-mark">★</span>}
                        </div>
                      ))}
                    </React.Fragment>
                  );
                })}
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
}

Object.assign(window, { ComparePanel, ComparatorPage });
