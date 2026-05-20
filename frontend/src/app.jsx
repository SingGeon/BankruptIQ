// BankruptIQ — main dashboard app

const { useState, useMemo, useEffect } = React;
const { useTweaks, TweaksPanel, TweakSection, TweakRadio, TweakToggle, TweakSelect } = window;

function App() {
  const [tweaks, setTweak] = useTweaks(window.TWEAK_DEFAULTS);
  const cssVars = window.buildCssVars(tweaks.aesthetic, tweaks.mode, tweaks.riskPalette, tweaks.density);

  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("3Y");
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState("zscore");
  const [sortDir, setSortDir] = useState("asc");
  const [riskFilter, setRiskFilter] = useState("all");
  const [sectorFilter, setSectorFilter] = useState("all");
  const [selectedCo, setSelectedCo] = useState(null);
  const [compareTickers, setCompareTickers] = useState([]);
  const [view, setView] = useState("dashboard");

  const { COMPANIES, SECTORS, FLAG_LABELS, ALERTS, BANKRUPTCY_CASES, getKPIs, getSectorStats } = window.BIQ_DATA;
  const sectorStats = getSectorStats();

  // Badge alerte — scade la 0 când utilizatorul deschide secțiunea Alerte
  const [unreadAlerts, setUnreadAlerts] = useState(() => {
    const kpis0 = getKPIs();
    return kpis0.totalAlerts;
  });

  function navigateTo(newView) {
    setView(newView);
    if (newView === "alerts") setUnreadAlerts(0);
  }

  // KPI-uri calculate în funcție de perioadă:
  // 1Y → index 59 (luna curentă), 3Y → index 24 (acum 3 ani), 5Y → index 0 (acum 5 ani)
  const periodKpis = useMemo(() => {
    const periodIdx = { "1Y": 59, "3Y": 24, "5Y": 0 }[period];
    let high = 0, medium = 0, low = 0, zSum = 0;
    for (const c of COMPANIES) {
      const z = c.zTrend[periodIdx];
      zSum += z;
      if (z < 1.81) high++;
      else if (z < 2.99) medium++;
      else low++;
    }
    const total = COMPANIES.length;
    const avgZ = total > 0 ? +(zSum / total).toFixed(2) : 0;
    const base = getKPIs();
    return { ...base, high, medium, low, avgZ };
  }, [period]);

  const kpis = periodKpis;

  // Filtered + sorted companies
  const filtered = useMemo(() => {
    let list = COMPANIES.filter(c => {
      if (search && !(`${c.ticker} ${c.name}`.toLowerCase().includes(search.toLowerCase()))) return false;
      if (riskFilter !== "all" && c.riskClass !== riskFilter) return false;
      if (sectorFilter !== "all" && c.sector !== sectorFilter) return false;
      return true;
    });
    list = [...list].sort((a, b) => {
      let av = a[sortKey], bv = b[sortKey];
      if (typeof av === "string") return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
      return sortDir === "asc" ? av - bv : bv - av;
    });
    return list;
  }, [search, sortKey, sortDir, riskFilter, sectorFilter]);

  function toggleSort(k) {
    if (sortKey === k) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else { setSortKey(k); setSortDir("asc"); }
  }

  function toggleCompare(ticker) {
    setCompareTickers(arr => {
      if (arr.includes(ticker)) return arr.filter(t => t !== ticker);
      if (arr.length >= 3) return [...arr.slice(1), ticker];
      return [...arr, ticker];
    });
  }

  const compareCompanies = compareTickers.map(t => COMPANIES.find(c => c.ticker === t)).filter(Boolean);

  // Distribuție risc bazată pe perioadă
  const riskSegs = [
    { value: kpis.low, color: "var(--risk-low)", label: "Scăzut" },
    { value: kpis.medium, color: "var(--risk-medium)", label: "Mediu" },
    { value: kpis.high, color: "var(--risk-high)", label: "Înalt" },
  ];

  // Portfolio Z-score trend (avg of all companies, slice by period)
  const periodLen = { "1Y": 12, "3Y": 36, "5Y": 60 }[period];
  const portfolioTrend = useMemo(() => {
    const out = [];
    for (let i = 60 - periodLen; i < 60; i++) {
      const avg = COMPANIES.reduce((a, c) => a + c.zTrend[i], 0) / COMPANIES.length;
      out.push(+avg.toFixed(2));
    }
    return out;
  }, [period]);

  const highRiskTrend = useMemo(() => {
    const out = [];
    const high = COMPANIES.filter(c => c.riskClass === "high");
    for (let i = 60 - periodLen; i < 60; i++) {
      const avg = high.reduce((a, c) => a + c.zTrend[i], 0) / high.length;
      out.push(+avg.toFixed(2));
    }
    return out;
  }, [period]);

  const xLabels = useMemo(() => Array.from({ length: periodLen }, (_, i) => {
    const monthsAgo = periodLen - 1 - i;
    const d = new Date(2026, 4 - monthsAgo, 1);
    return d.toLocaleDateString("ro-RO", { month: "short", year: "2-digit" });
  }), [periodLen]);

  // Sector heatmap data
  const heatmapRows = sectorStats.map(s => s.name);
  const heatmapCols = ["Lichid.", "Levier.", "Profit.", "Creșt.", "Z-score"];
  const heatmapValues = sectorStats.map(s => {
    // synthesize 5 normalized indicators 0..1 (1 = bad, 0 = good)
    const seed = s.sector.charCodeAt(0);
    return heatmapCols.map((_, i) => +((Math.sin(seed + i * 1.3) + 1) / 2 * 0.8).toFixed(2));
  });

  return (
    <div className="app" style={cssVars}>
      {loading && <LoadingScreen onComplete={() => setLoading(false)} />}
      <Sidebar view={view} setView={navigateTo} kpis={kpis} unreadAlerts={unreadAlerts} />
      <main className="main">
        <TopBar period={period} setPeriod={setPeriod} search={search} setSearch={setSearch} compareCount={compareTickers.length} />
        <div className="scroll-area">
          {view === "dashboard" && (
            <>
              <HeroCommandBridge
                kpis={kpis}
                portfolioTrend={portfolioTrend}
                period={period}
                companies={COMPANIES}
                alerts={ALERTS}
                onClickTicker={c => setSelectedCo(c)}
              />

              <CompaniesGlobe
                companies={COMPANIES}
                onSelectCompany={c => setSelectedCo(c)}
              />

              <div className="grid-3">
                <Card title="Distribuție risc" sub={`${kpis.total} companii monitorizate`}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 20, padding: 8 }}>
                    <Donut segments={riskSegs} size={140} thickness={20} label={kpis.total} sublabel="companii" textColor="var(--fg)" />
                    <div style={{ display: "flex", flexDirection: "column", gap: 8, fontFamily: "var(--font-mono)", fontSize: 11 }}>
                      {riskSegs.map((s, i) => (
                        <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ width: 10, height: 10, background: s.color, display: "inline-block" }} />
                          <span style={{ width: 60, color: "var(--fg-dim)" }}>{s.label}</span>
                          <span style={{ fontWeight: 700, color: "var(--fg)" }}>{s.value}</span>
                          <span style={{ color: "var(--fg-faint)", marginLeft: 4 }}>{(s.value / kpis.total * 100).toFixed(0)}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </Card>

                <Card title="Z-Score mediu portofoliu" sub={`perioadă ${period} · prag distress = 1.81`}>
                  {tweaks.trendChart === "line" && (
                    <LineChart
                      series={[
                        { label: "portofoliu", data: portfolioTrend, color: "var(--accent)" },
                        { label: "high risk", data: highRiskTrend, color: "var(--risk-high)" },
                      ]}
                      xLabels={xLabels}
                      threshold={1.81}
                      height={200}
                      yMin={0.5}
                      yMax={5}
                    />
                  )}
                  {tweaks.trendChart === "bar" && (
                    <VBarChart
                      data={portfolioTrend.filter((_, i) => i % Math.max(1, Math.floor(periodLen / 12)) === 0).map((v, i) => ({
                        label: xLabels[i * Math.max(1, Math.floor(periodLen / 12))]?.slice(0, 3),
                        value: v,
                        color: v < 1.81 ? "var(--risk-high)" : v < 2.99 ? "var(--risk-medium)" : "var(--risk-low)",
                      }))}
                      threshold={1.81}
                      height={200}
                    />
                  )}
                </Card>
              </div>

              {compareCompanies.length > 0 && (
                <ComparePanel
                  companies={compareCompanies}
                  onClose={() => setCompareTickers([])}
                  onRemove={t => setCompareTickers(arr => arr.filter(x => x !== t))}
                  period={period}
                />
              )}

              <div className="grid-main">
                <Card title="Companii monitorizate" sub={`${filtered.length} din ${COMPANIES.length} · sortare ${sortKey} ${sortDir}`} actionsRight={
                  <CompaniesFilters riskFilter={riskFilter} setRiskFilter={setRiskFilter} sectorFilter={sectorFilter} setSectorFilter={setSectorFilter} sectors={SECTORS} />
                }>
                  <CompaniesTable
                    rows={filtered}
                    sortKey={sortKey}
                    sortDir={sortDir}
                    toggleSort={toggleSort}
                    onClick={c => setSelectedCo(c)}
                    onCompare={toggleCompare}
                    compareTickers={compareTickers}
                    sectors={SECTORS}
                    period={period}
                  />
                </Card>

                <Card title="Alerte recente" sub={`${ALERTS.filter(a => a.severity === "critical" || a.severity === "high").length} critice / înalt`}>
                  <AlertsFeed alerts={ALERTS} onClickTicker={t => {
                    const c = COMPANIES.find(co => co.ticker === t);
                    if (c) setSelectedCo(c);
                  }} />
                </Card>
              </div>

              <div className="grid-2">
                <Card title="Performanță sectoare" sub="ranking după Altman Z mediu">
                  <div className="sector-rank-table">
                    <div className="srt-head">
                      <span>#</span>
                      <span>SECTOR</span>
                      <span className="num">COMPANII</span>
                      <span className="num">Z-SCORE</span>
                      <span>STATUS</span>
                    </div>
                    {sectorStats.map((s, i) => {
                      const sc = s.avgZ < 1.81 ? "var(--risk-high)" : s.avgZ < 2.99 ? "var(--risk-medium)" : "var(--risk-low)";
                      const status = s.avgZ < 1.81 ? "DISTRESS" : s.avgZ < 2.99 ? "MONITORIZAT" : "STABIL";
                      return (
                        <div key={s.sector} className="srt-row">
                          <span className="srt-rank">{(i + 1).toString().padStart(2, "0")}</span>
                          <span className="srt-name">
                            <span className="srt-dot" style={{ background: sc }} />
                            {s.name}
                          </span>
                          <span className="srt-num">{s.count}</span>
                          <span className="srt-num" style={{ color: sc, fontWeight: 700 }}>{s.avgZ.toFixed(2)}</span>
                          <span className="srt-status" style={{ color: sc, background: `color-mix(in oklab, ${sc} 14%, transparent)` }}>{status}</span>
                        </div>
                      );
                    })}
                  </div>
                </Card>

                <Card title="Heatmap risc pe indicatori" sub="0 = bine · 10 = critic">
                  <HeatmapMatrix rows={heatmapRows} cols={heatmapCols} values={heatmapValues} />
                </Card>
              </div>

              <Card title="Cazuri de faliment recente — sector industrial RO" sub={`${BANKRUPTCY_CASES.length} cazuri în ultimele 24 luni · rata medie de recuperare ${(BANKRUPTCY_CASES.reduce((a, b) => a + b.recovery, 0) / BANKRUPTCY_CASES.length).toFixed(0)}%`}>
                <BankruptcyCases cases={BANKRUPTCY_CASES} sectors={SECTORS} />
              </Card>
            </>
          )}

          {view === "stats" && <StatsPage onSelectCompany={c => setSelectedCo(c)} />}

          {view === "alerts" && (
            <Card title="Centru de alerte" sub={`${ALERTS.length} alerte active`}>
              <AlertsFeed alerts={ALERTS} expanded onClickTicker={t => {
                const c = COMPANIES.find(co => co.ticker === t);
                if (c) setSelectedCo(c);
              }} />
            </Card>
          )}

          {view === "sectors" && (
            <>
              <Card title="Analiză sectoare" sub="ranking după Altman Z mediu + expunere portofoliu">
                <HBarChart
                  data={sectorStats.map(s => ({
                    label: `${s.name} (${s.count})`,
                    value: s.avgZ,
                    color: s.avgZ < 1.81 ? "var(--risk-high)" : s.avgZ < 2.99 ? "var(--risk-medium)" : "var(--risk-low)",
                    display: s.avgZ.toFixed(2),
                  }))}
                  height={26}
                  gap={10}
                  labelW={140}
                />
              </Card>
              <Card title="Heatmap multi-dimensional" sub="lichiditate · levier · profitabilitate · creștere · Z-score">
                <HeatmapMatrix rows={heatmapRows} cols={heatmapCols} values={heatmapValues} />
              </Card>
            </>
          )}

          {view === "compare" && (
            compareCompanies.length > 0 ? (
              <ComparePanel
                companies={compareCompanies}
                onClose={() => { setCompareTickers([]); navigateTo("dashboard"); }}
                onRemove={t => setCompareTickers(arr => arr.filter(x => x !== t))}
                period={period}
              />
            ) : (
              <Card title="Comparator" sub="selectează 2-3 companii din tabel pentru comparație">
                <div style={{ padding: 40, textAlign: "center", color: "var(--fg-dim)" }}>
                  <div style={{ fontSize: 14, marginBottom: 12 }}>Nicio companie selectată</div>
                  <button className="btn" onClick={() => navigateTo("dashboard")}>Mergi la tabel</button>
                </div>
              </Card>
            )
          )}
        </div>
      </main>

      <ProfileDrawer company={selectedCo} onClose={() => setSelectedCo(null)} period={period} />

      <TweaksPanel title="Tweaks">
        <TweakSection title="Estetică">
          <TweakSelect label="Direcție" value={tweaks.aesthetic} onChange={v => setTweak("aesthetic", v)}
            options={[
              { value: "terminal", label: "Terminal — dens, mono" },
              { value: "fintech", label: "Fintech — modern, soft" },
              { value: "editorial", label: "Editorial — serif, generos" },
            ]} />
          <TweakRadio label="Mod" value={tweaks.mode} onChange={v => setTweak("mode", v)}
            options={[{ value: "dark", label: "Dark" }, { value: "light", label: "Light" }]} />
          <TweakRadio label="Densitate" value={tweaks.density} onChange={v => setTweak("density", v)}
            options={[{ value: "compact", label: "Compact" }, { value: "comfortable", label: "Confort" }]} />
        </TweakSection>
        <TweakSection title="Culori risc">
          <TweakSelect label="Paletă" value={tweaks.riskPalette} onChange={v => setTweak("riskPalette", v)}
            options={[
              { value: "classic", label: "Clasic (verde/galben/roșu)" },
              { value: "pro", label: "Profesional (cobalt/amber)" },
              { value: "mono", label: "Monocrom (grade)" },
            ]} />
        </TweakSection>
        <TweakSection title="Grafice">
          <TweakRadio label="Trend chart" value={tweaks.trendChart} onChange={v => setTweak("trendChart", v)}
            options={[{ value: "line", label: "Linie" }, { value: "bar", label: "Bare" }]} />
        </TweakSection>
      </TweaksPanel>
    </div>
  );
}

