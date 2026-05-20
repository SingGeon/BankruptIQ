// BankruptIQ — Hero "Command Bridge" — visual centerpiece

const { useState: useStateH, useEffect: useEffectH, useMemo: useMemoH } = React;

function HeroCommandBridge({ kpis, portfolioTrend, period, companies, alerts, onClickTicker }) {
  // Animate Z-score number on mount
  const [animZ, setAnimZ] = useStateH(0);
  useEffectH(() => {
    let raf;
    const start = performance.now();
    const target = kpis.avgZ;
    const dur = 1200;
    const tick = (now) => {
      const t = Math.min(1, (now - start) / dur);
      const eased = 1 - Math.pow(1 - t, 3);
      setAnimZ(target * eased);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [kpis.avgZ]);

  // Live tickers in mid-panel — animated counts
  const [pulse, setPulse] = useStateH(0);
  useEffectH(() => {
    const id = setInterval(() => setPulse(p => p + 1), 2400);
    return () => clearInterval(id);
  }, []);

  const lastZ = portfolioTrend[portfolioTrend.length - 1];
  const prevZ = portfolioTrend[Math.max(0, portfolioTrend.length - 13)] || lastZ;
  const zDelta = lastZ - prevZ;
  const zDeltaPct = (zDelta / prevZ) * 100;

  const riskPct = (kpis.high / kpis.total) * 100;
  const top3HighRisk = [...companies]
    .sort((a, b) => a.zscore - b.zscore)
    .slice(0, 3);

  const criticalAlerts = alerts.filter(a => a.severity === "critical" || a.severity === "high").slice(0, 4);

  return (
    <div className="hero-bridge">
      {/* ── Left: Portfolio Z-Score (giant) ── */}
      <section className="hero-left">
        <div className="hero-corner-tag">
          <span className="hero-corner-dot" />
          PORTOFOLIU · LIVE
        </div>

        <div className="hero-z-block">
          <BigLiveChart value={animZ} trend={portfolioTrend} threshold={1.81} good={2.99} />
          <div className="hero-z-num">
            <div className="hero-z-label">Z-SCORE MEDIU PORTOFOLIU</div>
            <div className="hero-z-value">{animZ.toFixed(2)}</div>
            <div className="hero-z-delta">
              <span className={"hero-delta-pill " + (zDelta > 0 ? "up" : "down")}>
                {zDelta > 0 ? "▲" : "▼"} {Math.abs(zDelta).toFixed(2)}
              </span>
              <span className="hero-delta-sub">vs. luna trecută · {zDeltaPct > 0 ? "+" : ""}{zDeltaPct.toFixed(1)}%</span>
            </div>
          </div>
        </div>

        <div className="hero-divider" />

        <div className="hero-mini-stats">
          <div className="hero-ms">
            <div className="hero-ms-val">{kpis.total}</div>
            <div className="hero-ms-lbl">companii</div>
          </div>
          <div className="hero-ms">
            <div className="hero-ms-val" style={{ color: "var(--risk-low)" }}>{kpis.low}</div>
            <div className="hero-ms-lbl">scăzut</div>
          </div>
          <div className="hero-ms">
            <div className="hero-ms-val" style={{ color: "var(--risk-medium)" }}>{kpis.medium}</div>
            <div className="hero-ms-lbl">mediu</div>
          </div>
          <div className="hero-ms">
            <div className="hero-ms-val" style={{ color: "var(--risk-high)" }}>{kpis.high}</div>
            <div className="hero-ms-lbl">înalt</div>
          </div>
        </div>
      </section>

      {/* ── Middle: Live metrics ── */}
      <section className="hero-middle">
        <div className="hero-mid-head">
          <div className="hero-corner-tag">
            <span className="hero-corner-dot" />
            METRICI LIVE · {period}
          </div>
          <div className="hero-time">
            {new Date().toLocaleString("ro-RO", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
          </div>
        </div>

        <div className="hero-metric-grid">
          <MetricStrip
            label="Risc înalt"
            value={`${kpis.high}/${kpis.total}`}
            sub={`${riskPct.toFixed(0)}% din portofoliu`}
            color="var(--risk-high)"
            trend={portfolioTrend.slice(-24)}
            tone="warning"
          />
          <MetricStrip
            label="Alerte 7 zile"
            value={kpis.totalAlerts}
            sub="3 critice · 5 înalt · 4 medii"
            color="var(--risk-medium)"
            trend={portfolioTrend.slice(-24).map((v, i) => 8 + (Math.sin(i * 0.7 + pulse) * 2))}
          />
          <MetricStrip
            label="Venituri agregate"
            value={`${(kpis.portfolioRevenue / 1000).toFixed(1)}B`}
            sub="RON · 4 trim. cumulat"
            color="var(--accent)"
            trend={portfolioTrend.slice(-24).map((v, i) => v * 30 + i * 1.2)}
          />
          <MetricStrip
            label="Falimente YTD"
            value="6"
            sub="sector industrial RO · -33% vs 2024"
            color="var(--fg-dim)"
            trend={[8, 7, 9, 6, 5, 7, 6, 4, 5, 6, 5, 6]}
          />
        </div>

        <div className="hero-watchlist">
          <div className="hero-watchlist-head">
            <span>WATCHLIST · TOP 3 RISC ÎNALT</span>
            <span className="hero-pulse-dot" />
          </div>
          <div className="hero-watchlist-rows">
            {top3HighRisk.map(c => {
              const rc = window.riskColor(c.riskClass);
              return (
                <div key={c.ticker} className="hero-wl-row" onClick={() => onClickTicker && onClickTicker(c)}>
                  <span className="hero-wl-ticker" style={{ borderColor: rc, color: rc }}>{c.ticker}</span>
                  <span className="hero-wl-name">{c.name}</span>
                  <span className="hero-wl-z" style={{ color: rc }}>Z {c.zscore.toFixed(2)}</span>
                  <span className="hero-wl-prob">P12 {c.prob12.toFixed(1)}%</span>
                  <div className="hero-wl-spark">
                    <Sparkline data={c.zTrend.slice(-24)} width={80} height={20} color={rc} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Right: Critical alerts column ── */}
      <section className="hero-right">
        <div className="hero-corner-tag" style={{ color: "var(--risk-critical)" }}>
          <span className="hero-corner-dot hero-corner-dot-critical" />
          ALERTE CRITICE
        </div>

        <div className="hero-alerts">
          {criticalAlerts.map(a => (
            <div key={a.id} className="hero-alert" onClick={() => {
              const c = companies.find(co => co.ticker === a.ticker);
              if (c && onClickTicker) onClickTicker(c);
            }}>
              <div className="hero-alert-bar" style={{ background: window.severityColor(a.severity) }}>
                <div className="hero-alert-pulse" />
              </div>
              <div className="hero-alert-content">
                <div className="hero-alert-head">
                  <span className="hero-alert-tk">{a.ticker}</span>
                  <span className="hero-alert-sev" style={{ color: window.severityColor(a.severity) }}>{a.severity.toUpperCase()}</span>
                </div>
                <div className="hero-alert-title">{a.title}</div>
                <div className="hero-alert-meta">{a.time}</div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

// ──────────────────── BigLiveChart — animated trend (replaces gauge) ────────────────────
function BigLiveChart({ value, trend, threshold, good }) {
  const POINTS = 36;
  const [data, setData] = useStateH(() => {
    if (trend && trend.length >= POINTS) return trend.slice(-POINTS);
    return Array.from({ length: POINTS }, (_, i) => 2.5 + Math.sin(i * 0.4) * 0.7 + Math.cos(i * 0.21) * 0.3);
  });
  const [drawProgress, setDrawProgress] = useStateH(0);

  // Entry draw left → right
  useEffectH(() => {
    let raf;
    const start = performance.now();
    const tick = (now) => {
      const t = Math.min(1, (now - start) / 1600);
      const eased = 1 - Math.pow(1 - t, 3);
      setDrawProgress(eased);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  // Live data update
  useEffectH(() => {
    const id = setInterval(() => {
      setData(d => {
        const last = d[d.length - 1];
        const drift = (Math.random() - 0.45) * 0.35;
        const next = Math.max(1.0, Math.min(5.5, last + drift));
        return [...d.slice(1), +next.toFixed(2)];
      });
    }, 1600);
    return () => clearInterval(id);
  }, []);

  const W = 340, H = 160, padL = 6, padR = 6, padT = 14, padB = 20;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;
  const min = 0.5, max = 6;
  const yAt = v => padT + innerH - ((v - min) / (max - min)) * innerH;
  const xAt = i => padL + (i / (POINTS - 1)) * innerW;

  const linePath = data.map((v, i) => `${i === 0 ? "M" : "L"}${xAt(i).toFixed(1)},${yAt(v).toFixed(1)}`).join(" ");
  const areaPath = `${linePath} L${xAt(POINTS - 1)},${H - padB} L${padL},${H - padB} Z`;

  const threshY = yAt(threshold);
  const goodY = yAt(good);

  const lastIdx = POINTS - 1;
  const lastX = xAt(lastIdx);
  const lastY = yAt(data[lastIdx]);
  const lastDelta = data[lastIdx] - data[lastIdx - 1];
  const lastColor = data[lastIdx] < threshold ? "var(--risk-critical)"
    : data[lastIdx] < good ? "var(--risk-medium)"
    : "var(--risk-low)";

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", maxWidth: 340, display: "block" }}>
      <defs>
        <linearGradient id="bigArea" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.4" />
          <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="bigLine" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stopColor="var(--risk-critical)" />
          <stop offset={`${((threshold - min) / (max - min)) * 100}%`} stopColor="var(--risk-high)" />
          <stop offset={`${((good - min) / (max - min)) * 100}%`} stopColor="var(--risk-medium)" />
          <stop offset="100%" stopColor="var(--risk-low)" />
        </linearGradient>
        <filter id="bigGlow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="2.2" result="b" />
          <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        <clipPath id="bigClip">
          <rect x={padL} y="0" width={innerW * drawProgress} height={H} />
        </clipPath>
      </defs>

      {/* horizontal grid */}
      {[1, 2, 3, 4, 5].map((v, i) => (
        <line key={i} x1={padL} x2={W - padR} y1={yAt(v)} y2={yAt(v)}
          stroke="var(--fg-faint)" strokeOpacity="0.12" strokeDasharray="2 4" />
      ))}

      {/* threshold (distress) band */}
      <rect x={padL} y={threshY} width={W - padL - padR} height={H - padB - threshY}
        fill="var(--risk-critical)" opacity="0.04" />

      {/* good band */}
      <rect x={padL} y={padT} width={W - padL - padR} height={goodY - padT}
        fill="var(--risk-low)" opacity="0.04" />

      {/* threshold lines */}
      <line x1={padL} x2={W - padR} y1={threshY} y2={threshY}
        stroke="var(--risk-critical)" strokeWidth="1" strokeDasharray="3 3" opacity="0.5" />
      <text x={W - padR - 4} y={threshY - 3} fontSize="9" fill="var(--risk-critical)" textAnchor="end"
        fontFamily="var(--font-mono)" opacity="0.85">distress {threshold}</text>

      <line x1={padL} x2={W - padR} y1={goodY} y2={goodY}
        stroke="var(--risk-low)" strokeWidth="1" strokeDasharray="3 3" opacity="0.45" />
      <text x={W - padR - 4} y={goodY - 3} fontSize="9" fill="var(--risk-low)" textAnchor="end"
        fontFamily="var(--font-mono)" opacity="0.85">sigur {good}</text>

      {/* area */}
      <g clipPath="url(#bigClip)">
        <path d={areaPath} fill="url(#bigArea)" style={{ transition: "d 1.4s cubic-bezier(0.4, 0, 0.2, 1)" }} />
      </g>

      {/* line with glow */}
      <g clipPath="url(#bigClip)" filter="url(#bigGlow)">
        <path d={linePath} fill="none" stroke="url(#bigLine)" strokeWidth="2.2"
          strokeLinejoin="round" strokeLinecap="round"
          style={{ transition: "d 1.4s cubic-bezier(0.4, 0, 0.2, 1)" }} />
      </g>

      {/* pulsing latest dot */}
      {drawProgress > 0.9 && (
        <g style={{ transition: "transform 1.4s ease" }}>
          <circle cx={lastX} cy={lastY} r="9" fill={lastColor} opacity="0.18">
            <animate attributeName="r" values="6;14;6" dur="2s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.4;0;0.4" dur="2s" repeatCount="indefinite" />
          </circle>
          <circle cx={lastX} cy={lastY} r="4" fill={lastColor} />
          <circle cx={lastX} cy={lastY} r="2" fill="var(--bg)" />
        </g>
      )}

      {/* x labels */}
      <text x={padL} y={H - 5} fontSize="9" fill="var(--fg-faint)"
        fontFamily="var(--font-mono)" textAnchor="start">M-36</text>
      <text x={W / 2} y={H - 5} fontSize="9" fill="var(--fg-faint)"
        fontFamily="var(--font-mono)" textAnchor="middle">M-18</text>
      <text x={W - padR} y={H - 5} fontSize="9" fill="var(--fg-faint)"
        fontFamily="var(--font-mono)" textAnchor="end">acum</text>
    </svg>
  );
}

// ──────────────────── BigGauge — large semicircle ────────────────────
function BigGauge({ value, min, max, threshold, good }) {
  const w = 220, h = 130;
  const cx = w / 2, cy = h - 10, r = 90;
  const t = Math.max(0, Math.min(1, (value - min) / (max - min)));
  const angle = Math.PI * t;
  const arc = (a0, a1) => {
    const x0 = cx + r * Math.cos(Math.PI + a0);
    const y0 = cy + r * Math.sin(Math.PI + a0);
    const x1 = cx + r * Math.cos(Math.PI + a1);
    const y1 = cy + r * Math.sin(Math.PI + a1);
    return `M${x0},${y0} A${r},${r} 0 0 1 ${x1},${y1}`;
  };
  const px = cx + r * Math.cos(Math.PI + angle);
  const py = cy + r * Math.sin(Math.PI + angle);
  const thAngle = Math.PI * ((threshold - min) / (max - min));
  const goAngle = Math.PI * ((good - min) / (max - min));

  return (
    <svg viewBox={`0 0 ${w} ${h}`} width={w} height={h} style={{ display: "block" }}>
      <defs>
        <linearGradient id="gaugeGradHero" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="var(--risk-critical)" />
          <stop offset={`${(threshold/max)*100}%`} stopColor="var(--risk-high)" />
          <stop offset={`${(good/max)*100}%`} stopColor="var(--risk-medium)" />
          <stop offset="100%" stopColor="var(--risk-low)" />
        </linearGradient>
        <filter id="gaugeGlow">
          <feGaussianBlur stdDeviation="2" result="blur"/>
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>
      {/* base track */}
      <path d={arc(0, Math.PI)} fill="none" stroke="var(--fg-faint)" strokeWidth="12" opacity="0.15" />
      {/* gradient arc */}
      <path d={arc(0, Math.PI)} fill="none" stroke="url(#gaugeGradHero)" strokeWidth="12" opacity="0.55" />
      {/* progress arc */}
      <path d={arc(0, angle)} fill="none" stroke="url(#gaugeGradHero)" strokeWidth="12" filter="url(#gaugeGlow)" />
      {/* threshold tick */}
      <line
        x1={cx + (r - 14) * Math.cos(Math.PI + thAngle)} y1={cy + (r - 14) * Math.sin(Math.PI + thAngle)}
        x2={cx + (r + 14) * Math.cos(Math.PI + thAngle)} y2={cy + (r + 14) * Math.sin(Math.PI + thAngle)}
        stroke="var(--risk-critical)" strokeWidth="2" />
      <text x={cx + (r + 20) * Math.cos(Math.PI + thAngle)} y={cy + (r + 20) * Math.sin(Math.PI + thAngle) + 4}
        fontSize="9" fontFamily="var(--font-mono)" fill="var(--risk-critical)" textAnchor="middle">{threshold}</text>
      {/* good tick */}
      <line
        x1={cx + (r - 14) * Math.cos(Math.PI + goAngle)} y1={cy + (r - 14) * Math.sin(Math.PI + goAngle)}
        x2={cx + (r + 14) * Math.cos(Math.PI + goAngle)} y2={cy + (r + 14) * Math.sin(Math.PI + goAngle)}
        stroke="var(--risk-low)" strokeWidth="2" />
      <text x={cx + (r + 20) * Math.cos(Math.PI + goAngle)} y={cy + (r + 20) * Math.sin(Math.PI + goAngle) + 4}
        fontSize="9" fontFamily="var(--font-mono)" fill="var(--risk-low)" textAnchor="middle">{good}</text>
      {/* needle */}
      <line x1={cx} y1={cy} x2={px} y2={py} stroke="var(--fg)" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx={cx} cy={cy} r="6" fill="var(--bg)" stroke="var(--fg)" strokeWidth="2" />
      <circle cx={cx} cy={cy} r="3" fill="var(--accent)" />
    </svg>
  );
}

// ──────────────────── MetricStrip ────────────────────
function MetricStrip({ label, value, sub, color, trend, tone }) {
  return (
    <div className={"metric-strip" + (tone === "warning" ? " metric-strip-warning" : "")}>
      <div className="metric-strip-left">
        <div className="metric-strip-label">{label}</div>
        <div className="metric-strip-value" style={{ color: color || "var(--fg)" }}>{value}</div>
        <div className="metric-strip-sub">{sub}</div>
      </div>
      <div className="metric-strip-right">
        <Sparkline data={trend} width={120} height={40} color={color || "var(--accent)"} strokeWidth={2} />
      </div>
    </div>
  );
}

Object.assign(window, { HeroCommandBridge });
