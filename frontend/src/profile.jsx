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
                    { lbl: "Trend",             val: fcData && fcData[fcData.length-1] > fcData[0] ? "▲ în creștere" : "▼ în scădere",
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
                  yMin={0.2}
                  yMax={5.5}
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