// ---------- Sidebar ----------
function Sidebar({ view, setView, kpis, unreadAlerts }) {
  const items = [
    { id: "dashboard", label: "Dashboard", icon: "▣" },
    { id: "stats", label: "Statistici", icon: "◫" },
    { id: "alerts", label: "Alerte", icon: "△", badge: unreadAlerts > 0 ? unreadAlerts : undefined },
    { id: "sectors", label: "Sectoare", icon: "≡" },
    { id: "compare", label: "Comparator", icon: "⇄" },
  ];
  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-mark">B<span style={{ color: "var(--accent)" }}>i</span>Q</div>
        <div>
          <div className="brand-name">BankruptIQ</div>
          <div className="brand-sub">v2.4 · BVB monitor</div>
        </div>
      </div>
      <nav className="nav">
        {items.map(it => (
          <button key={it.id} className={"nav-item" + (view === it.id ? " active" : "")} onClick={() => setView(it.id)}>
            <span className="nav-icon">{it.icon}</span>
            <span>{it.label}</span>
            {it.badge !== undefined && <span className="nav-badge">{it.badge}</span>}
          </button>
        ))}
      </nav>
      <div className="sidebar-footer">
        <div className="user-chip">
          <div className="user-avatar">AP</div>
          <div>
            <div className="user-name">Andrei Popescu</div>
            <div className="user-role">Senior Risk Analyst</div>
          </div>
        </div>
        <div className="data-status">
          <span className="status-dot" />
          <span>date sincronizate · acum 4 min</span>
        </div>
      </div>
    </aside>
  );
}

