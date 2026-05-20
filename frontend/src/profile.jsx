// BankruptIQ — drill-down company profile drawer

const { useState: useStateP, useMemo: useMemoP } = React;

function ProfileDrawer({ company, onClose, period }) {
  if (!company) return null;
  const c = company;
  const FLAG_LABELS = window.BIQ_DATA.FLAG_LABELS;

  const periodLen = { "1Y": 12, "3Y": 36, "5Y": 60 }[period] || 60;
  const zSlice = c.zTrend.slice(-periodLen);
  const revSlice = c.revenueTrend.slice(-periodLen);
  const xLabels = Array.from({ length: periodLen }, (_, i) => {
    const monthsAgo = periodLen - 1 - i;
    const d = new Date(2026, 4 - monthsAgo, 1);
    return d.toLocaleDateString("ro-RO", { month: "short", year: "2-digit" });
  });

  // simulate forecast (next 6 months)
  const lastZ = zSlice[zSlice.length - 1];
  const trend6 = Array.from({ length: 6 }, (_, i) => +(lastZ + (Math.sin(i + c.ticker.length) * 0.1) + (i * 0.02)).toFixed(2));

  const riskCls = c.riskClass;
  const riskColor = window.riskColor(riskCls);

  return (
    <div className="drawer-backdrop" onClick={onClose}>
      <aside className="drawer" onClick={e => e.stopPropagation()}>
        <header className="drawer-head">
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div className="ticker-badge" style={{ borderColor: riskColor, color: riskColor }}>{c.ticker}</div>
            <div>
              <h2 style={{ margin: 0, fontFamily: "var(--font-head)", fontSize: "1.4rem", fontWeight: "var(--header-weight)", letterSpacing: "var(--header-spacing)" }}>{c.name}</h2>
              <div style={{ fontSize: 12, color: "var(--fg-dim)", marginTop: 2 }}>
                {window.BIQ_DATA.SECTORS[c.sector]} · {c.hq} · {c.employees.toLocaleString("ro-RO")} angajați · fondată {c.founded}
              </div>
            </div>
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Închide">✕</button>
        </header>

        <div className="drawer-body">
          {/* Top stats row */}
          <div className="profile-stats">
            <div className="profile-stat">
              <div className="profile-stat-label">Altman Z-Score</div>
              <div className="profile-stat-value" style={{ color: riskColor }}>{c.altmanZ.toFixed(2)}</div>
              <div className="profile-stat-sub">{c.altmanZ > 2.99 ? "zonă sigură" : c.altmanZ > 1.81 ? "zonă gri" : "distress zone"}</div>
            </div>
            <div className="profile-stat">
              <div className="profile-stat-label">Ohlson O-Score</div>
              <div className="profile-stat-value">{c.ohlsonO.toFixed(2)}</div>
              <div className="profile-stat-sub">{c.ohlsonO < -0.5 ? "negativ — bine" : c.ohlsonO < 0.5 ? "neutru" : "pozitiv — risc"}</div>
            </div>
            <div className="profile-stat">
              <div className="profile-stat-label">ML Score (0-10)</div>
              <div className="profile-stat-value" style={{ color: riskColor }}>{c.mlScore.toFixed(1)}</div>
              <div className="profile-stat-sub">RandomForest · 47 features</div>
            </div>
            <div className="profile-stat">
              <div className="profile-stat-label">P(faliment) 12L</div>
              <div className="profile-stat-value" style={{ color: riskColor }}>{c.prob12.toFixed(1)}%</div>
              <div className="profile-stat-sub">24L: {c.prob24.toFixed(1)}%</div>
            </div>
          </div>

          {/* Z-Score chart */}
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

          {/* Financial indicators */}
          <section className="card" style={{ marginTop: "var(--gap)" }}>
            <header className="card-head">
              <h3 className="card-title">Indicatori financiari</h3>
              <div className="card-sub">trim. curent · vs. media sectorului</div>
            </header>
            <div className="fin-grid">
              <FinRow label="Cifră afaceri" value={`${c.revenue.toLocaleString("ro-RO")} mil RON`} sparkData={revSlice} />
              <FinRow label="EBITDA" value={`${c.ebitda.toLocaleString("ro-RO")} mil RON`} sub={`marjă ${(c.ebitda / c.revenue * 100).toFixed(1)}%`} />
              <FinRow label="Datorii" value={`${c.debt.toLocaleString("ro-RO")} mil RON`} sub={`leverage ${c.leverage.toFixed(2)}x`} riskHi={c.leverage > 3} />
              <FinRow label="Capital propriu" value={`${c.equity.toLocaleString("ro-RO")} mil RON`} />
              <FinRow label="Current ratio" value={c.currentRatio.toFixed(2)} sub={c.currentRatio < 1 ? "sub 1.0 — atenție" : "ok"} riskHi={c.currentRatio < 1} />
              <FinRow label="ROE" value={`${c.roe.toFixed(1)}%`} riskHi={c.roe < 0} />
            </div>
          </section>          {/* Forecast */}
          <section className="card" style={{ marginTop: "var(--gap)" }}>
            <header className="card-head">
              <h3 className="card-title">Predicție 6 luni</h3>
              <div className="card-sub">ML ensemble · interval de încredere 95%</div>
            </header>
            <LineChart
              series={[
                { label: "istoric", data: [...zSlice.slice(-12), ...Array(6).fill(null).map((_, i) => null)].filter(v => v !== null), color: "var(--fg-dim)" },
                { label: "predicție", data: [zSlice[zSlice.length - 1], ...trend6], color: "var(--accent)" },
              ]}
              xLabels={[...xLabels.slice(-12), "M+1", "M+2", "M+3", "M+4", "M+5", "M+6"]}
              height={160}
              threshold={1.81}
            />
          </section>

          {/* Flags & alerts */}
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
