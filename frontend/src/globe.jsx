// BankruptIQ — Interactive 3D-projected Globe of Companies

const { useState: useStateG, useEffect: useEffectG, useRef: useRefG, useMemo: useMemoG } = React;

function CompaniesGlobe({ companies, onSelectCompany }) {
  const [rotation, setRotation] = useStateG(0);
  const [hoveredIdx, setHoveredIdx] = useStateG(null);
  const [paused, setPaused] = useStateG(false);
  const [filter, setFilter] = useStateG("all"); // all / low / medium / high
  const requestRef = useRefG();
  const lastTimeRef = useRefG(0);

  // Auto-rotate
  useEffectG(() => {
    const animate = (time) => {
      if (!lastTimeRef.current) lastTimeRef.current = time;
      const dt = time - lastTimeRef.current;
      lastTimeRef.current = time;
      if (!paused) {
        setRotation(r => (r + dt * 0.00015) % (Math.PI * 2));
      }
      requestRef.current = requestAnimationFrame(animate);
    };
    requestRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(requestRef.current);
  }, [paused]);

  const filtered = companies.filter(c => filter === "all" || c.riskClass === filter);

  const SIZE = 540;
  const cx = SIZE / 2;
  const cy = SIZE / 2;
  const radius = 200;

  // Compute positions using fibonacci sphere
  const points = useMemoG(() => {
    return companies.map((c, i) => {
      const phi = Math.acos(1 - 2 * (i + 0.5) / companies.length);
      const theta = Math.PI * (1 + Math.sqrt(5)) * (i + 0.5);
      return { c, phi, theta, baseIdx: i };
    });
  }, [companies]);

  // Project points to 2D with current rotation
  const projected = points.map((p) => {
    const x = radius * Math.sin(p.phi) * Math.cos(p.theta + rotation);
    const y = radius * Math.cos(p.phi);
    const z = radius * Math.sin(p.phi) * Math.sin(p.theta + rotation);
    return {
      ...p,
      px: cx + x,
      py: cy + y * 0.95, // slight squish
      z,
      depth: (z + radius) / (2 * radius), // 0 = back, 1 = front
      visible: filter === "all" || p.c.riskClass === filter,
    };
  }).sort((a, b) => a.z - b.z);

  const hovered = hoveredIdx !== null ? projected.find(p => p.baseIdx === hoveredIdx) : null;

  // Risk counts for stats
  const counts = { all: companies.length, low: 0, medium: 0, high: 0 };
  companies.forEach(c => counts[c.riskClass]++);

  return (
    <div className="globe-wrap" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
      <div className="globe-head">
        <div>
          <h3 className="globe-title">Constelația companiilor</h3>
          <p className="globe-sub">{filtered.length} companii · poziționate pe sferă · click pentru detalii · {paused ? "pauză" : "auto-rotire"}</p>
        </div>
        <div className="globe-filter">
          {[
            { k: "all", l: "Toate", c: "var(--fg-dim)" },
            { k: "low", l: "Scăzut", c: "var(--risk-low)" },
            { k: "medium", l: "Mediu", c: "var(--risk-medium)" },
            { k: "high", l: "Înalt", c: "var(--risk-high)" },
          ].map(it => (
            <button key={it.k} className={"globe-fbtn" + (filter === it.k ? " active" : "")}
              onClick={() => setFilter(it.k)}>
              <span className="globe-fdot" style={{ background: it.c }} />
              {it.l}
              <span className="globe-fcount">{counts[it.k]}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="globe-stage">
        {/* Ambient glow behind sphere */}
        <div className="globe-ambient" />

        <svg viewBox={`0 0 ${SIZE} ${SIZE}`} width={SIZE} height={SIZE} className="globe-svg">
          <defs>
            <radialGradient id="globeCore" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.5" />
              <stop offset="55%" stopColor="var(--accent)" stopOpacity="0.08" />
              <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
            </radialGradient>
            <radialGradient id="globeSphere" cx="35%" cy="35%" r="65%">
              <stop offset="0%" stopColor="rgba(124,138,255,0.12)" />
              <stop offset="60%" stopColor="rgba(124,138,255,0.04)" />
              <stop offset="100%" stopColor="rgba(124,138,255,0.02)" />
            </radialGradient>
            <filter id="globeGlow">
              <feGaussianBlur stdDeviation="2" result="b" />
              <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
            <filter id="globeBigGlow">
              <feGaussianBlur stdDeviation="6" result="b" />
              <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          </defs>

          {/* Outer glow */}
          <circle cx={cx} cy={cy} r={radius * 1.35} fill="url(#globeCore)" />

          {/* Sphere base */}
          <circle cx={cx} cy={cy} r={radius} fill="url(#globeSphere)" />

          {/* Latitude rings (3) */}
          {[-0.6, -0.3, 0, 0.3, 0.6].map((lat, i) => {
            const ry = radius * 0.16 * Math.cos(lat);
            const cyL = cy + radius * Math.sin(lat) * 0.95;
            return (
              <ellipse key={`lat${i}`} cx={cx} cy={cyL} rx={radius * Math.cos(lat)} ry={ry}
                fill="none" stroke="rgba(124,138,255,0.12)" strokeWidth="0.8" />
            );
          })}

          {/* Longitude meridians — rotate with globe */}
          {[0, 1, 2, 3, 4, 5].map(i => {
            const angle = (i / 6) * Math.PI + rotation * 0.5;
            const rx = radius * Math.abs(Math.cos(angle));
            const opacity = 0.05 + Math.abs(Math.sin(angle)) * 0.15;
            return (
              <ellipse key={`lon${i}`} cx={cx} cy={cy} rx={rx} ry={radius}
                fill="none" stroke="rgba(124,138,255,1)" strokeOpacity={opacity} strokeWidth="0.8" />
            );
          })}

          {/* Sphere outline */}
          <circle cx={cx} cy={cy} r={radius}
            fill="none" stroke="rgba(124,138,255,0.3)" strokeWidth="1" />

          {/* Connection lines from center to high-risk dots (front-facing) */}
          {projected.filter(p => p.visible && p.c.riskClass === "high" && p.z > -50).map(p => (
            <line key={`cl${p.baseIdx}`} x1={cx} y1={cy} x2={p.px} y2={p.py}
              stroke="var(--risk-high)" strokeWidth="0.6"
              opacity={Math.max(0.1, p.depth * 0.4)} />
          ))}

          {/* Company dots */}
          {projected.map(p => {
            if (!p.visible) {
              // dim grey
              return (
                <circle key={`g${p.baseIdx}`} cx={p.px} cy={p.py} r={1.5}
                  fill="var(--fg-faint)" opacity={0.2 * p.depth + 0.05} />
              );
            }
            const risk = p.c.riskClass;
            const color = risk === "high" ? "var(--risk-high)"
              : risk === "medium" ? "var(--risk-medium)"
              : "var(--risk-low)";
            const baseR = 3 + p.depth * 3;
            const isHover = hoveredIdx === p.baseIdx;
            const r = isHover ? baseR + 3 : baseR;
            return (
              <g key={`dot${p.baseIdx}`}
                onMouseEnter={() => setHoveredIdx(p.baseIdx)}
                onMouseLeave={() => setHoveredIdx(h => h === p.baseIdx ? null : h)}
                onClick={() => onSelectCompany && onSelectCompany(p.c)}
                style={{ cursor: "pointer" }}>
                <circle cx={p.px} cy={p.py} r={r + 6}
                  fill={color} opacity={isHover ? 0.3 : 0.15 * p.depth}
                  filter="url(#globeBigGlow)" />
                <circle cx={p.px} cy={p.py} r={r}
                  fill={color}
                  opacity={0.4 + p.depth * 0.6} />
                <circle cx={p.px} cy={p.py} r={Math.max(1, r * 0.4)}
                  fill="white" opacity={p.depth * 0.6} />
                {/* high-risk warning ring (always visible) */}
                {risk === "high" && (
                  <circle cx={p.px} cy={p.py} r={r + 4}
                    fill="none" stroke={color} strokeWidth="1" opacity={0.4 + p.depth * 0.4}>
                    <animate attributeName="r" values={`${r + 4};${r + 10};${r + 4}`} dur="2s" repeatCount="indefinite" />
                    <animate attributeName="opacity" values="0.6;0;0.6" dur="2s" repeatCount="indefinite" />
                  </circle>
                )}
                {/* ticker label for front-facing or hovered */}
                {(isHover || p.depth > 0.85) && p.visible && (
                  <text x={p.px} y={p.py - r - 6}
                    fontSize={isHover ? 11 : 9}
                    fontFamily="var(--font-mono)" fontWeight="700"
                    fill="var(--fg)" textAnchor="middle"
                    opacity={isHover ? 1 : p.depth}
                    style={{ pointerEvents: "none" }}>
                    {p.c.ticker}
                  </text>
                )}
              </g>
            );
          })}

          {/* Central core */}
          <circle cx={cx} cy={cy} r={5} fill="var(--accent)" filter="url(#globeGlow)" />
          <circle cx={cx} cy={cy} r={2} fill="white" />

          {/* Crosshair guides */}
          <line x1={cx - radius - 20} y1={cy} x2={cx - radius - 5} y2={cy}
            stroke="var(--fg-faint)" strokeWidth="0.5" opacity="0.5" />
          <line x1={cx + radius + 5} y1={cy} x2={cx + radius + 20} y2={cy}
            stroke="var(--fg-faint)" strokeWidth="0.5" opacity="0.5" />
          <line x1={cx} y1={cy - radius - 20} x2={cx} y2={cy - radius - 5}
            stroke="var(--fg-faint)" strokeWidth="0.5" opacity="0.5" />
          <line x1={cx} y1={cy + radius + 5} x2={cx} y2={cy + radius + 20}
            stroke="var(--fg-faint)" strokeWidth="0.5" opacity="0.5" />
        </svg>

        {/* Hover tooltip */}
        {hovered && hovered.visible && (
          <div className="globe-tooltip" style={{
            left: hovered.px + 16,
            top: hovered.py - 12,
            transform: hovered.px > SIZE * 0.7 ? "translateX(-100%) translateX(-32px)" : "none",
          }}>
            <div className="gtt-ticker" style={{ color: window.riskColor(hovered.c.riskClass) }}>{hovered.c.ticker}</div>
            <div className="gtt-name">{hovered.c.name}</div>
            <div className="gtt-grid">
              <div><span className="gtt-lbl">Z</span><span className="gtt-val">{hovered.c.zscore.toFixed(2)}</span></div>
              <div><span className="gtt-lbl">P12L</span><span className="gtt-val">{hovered.c.prob12.toFixed(1)}%</span></div>
              <div><span className="gtt-lbl">ROE</span><span className="gtt-val">{hovered.c.roe.toFixed(1)}%</span></div>
              <div><span className="gtt-lbl">Lev</span><span className="gtt-val">{hovered.c.leverage.toFixed(2)}x</span></div>
            </div>
            <div className="gtt-hint">click pentru detalii →</div>
          </div>
        )}

        {/* Side panel: legend */}
        <div className="globe-side globe-side-left">
          <div className="globe-side-label">RISC</div>
          <div className="globe-legend-row">
            <span className="globe-legend-dot" style={{ background: "var(--risk-low)" }} />
            <span className="globe-legend-name">Scăzut</span>
            <span className="globe-legend-num">{counts.low}</span>
          </div>
          <div className="globe-legend-row">
            <span className="globe-legend-dot" style={{ background: "var(--risk-medium)" }} />
            <span className="globe-legend-name">Mediu</span>
            <span className="globe-legend-num">{counts.medium}</span>
          </div>
          <div className="globe-legend-row">
            <span className="globe-legend-dot" style={{ background: "var(--risk-high)" }} />
            <span className="globe-legend-name">Înalt</span>
            <span className="globe-legend-num">{counts.high}</span>
          </div>
        </div>

        <div className="globe-side globe-side-right">
          <div className="globe-side-label">{paused ? "// PAUZĂ" : "// ROTIRE"}</div>
          <div className="globe-coord">
            <span className="gc-lbl">θ</span>
            <span className="gc-val">{(rotation * 180 / Math.PI).toFixed(1)}°</span>
          </div>
          <div className="globe-coord">
            <span className="gc-lbl">N</span>
            <span className="gc-val">{filtered.length}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { CompaniesGlobe });