// ---------- Top bar ----------
function TopBar({ period, setPeriod, search, setSearch, compareCount }) {
  return (
    <header className="topbar">
      <div className="search-wrap">
        <span className="search-icon">⌕</span>
        <input className="search-input" placeholder="Caută ticker sau companie (TLV, OMV, BRD…)" value={search} onChange={e => setSearch(e.target.value)} />
        <kbd className="kbd">⌘K</kbd>
      </div>
      <div className="topbar-spacer" />
      <div className="seg-control">
        {["1Y", "3Y", "5Y"].map(p => (
          <button key={p} className={"seg-btn" + (period === p ? " active" : "")} onClick={() => setPeriod(p)}>{p}</button>
        ))}
      </div>
      <div className="topbar-divider" />
      {compareCount > 0 && (
        <div className="compare-pill">{compareCount} în comparator</div>
      )}
    </header>
  );
}

// ---------- KPI Row ----------
function KPIRow({ kpis, portfolioTrend }) {
  const items = [
    { label: "Companii monitorizate", value: kpis.total, sub: "+2 luna trecută", trend: null },
    { label: "Risc înalt", value: kpis.high, sub: `${(kpis.high / kpis.total * 100).toFixed(0)}% portofoliu`, accent: "var(--risk-high)", trend: null },
    { label: "Alerte active", value: kpis.totalAlerts, sub: "3 critice · 4 înalt", accent: "var(--risk-medium)" },
    { label: "Z-Score mediu", value: kpis.avgZ.toFixed(2), sub: "vs. prag 1.81", trend: portfolioTrend.slice(-12) },
    { label: "Venituri agregate", value: `${(kpis.portfolioRevenue / 1000).toFixed(1)}B`, sub: "RON · agregat 4Q" },
  ];
  return (
    <div className="kpi-row">
      {items.map((it, i) => (
        <div key={i} className="kpi-tile">
          <div className="kpi-label">{it.label}</div>
          <div className="kpi-value" style={{ color: it.accent || "var(--fg)" }}>{it.value}</div>
          <div className="kpi-row-bottom">
            <span className="kpi-sub">{it.sub}</span>
            {it.trend && <Sparkline data={it.trend} width={50} height={18} color="var(--accent)" />}
          </div>
        </div>
      ))}
    </div>
  );
}

