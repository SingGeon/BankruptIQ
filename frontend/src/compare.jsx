// BankruptIQ — comparator side-by-side (2-3 companii)

function ComparePanel({ companies, onClose, onRemove, period }) {
  if (!companies || companies.length === 0) return null;
  const periodLen = { "1Y": 12, "3Y": 36, "5Y": 60 }[period] || 60;

  const xLabels = Array.from({ length: periodLen }, (_, i) => {
    const monthsAgo = periodLen - 1 - i;
    const d = new Date(2026, 4 - monthsAgo, 1);
    return d.toLocaleDateString("ro-RO", { month: "short", year: "2-digit" });
  });

  const palette = ["#7c8aff", "#22c55e", "#f59e0b"];
  const series = companies.map((c, i) => ({
    label: c.ticker,
    data: c.zTrend.slice(-periodLen),
    color: palette[i % palette.length],
  }));

  const metrics = [
    { key: "altmanZ", label: "Altman Z", fmt: v => v.toFixed(2), better: "high" },
    { key: "prob12", label: "P(faliment) 12L", fmt: v => v.toFixed(1) + "%", better: "low" },
    { key: "prob24", label: "P(faliment) 24L", fmt: v => v.toFixed(1) + "%", better: "low" },
    { key: "mlScore", label: "ML Score", fmt: v => v.toFixed(1), better: "high" },
    { key: "currentRatio", label: "Current Ratio", fmt: v => v.toFixed(2), better: "high" },
    { key: "leverage", label: "Leverage", fmt: v => v.toFixed(2) + "x", better: "low" },
    { key: "roe", label: "ROE", fmt: v => v.toFixed(1) + "%", better: "high" },
    { key: "revenue", label: "Cifră afaceri", fmt: v => v.toLocaleString("ro-RO") + " mil", better: "high" },
    { key: "ebitda", label: "EBITDA", fmt: v => v.toLocaleString("ro-RO") + " mil", better: "high" },
  ];

  function bestIdx(metric) {
    const vals = companies.map(c => c[metric.key]);
    if (metric.better === "high") return vals.indexOf(Math.max(...vals));
    return vals.indexOf(Math.min(...vals));
  }

  return (
    <section className="card compare-card">
      <header className="card-head" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h3 className="card-title">Comparator</h3>
          <div className="card-sub">{companies.length} {companies.length === 1 ? "companie selectată" : "companii selectate"} · adaugă încă {3 - companies.length} bifând în tabel</div>
        </div>
        <button className="icon-btn" onClick={onClose} aria-label="Închide comparator">✕</button>
      </header>

      <div className="compare-chart">
        <LineChart series={series} xLabels={xLabels} height={180} threshold={1.81} />
      </div>

      <div className="compare-grid" style={{ gridTemplateColumns: `160px repeat(${companies.length}, 1fr)` }}>
        <div className="compare-h">Indicator</div>
        {companies.map((c, i) => (
          <div key={c.ticker} className="compare-h compare-h-co">
            <span className="compare-dot" style={{ background: palette[i % palette.length] }} />
            <span style={{ fontFamily: "var(--font-mono)", fontWeight: 600 }}>{c.ticker}</span>
            <span style={{ marginLeft: "auto", fontSize: 10, color: "var(--fg-dim)" }}>{c.name}</span>
            <button className="compare-remove" onClick={() => onRemove(c.ticker)} title="Elimină">−</button>
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

Object.assign(window, { ComparePanel });
