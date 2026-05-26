// BankruptIQ — drill-down company profile drawer

const {
  useState:   useStateP,
  useEffect:  useEffectP,
  useMemo:    useMemoP,
} = React;

function ProfileDrawer({ company, onClose, period }) {
  if (!company) return null;
  const c = company;
  const FLAG_LABELS = window.BIQ_DATA.FLAG_LABELS;

  /* ── Forecast state ─────────────────────────────────────────────── */
  const [fc12,  setFc12]  = useStateP(null);   // 12 luni
  const [fc36,  setFc36]  = useStateP(null);   // 36 luni
  const [fcPeriod, setFcPeriod] = useStateP("12L");
  const [fcLoading, setFcLoading] = useStateP(false);

  /* Fetch forecast ori de câte ori se schimbă compania */
  useEffectP(() => {
    setFc12(null);
    setFc36(null);
    setFcLoading(true);

    let done = 0;
    const finish = () => { done++; if (done === 2) setFcLoading(false); };

    window.fetchForecast(c.name, 12, data => { setFc12(data); finish(); });
    window.fetchForecast(c.name, 36, data => { setFc36(data); finish(); });
  }, [c.name]);

  /* ── Slice Z-score trend pe perioadă ────────────────────────────── */
  const periodLen = { "1Y": 12, "3Y": 36, "5Y": 60 }[period] || 60;
  const zSlice   = c.zTrend.slice(-periodLen);
  const revSlice = c.revenueTrend.slice(-periodLen);

  const xLabels = useMemoP(() => Array.from({ length: periodLen }, (_, i) => {
    const monthsAgo = periodLen - 1 - i;
    const d = new Date(2026, 4 - monthsAgo, 1);
    return d.toLocaleDateString("ro-RO", { month: "short", year: "2-digit" });
  }), [periodLen]);

  const riskColor = window.riskColor(c.riskClass);

  /* ── Forecast activ (12 sau 36 luni) ───────────────────────────── */
  const fcData = fcPeriod === "12L" ? fc12 : fc36;
  const fcLen  = fcPeriod === "12L" ? 12   : 36;

  /* Convertim risk_score (0-100) → Z' aproximat pentru graficul de predicție
     Z' = 5.0 - score/100*4.5  (liniar: 0→5.0 · 33→3.5 · 66→2.0 · 100→0.5) */
  const scoreToZ = s => +(5.0 - (s / 100) * 4.5).toFixed(2);

  const fcZData  = fcData ? fcData.map(scoreToZ) : null;
  const fcXLabels = Array.from({ length: fcLen }, (_, i) => {
    const d = new Date(2026, 4 + i + 1, 1);
    return d.toLocaleDateString("ro-RO", { month: "short", year: "2-digit" });
  });

  /* Ultimele 12 luni istorice + forecast pentru graficul combinat */
  const histZ12 = c.zTrend.slice(-12);
  const histX12 = Array.from({ length: 12 }, (_, i) => {
    const monthsAgo = 11 - i;
    const d = new Date(2026, 4 - monthsAgo, 1);
    return d.toLocaleDateString("ro-RO", { month: "short", year: "2-digit" });
  });

  const combinedXLabels = fcZData
    ? [...histX12, ...fcXLabels]
    : histX12;

  const combinedHistSeries = fcZData
    ? [...histZ12, ...Array(fcLen).fill(null)]
    : histZ12;

  const combinedFcSeries = fcZData
    ? [...Array(12).fill(null), histZ12[11], ...fcZData]
    : [];

  /* Probabilitate faliment derivată din forecast */
  const fcRiskNow  = fcData ? fcData[0]  : null;
  const fcRisk12   = fcData ? fcData[Math.min(11, fcData.length - 1)] : null;
  const fcRisk36   = fc36   ? fc36[Math.min(35,  fc36.length - 1)]   : null;

  return (
    <div className="drawer-backdrop" onClick={onClose}>
      <aside className="drawer" onClick={e => e.stopPropagation()}>

        {/* ── Header ───────────────────────────────────────────────── */}
        <header className="drawer-head">
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div className="ticker-badge" style={{ borderColor: riskColor, color: riskColor }}>
              {c.ticker}
            </div>
            <div>
              <h2 style={{ margin: 0, fontFamily: "var(--font-head)", fontSize: "1.4rem",
                fontWeight: "var(--header-weight)", letterSpacing: "var(--header-spacing)" }}>
                {c.name}
              </h2>
              <div style={{ fontSize: 12, color: "var(--fg-dim)", marginTop: 2 }}>
                {window.BIQ_DATA.SECTORS[c.sector]} · {c.hq} · {c.employees.toLocaleString("ro-RO")} angajați · fondată {c.founded}
              </div>
            </div>
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Închide">✕</button>
        </header>

        <div className="drawer-body">

          {/* ── Top KPI-uri ──────────────────────────────────────── */}
          <div className="profile-stats">
            <div className="profile-stat">
              <div className="profile-stat-label">Altman Z-Score</div>
              <div className="profile-stat-value" style={{ color: riskColor }}>
                {c.altmanZ.toFixed(2)}
              </div>
              <div className="profile-stat-sub">
                {c.altmanZ > 2.99 ? "zonă sigură" : c.altmanZ > 1.81 ? "zonă gri" : "distress zone"}
              </div>
            </div>

            <div className="profile-stat">
              <div className="profile-stat-label">Ohlson O-Score</div>
              <div className="profile-stat-value">{c.ohlsonO.toFixed(2)}</div>
              <div className="profile-stat-sub">
                {c.ohlsonO < -0.5 ? "negativ — bine" : c.ohlsonO < 0.5 ? "neutru" : "pozitiv — risc"}
              </div>
            </div>

            <div className="profile-stat">
              <div className="profile-stat-label">ML Score (0-10)</div>
              <div className="profile-stat-value" style={{ color: riskColor }}>
                {c.mlScore.toFixed(1)}
              </div>
              <div className="profile-stat-sub">RandomForest · 10 features</div>
            </div>

            <div className="profile-stat">
              <div className="profile-stat-label">P(faliment) 12L</div>
              <div className="profile-stat-value" style={{ color: riskColor }}>
                {fcRisk12 !== null ? fcRisk12.toFixed(1) + "%" : c.prob12.toFixed(1) + "%"}
              </div>
              <div className="profile-stat-sub">
                36L: {fcRisk36 !== null ? fcRisk36.toFixed(1) + "%" : c.prob24.toFixed(1) + "%"}
              </div>
            </div>
          </div>

          {/* ── Grafic Z-Score istoric ───────────────────────────── */}
          <section className="card" style={{ marginTop: "var(--gap)" }}>
            <header className="card-head">
              <h3 className="card-title">Evoluție Z-Score</h3>
              <div className="card-sub">prag distress = 1.81 · zona gri = 1.81–2.99 · sigur &gt; 2.99</div>
            </header>
            <LineChart
              series={[
                { label: c.ticker, data: zSlice, color: riskColor },
                { label: "media sector", data: Array(periodLen).fill(c.industry_avg_z), color: "var(--fg-faint)" },
              ]}
              xLabels={xLabels}
              height={200}
              threshold={1.81}
              yMin={Math.max(0, Math.floor(Math.min(...zSlice, c.industry_avg_z, 1.81) * 10) / 10 - 0.3)}
              yMax={Math.ceil(Math.max(...zSlice, c.industry_avg_z, 2.99) * 10) / 10 + 0.5}
            />
          </section>

          {/* ── Predicție ML (date reale API) ────────────────────── */}
          <section className="card" style={{ marginTop: "var(--gap)" }}>
            <header className="card-head">
              <div>
                <h3 className="card-title">Predicție risc — ML</h3>
                <div className="card-sub">
                  {fcLoading
                    ? "Se calculează..."
                    : fcData
                      ? `Random Forest · Altman Z' blended · ${fcLen} luni proiectate`
                      : "Model neantrenat — antrenați modelul din secțiunea ML"}
                </div>
              </div>
              {/* Selector 12L / 36L */}
              <div className="seg-control" style={{ fontSize: 11 }}>
                {["12L", "36L"].map(p => (
                  <button key={p}
                    className={"seg-btn" + (fcPeriod === p ? " active" : "")}
                    onClick={() => setFcPeriod(p)}>
                    {p}
                  </button>
                ))}
              </div>
            </header>

            {fcLoading ? (
              <div style={{ padding: "24px 0", textAlign: "center", color: "var(--fg-faint)", fontSize: 13 }}>
                Se calculează predicția...
              </div>
            ) : fcZData ? (
              <>
                {/* KPI-uri predicție */}
                <div style={{ display: "flex", gap: 0, borderBottom: "1px solid var(--border)", marginBottom: 12 }}>
                  {[
                    { lbl: "Scor risc acum",   val: fcRiskNow !== null  ? fcRiskNow.toFixed(1) + "%" : "—" },
                    { lbl: `Scor risc +${fcLen}L`, val: fcData ? fcData[fcData.length - 1].toFixed(1) + "%" : "—" },
                    { lbl: "Trend Z-Score",
                      val: fcData && fcData[fcData.length-1] > fcData[0] ? "▼ deteriorare" : "▲ îmbunătățire",
                      color: fcData && fcData[fcData.length-1] > fcData[0] ? "var(--risk-high)" : "var(--risk-low)" },
                  ].map((k, i) => (
                    <div key={i} style={{ flex: 1, padding: "10px 14px", borderRight: i < 2 ? "1px solid var(--border)" : "none" }}>
                      <div style={{ fontSize: 10, color: "var(--fg-faint)", fontFamily: "var(--font-mono)", letterSpacing: "0.1em", marginBottom: 4 }}>
                        {k.lbl.toUpperCase()}
                      </div>
                      <div style={{ fontSize: 18, fontWeight: 700, color: k.color || riskColor, fontFamily: "var(--font-head)" }}>
                        {k.val}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Grafic combinat: 12L istoric + forecast */}
                <LineChart
                  series={[
                    { label: "Z historic (12L)", data: combinedHistSeries, color: "var(--fg-dim)" },
                    { label: `predicție (${fcLen}L)`, data: combinedFcSeries, color: "var(--accent)", dashed: true },
                  ]}
                  xLabels={combinedXLabels}
                  height={180}
                  threshold={1.81}
                  yMin={Math.max(0, Math.floor(Math.min(...[...combinedHistSeries, ...combinedFcSeries].filter(v => v !== null)) - 0.3))}
                  yMax={Math.ceil(Math.max(...[...combinedHistSeries, ...combinedFcSeries].filter(v => v !== null)) + 0.5)}
                />

                <div style={{ fontSize: 11, color: "var(--fg-faint)", marginTop: 8, fontFamily: "var(--font-mono)" }}>
                  * Scorul de risc (0-100%) e convertit la Z' echivalent pentru comparabilitate.
                  Scor risc = {fcRiskNow !== null ? fcRiskNow.toFixed(1) : "—"}% → Z' ≈ {fcZData ? fcZData[0].toFixed(2) : "—"}
                </div>
              </>
            ) : (
              <div style={{ padding: "20px 0", textAlign: "center", color: "var(--fg-faint)", fontSize: 13 }}>
                Modelul ML nu este antrenat. Mergeți la setări și antrenați modelul.
              </div>
            )}
          </section>

          {/* ── Indicatori financiari ────────────────────────────── */}
          <section className="card" style={{ marginTop: "var(--gap)" }}>
            <header className="card-head">
              <h3 className="card-title">Indicatori financiari</h3>
              <div className="card-sub">trim. curent · vs. media sectorului</div>
            </header>
            <div className="fin-grid">
              <FinRow label="Cifră afaceri" value={`${c.revenue.toLocaleString("ro-RO")} mil RON`} sparkData={revSlice} />
              <FinRow label="EBITDA"
                value={`${c.ebitda.toLocaleString("ro-RO")} mil RON`}
                sub={`marjă ${(c.ebitda / c.revenue * 100).toFixed(1)}%`} />
              <FinRow label="Datorii"
                value={`${c.debt.toLocaleString("ro-RO")} mil RON`}
                sub={`leverage ${c.leverage.toFixed(2)}x`}
                riskHi={c.leverage > 3} />
              <FinRow label="Capital propriu" value={`${c.equity.toLocaleString("ro-RO")} mil RON`} />
              <FinRow label="Current ratio"
                value={c.currentRatio.toFixed(2)}
                sub={c.currentRatio < 1 ? "sub 1.0 — atenție" : "lichiditate ok"}
                riskHi={c.currentRatio < 1} />
              <FinRow label="ROE" value={`${c.roe.toFixed(1)}%`} riskHi={c.roe < 0} />
            </div>
          </section>

          {/* ── Detaliu complet indicatori + benchmark ───────────── */}
          <section className="card" style={{ marginTop: "var(--gap)" }}>
            <header className="card-head">
              <h3 className="card-title">Indicatori financiari detaliat</h3>
              <div className="card-sub">valoare · prag · status</div>
            </header>
            <div className="card-body" style={{ padding: 0 }}>
              {[
                { lbl: "Current Ratio",       val: c.currentRatio,             fmt: v => v.toFixed(2),        thresh: 1.0,   cmp: "gte", unit: "" ,   bench: "min 1.0" },
                { lbl: "Debt Ratio",          val: c.debt / Math.max(1, c.assets || c.debt + c.equity), fmt: v => (v*100).toFixed(1)+"%", thresh: 0.70, cmp: "lte", unit: "", bench: "max 70%" },
                { lbl: "Leverage (D/E)",      val: c.leverage,                 fmt: v => v.toFixed(2)+"x",    thresh: 3.0,   cmp: "lte", unit: "x",   bench: "max 3x" },
                { lbl: "ROE",                 val: c.roe,                      fmt: v => v.toFixed(1)+"%",    thresh: 0,     cmp: "gte", unit: "%",   bench: "min 0%" },
                { lbl: "Marjă EBITDA",        val: c.ebitda / Math.max(1, c.revenue) * 100, fmt: v => v.toFixed(1)+"%", thresh: 5, cmp: "gte", unit: "%", bench: "min 5%" },
                { lbl: "Altman Z-Score",      val: c.altmanZ,                  fmt: v => v.toFixed(2),        thresh: 2.99,  cmp: "gte", unit: "",    bench: "min 2.99" },
                { lbl: "Ohlson O-Score",      val: c.ohlsonO,                  fmt: v => v.toFixed(2),        thresh: 0.5,   cmp: "lte", unit: "",    bench: "max 0.5" },
                { lbl: "P(faliment) 12L",     val: c.prob12,                   fmt: v => v.toFixed(1)+"%",    thresh: 30,    cmp: "lte", unit: "%",   bench: "max 30%" },
                { lbl: "ML Score risc (0-10)",val: c.mlScore,                  fmt: v => v.toFixed(1),        thresh: 5,     cmp: "gte", unit: "",    bench: "min 5 (bun)" },
              ].map((row, i) => {
                const ok = row.cmp === "gte" ? row.val >= row.thresh : row.val <= row.thresh;
                const warn = row.cmp === "gte"
                  ? row.val >= row.thresh * 0.7 && row.val < row.thresh
                  : row.val <= row.thresh * 1.3 && row.val > row.thresh;
                const status = ok ? "✓" : warn ? "⚠" : "✗";
                const statusColor = ok ? "var(--risk-low)" : warn ? "var(--risk-medium)" : "var(--risk-high)";
                const pct = row.cmp === "gte"
                  ? Math.min(100, (row.val / (row.thresh * 1.5)) * 100)
                  : Math.min(100, ((row.thresh * 2 - Math.max(0, row.val)) / (row.thresh * 2)) * 100);
                return (
                  <div key={i} style={{
                    display: "grid", gridTemplateColumns: "1fr auto 60px 28px",
                    alignItems: "center", gap: 10, padding: "10px 16px",
                    borderBottom: i < 8 ? "1px solid var(--border)" : "none",
                  }}>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: "var(--fg)" }}>{row.lbl}</div>
                      <div style={{ marginTop: 4, height: 4, background: "var(--bg-elev-2)", borderRadius: 2, overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${pct}%`, background: statusColor, borderRadius: 2, transition: "width 600ms ease" }} />
                      </div>
                    </div>
                    <div style={{ fontFamily: "var(--font-mono)", fontSize: 13, fontWeight: 700, color: statusColor }}>{row.fmt(row.val)}</div>
                    <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--fg-faint)", textAlign: "right" }}>{row.bench}</div>
                    <div style={{ fontSize: 14, color: statusColor, textAlign: "center" }}>{status}</div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* ── Comparație cu media sectorului ───────────────────── */}
          <section className="card" style={{ marginTop: "var(--gap)" }}>
            <header className="card-head">
              <h3 className="card-title">Comparație cu sectorul</h3>
              <div className="card-sub">{window.BIQ_DATA.SECTORS[c.sector] || c.sector} · media companiilor similare</div>
            </header>
            <div className="card-body" style={{ padding: 0 }}>
              {(() => {
                const sectorCos = window.BIQ_DATA.COMPANIES.filter(x => x.sector === c.sector);
                const avg = field => sectorCos.length
                  ? sectorCos.reduce((s, x) => s + (x[field] || 0), 0) / sectorCos.length
                  : 0;
                const avgZ    = avg("altmanZ");
                const avgRoe  = avg("roe");
                const avgLev  = avg("leverage");
                const avgCr   = avg("currentRatio");
                const avgProb = avg("prob12");
                const rows = [
                  { lbl: "Altman Z",        co: c.altmanZ,      sec: avgZ,    fmt: v => v.toFixed(2),      better: "high" },
                  { lbl: "ROE",             co: c.roe,          sec: avgRoe,  fmt: v => v.toFixed(1)+"%",  better: "high" },
                  { lbl: "Leverage",        co: c.leverage,     sec: avgLev,  fmt: v => v.toFixed(2)+"x",  better: "low"  },
                  { lbl: "Current Ratio",   co: c.currentRatio, sec: avgCr,   fmt: v => v.toFixed(2),      better: "high" },
                  { lbl: "P(faliment) 12L", co: c.prob12,       sec: avgProb, fmt: v => v.toFixed(1)+"%",  better: "low"  },
                ];
                return rows.map((r, i) => {
                  const better = r.better === "high" ? r.co >= r.sec : r.co <= r.sec;
                  const diff   = r.co - r.sec;
                  const diffFmt = (r.better === "high" ? (diff >= 0 ? "+" : "") : (diff >= 0 ? "+" : "")) + diff.toFixed(2);
                  return (
                    <div key={i} style={{
                      display: "grid", gridTemplateColumns: "1fr 80px 80px 70px",
                      alignItems: "center", gap: 8, padding: "10px 16px",
                      borderBottom: i < rows.length - 1 ? "1px solid var(--border)" : "none",
                    }}>
                      <div style={{ fontSize: 12, color: "var(--fg-dim)", fontFamily: "var(--font-mono)" }}>{r.lbl}</div>
                      <div style={{ fontFamily: "var(--font-mono)", fontSize: 13, fontWeight: 700, color: riskColor, textAlign: "right" }}>{r.fmt(r.co)}</div>
                      <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--fg-faint)", textAlign: "right" }}>{r.fmt(r.sec)}</div>
                      <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 600, textAlign: "right",
                        color: better ? "var(--risk-low)" : "var(--risk-high)" }}>
                        {diffFmt}
                      </div>
                    </div>
                  );
                });
              })()}
              <div style={{ padding: "8px 16px", borderTop: "1px solid var(--border)", display: "flex", gap: 16,
                fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--fg-faint)" }}>
                <span>COMPANIE</span>
                <span style={{ marginLeft: "auto" }}>SECTOR AVG</span>
                <span>DIFERENȚĂ</span>
              </div>
            </div>
          </section>

          {/* ── Early-Warning Flags ──────────────────────────────── */}
          {c.flags.length > 0 && (
            <section className="card" style={{ marginTop: "var(--gap)" }}>
              <header className="card-head">
                <h3 className="card-title">Semnale Early-Warning</h3>
                <div className="card-sub">{c.flags.length} flag(uri) active</div>
              </header>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {c.flags.map(f => (
                  <div key={f} className="flag-item">
                    <span className="flag-dot" />
                    <span>{FLAG_LABELS[f] || f}</span>
                  </div>
                ))}
              </div>
            </section>
          )}

        </div>
      </aside>
    </div>
  );
}

function FinRow({ label, value, sub, sparkData, riskHi }) {
  return (
    <div className="fin-row">
      <div className="fin-label">{label}</div>
      <div className="fin-value" style={{ color: riskHi ? "var(--risk-high)" : "var(--fg)" }}>
        {value}
        {sub && <div className="fin-sub">{sub}</div>}
      </div>
      <div className="fin-spark">
        {sparkData && (
          <Sparkline data={sparkData.slice(-24)} width={100} height={28} color="var(--accent)" />
        )}
      </div>
    </div>
  );
}

Object.assign(window, { ProfileDrawer });