// ---------- Card ----------
function Card({ title, sub, children, actionsRight, wide, fullWidth }) {
  return (
    <section className={"card" + (wide ? " card-wide" : "") + (fullWidth ? " card-full" : "")}>
      <header className="card-head">
        <div>
          <h3 className="card-title">{title}</h3>
          {sub && <div className="card-sub">{sub}</div>}
        </div>
        {actionsRight && <div className="card-actions">{actionsRight}</div>}
      </header>
      <div className="card-body">{children}</div>
    </section>
  );
}

// ---------- Companies filters ----------
function CompaniesFilters({ riskFilter, setRiskFilter, sectorFilter, setSectorFilter, sectors }) {
  return (
    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
      <div className="filter-group">
        {[{ k: "all", l: "Toate" }, { k: "low", l: "Scăzut", c: "var(--risk-low)" }, { k: "medium", l: "Mediu", c: "var(--risk-medium)" }, { k: "high", l: "Înalt", c: "var(--risk-high)" }].map(it => (
          <button key={it.k} className={"chip" + (riskFilter === it.k ? " active" : "")} onClick={() => setRiskFilter(it.k)}>
            {it.c && <span className="chip-dot" style={{ background: it.c }} />}
            {it.l}
          </button>
        ))}
      </div>
      <select className="select" value={sectorFilter} onChange={e => setSectorFilter(e.target.value)}>
        <option value="all">Toate sectoarele</option>
        {Object.entries(sectors).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
      </select>
    </div>
  );
}

// ---------- Companies table ----------
function CompaniesTable({ rows, sortKey, sortDir, toggleSort, onClick, onCompare, compareTickers, sectors, period }) {
  const cols = [
    { key: "ticker", label: "Ticker" },
    { key: "name", label: "Companie" },
    { key: "sector", label: "Sector" },
    { key: "zscore", label: "Z-Score", num: true },
    { key: "prob12", label: "P(falim.) 12L", num: true },
    { key: "trend", label: "Trend (3Y)", noSort: true },
    { key: "leverage", label: "Levier.", num: true },
    { key: "alerts", label: "Alerte", noSort: true },
  ];

  return (
    <div className="table-wrap">
      <table className="table">
        <thead>
          <tr>
            <th style={{ width: 28 }}></th>
            {cols.map(c => (
              <th key={c.key} onClick={() => !c.noSort && toggleSort(c.key)} className={"th" + (c.noSort ? "" : " sortable") + (c.num ? " num" : "")}>
                {c.label}
                {sortKey === c.key && <span className="sort-ind">{sortDir === "asc" ? "↑" : "↓"}</span>}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map(c => {
            const trend = c.zTrend.slice(-36);
            const rc = window.riskColor(c.riskClass);
            const selected = compareTickers.includes(c.ticker);
            return (
              <tr key={c.ticker} className={selected ? "tr-selected" : ""}>
                <td>
                  <input type="checkbox" checked={selected} onChange={() => onCompare(c.ticker)} onClick={e => e.stopPropagation()} className="checkbox" />
                </td>
                <td onClick={() => onClick(c)}>
                  <div className="ticker-cell" style={{ color: rc, borderColor: rc }}>{c.ticker}</div>
                </td>
                <td onClick={() => onClick(c)}><span className="co-name">{c.name}</span></td>
                <td onClick={() => onClick(c)}><span className="sector-tag">{sectors[c.sector]}</span></td>
                <td className="num" onClick={() => onClick(c)}>
                  <span style={{ fontWeight: 600, color: rc }}>{c.zscore.toFixed(2)}</span>
                </td>
                <td className="num" onClick={() => onClick(c)}>
                  <span style={{ color: rc, fontWeight: 500 }}>{c.prob12.toFixed(1)}%</span>
                </td>
                <td onClick={() => onClick(c)}>
                  <Sparkline data={trend} width={70} height={20} color={rc} />
                </td>
                <td className="num" onClick={() => onClick(c)}>{c.leverage.toFixed(2)}x</td>
                <td onClick={() => onClick(c)}>
                  {c.flags.length > 0 ? (
                    <span className="alert-pill" style={{ color: c.riskClass === "high" ? "var(--risk-high)" : "var(--risk-medium)" }}>
                      {c.flags.length}
                    </span>
                  ) : (
                    <span style={{ color: "var(--fg-faint)" }}>—</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ---------- Alerts feed ----------
const SEV_LABEL = { critical: "CRITIC", high: "ÎNALT", medium: "MEDIU" };

function AlertsFeed({ alerts, onClickTicker, expanded }) {
  const [dismissed, setDismissed] = useState(new Set());

  const visible = alerts.filter(a => !dismissed.has(a.id));

  if (visible.length === 0) {
    return (
      <div style={{ padding: "32px 16px", textAlign: "center", color: "var(--fg-faint)", fontSize: 13 }}>
        <div style={{ fontSize: 28, marginBottom: 8 }}>✓</div>
        Nicio alertă activă · toate au fost rezolvate.
      </div>
    );
  }

  return (
    <div className="alerts-feed">
      {visible.map(a => {
        const sev = window.severityColor(a.severity);
        return (
          <div key={a.id} className="alert-item" style={{ cursor: "pointer" }}>
            {/* Bara laterală de severitate */}
            <div className="alert-sev" style={{ background: sev }} />

            {/* Corp alertă — click → deschide compania */}
            <div style={{ flex: 1, minWidth: 0 }} onClick={() => onClickTicker(a.ticker)}>
              <div className="alert-head">
                <span className="alert-ticker" style={{ color: sev }}>{a.ticker}</span>
                <span className="alert-badge" style={{
                  fontSize: 9, fontFamily: "var(--font-mono)", letterSpacing: "0.12em",
                  background: `color-mix(in oklab, ${sev} 15%, transparent)`,
                  color: sev, padding: "2px 7px", borderRadius: 999,
                  fontWeight: 700, border: `1px solid color-mix(in oklab, ${sev} 30%, transparent)`
                }}>
                  {SEV_LABEL[a.severity] || a.severity.toUpperCase()}
                </span>
                <span className="alert-time" style={{ marginLeft: "auto" }}>{a.time}</span>
              </div>
              <div className="alert-title">{a.title}</div>
              {(expanded || !expanded) && (
                <div className="alert-detail" style={{
                  maxHeight: expanded ? "none" : "2.6em",
                  overflow: "hidden",
                  WebkitLineClamp: expanded ? "none" : 2,
                  display: "-webkit-box",
                  WebkitBoxOrient: "vertical",
                }}>
                  {a.detail}
                </div>
              )}
            </div>

            {/* Buton dismiss */}
            <button
              onClick={e => { e.stopPropagation(); setDismissed(prev => new Set([...prev, a.id])); }}
              title="Marchează ca rezolvat"
              style={{
                flexShrink: 0, alignSelf: "center",
                background: "none", border: "none", cursor: "pointer",
                color: "var(--fg-faint)", fontSize: 16, padding: "4px 8px",
                borderRadius: 4, transition: "color 150ms",
              }}
              onMouseEnter={e => e.target.style.color = "var(--fg)"}
              onMouseLeave={e => e.target.style.color = "var(--fg-faint)"}
            >
              ✕
            </button>
          </div>
        );
      })}
    </div>
  );
}

// ---------- Bankruptcy cases ----------
function BankruptcyCases({ cases, sectors }) {
  return (
    <div className="cases-list">
      {cases.map((b, i) => (
        <div key={i} className="case-row">
          <div className="case-date">{b.date}</div>
          <div className="case-name">{b.name}</div>
          <div className="case-sector">{sectors[b.sector]}</div>
          <div className="case-debt">{b.debt.toLocaleString("ro-RO")}M RON</div>
          <div className="case-recovery">
            <div className="case-recovery-bar">
              <div className="case-recovery-fill" style={{ width: `${b.recovery}%`, background: b.recovery > 30 ? "var(--risk-low)" : "var(--risk-high)" }} />
            </div>
            <div className="case-recovery-val">recuperare {b.recovery}%</div>
          </div>
          <div className="case-status" data-status={b.status}>{b.status}</div>
        </div>
      ))}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
