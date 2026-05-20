// BankruptIQ — chart primitives in SVG with hover tooltips

const { useState, useRef, useEffect, useMemo } = React;

// ---------- Sparkline (small inline trend) ----------
function Sparkline({ data, width = 80, height = 24, color = "currentColor", showArea = true, strokeWidth = 1.5 }) {
  if (!data || data.length === 0) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const stepX = width / (data.length - 1);
  const points = data.map((v, i) => [i * stepX, height - ((v - min) / range) * (height - 4) - 2]);
  const path = points.map((p, i) => `${i === 0 ? "M" : "L"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");
  const areaPath = `${path} L${width},${height} L0,${height} Z`;
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ display: "block", overflow: "visible" }}>
      {showArea && <path d={areaPath} fill={color} opacity="0.12" />}
      <path d={path} fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

// ---------- Line chart with hover ----------
function LineChart({ series, width = 600, height = 220, padding = { t: 16, r: 20, b: 32, l: 44 }, yLabel, colors = ["#22c55e", "#f59e0b", "#ef4444"], gridColor = "rgba(255,255,255,0.06)", textColor = "currentColor", xLabels, yMin, yMax, threshold }) {
  const [hover, setHover] = useState(null);
  const ref = useRef(null);

  const allValues = series.flatMap(s => s.data);
  const min = yMin !== undefined ? yMin : Math.floor(Math.min(...allValues));
  const max = yMax !== undefined ? yMax : Math.ceil(Math.max(...allValues));
  const range = max - min || 1;

  const innerW = width - padding.l - padding.r;
  const innerH = height - padding.t - padding.b;
  const len = series[0]?.data.length || 0;
  const stepX = innerW / (len - 1);

  const yAt = v => padding.t + innerH - ((v - min) / range) * innerH;
  const xAt = i => padding.l + i * stepX;

  // 5 y ticks
  const yTicks = [];
  for (let i = 0; i <= 4; i++) {
    const v = min + (range * i) / 4;
    yTicks.push(v);
  }

  function handleMove(e) {
    const rect = ref.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * width - padding.l;
    const idx = Math.max(0, Math.min(len - 1, Math.round(x / stepX)));
    setHover(idx);
  }

  return (
    <svg ref={ref} viewBox={`0 0 ${width} ${height}`} width="100%" height={height}
      onMouseMove={handleMove} onMouseLeave={() => setHover(null)}
      style={{ display: "block", color: textColor, fontFamily: "var(--font-mono, monospace)" }}>
      {/* y grid */}
      {yTicks.map((v, i) => (
        <g key={i}>
          <line x1={padding.l} x2={width - padding.r} y1={yAt(v)} y2={yAt(v)} stroke={gridColor} strokeWidth="1" />
          <text x={padding.l - 8} y={yAt(v) + 3} fontSize="10" fill="currentColor" opacity="0.5" textAnchor="end">{v.toFixed(1)}</text>
        </g>
      ))}
      {/* threshold line */}
      {threshold !== undefined && (
        <g>
          <line x1={padding.l} x2={width - padding.r} y1={yAt(threshold)} y2={yAt(threshold)} stroke="#ef4444" strokeWidth="1" strokeDasharray="3 3" opacity="0.6" />
          <text x={width - padding.r - 4} y={yAt(threshold) - 4} fontSize="9" fill="#ef4444" textAnchor="end" opacity="0.8">prag {threshold}</text>
        </g>
      )}
      {/* x labels */}
      {xLabels && xLabels.map((lbl, i) => i % Math.ceil(len / 6) === 0 && (
        <text key={i} x={xAt(i)} y={height - padding.b + 16} fontSize="10" fill="currentColor" opacity="0.5" textAnchor="middle">{lbl}</text>
      ))}
      {/* lines */}
      {series.map((s, si) => {
        const path = s.data.map((v, i) => `${i === 0 ? "M" : "L"}${xAt(i)},${yAt(v)}`).join(" ");
        const color = s.color || colors[si % colors.length];
        return (
          <g key={si}>
            <path d={path} fill="none" stroke={color} strokeWidth="1.8" strokeLinejoin="round" />
          </g>
        );
      })}
      {/* hover guide */}
      {hover !== null && (
        <g>
          <line x1={xAt(hover)} x2={xAt(hover)} y1={padding.t} y2={height - padding.b} stroke="currentColor" opacity="0.3" strokeWidth="1" />
          {series.map((s, si) => {
            const color = s.color || colors[si % colors.length];
            return <circle key={si} cx={xAt(hover)} cy={yAt(s.data[hover])} r="3.5" fill={color} stroke="var(--bg, white)" strokeWidth="1.5" />;
          })}
          {/* tooltip */}
          <g transform={`translate(${Math.min(xAt(hover) + 8, width - 140)}, ${padding.t + 4})`}>
            <rect width="130" height={20 + series.length * 14} rx="4" fill="var(--bg-elev, #1a1a1a)" stroke="currentColor" strokeOpacity="0.15" />
            <text x="8" y="14" fontSize="10" fill="currentColor" opacity="0.6">{xLabels?.[hover] || `t=${hover}`}</text>
            {series.map((s, si) => {
              const color = s.color || colors[si % colors.length];
              return (
                <g key={si} transform={`translate(8, ${24 + si * 14})`}>
                  <rect width="8" height="2" y="4" fill={color} />
                  <text x="14" y="8" fontSize="10" fill="currentColor">{s.label}</text>
                  <text x="122" y="8" fontSize="10" fill="currentColor" textAnchor="end" fontWeight="600">{s.data[hover].toFixed(2)}</text>
                </g>
              );
            })}
          </g>
        </g>
      )}
    </svg>
  );
}

// ---------- Donut chart ----------
function Donut({ segments, size = 160, thickness = 22, label, sublabel, textColor = "currentColor" }) {
  const total = segments.reduce((a, s) => a + s.value, 0);
  const r = size / 2 - thickness / 2;
  const cx = size / 2;
  const cy = size / 2;
  let acc = 0;
  const circ = 2 * Math.PI * r;
  return (
    <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} style={{ color: textColor }}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="currentColor" strokeOpacity="0.08" strokeWidth={thickness} />
      {segments.map((s, i) => {
        const len = (s.value / total) * circ;
        const offset = (acc / total) * circ;
        acc += s.value;
        return (
          <circle key={i} cx={cx} cy={cy} r={r} fill="none" stroke={s.color} strokeWidth={thickness}
            strokeDasharray={`${len} ${circ - len}`} strokeDashoffset={-offset}
            transform={`rotate(-90 ${cx} ${cy})`} strokeLinecap="butt" />
        );
      })}
      {label && <text x={cx} y={cy - 2} fontSize="22" fontWeight="700" fill="currentColor" textAnchor="middle">{label}</text>}
      {sublabel && <text x={cx} y={cy + 14} fontSize="10" fill="currentColor" opacity="0.5" textAnchor="middle" style={{ textTransform: "uppercase", letterSpacing: "0.08em" }}>{sublabel}</text>}
    </svg>
  );
}

// ---------- Horizontal bar chart ----------
function HBarChart({ data, height = 22, gap = 6, labelW = 80, valueW = 50, colorFn, textColor = "currentColor" }) {
  const max = Math.max(...data.map(d => d.value));
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: gap, color: textColor, fontFamily: "var(--font-mono)" }}>
      {data.map((d, i) => {
        const w = (d.value / max) * 100;
        const color = colorFn ? colorFn(d) : (d.color || "currentColor");
        return (
          <div key={i} style={{ display: "grid", gridTemplateColumns: `${labelW}px 1fr ${valueW}px`, alignItems: "center", gap: 8, fontSize: 11 }}>
            <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", opacity: 0.85 }}>{d.label}</div>
            <div style={{ height: height, background: "currentColor", opacity: 0.06, position: "relative", borderRadius: 2 }}>
              <div style={{ width: `${w}%`, height: "100%", background: color, borderRadius: 2, transition: "width 300ms" }} />
            </div>
            <div style={{ textAlign: "right", fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{d.display ?? d.value.toFixed(2)}</div>
          </div>
        );
      })}
    </div>
  );
}

// ---------- Vertical bar chart ----------
function VBarChart({ data, width = 600, height = 180, padding = { t: 16, r: 16, b: 28, l: 36 }, colorFn, threshold }) {
  const max = Math.max(...data.map(d => d.value));
  const min = Math.min(0, ...data.map(d => d.value));
  const range = max - min || 1;
  const innerW = width - padding.l - padding.r;
  const innerH = height - padding.t - padding.b;
  const barW = (innerW / data.length) * 0.7;
  const gap = (innerW / data.length) * 0.3;
  const yAt = v => padding.t + innerH - ((v - min) / range) * innerH;
  const [hover, setHover] = useState(null);
  return (
    <svg viewBox={`0 0 ${width} ${height}`} width="100%" height={height} style={{ display: "block", fontFamily: "var(--font-mono)" }}>
      {[0, 0.25, 0.5, 0.75, 1].map((t, i) => {
        const v = min + range * t;
        return (
          <g key={i}>
            <line x1={padding.l} x2={width - padding.r} y1={yAt(v)} y2={yAt(v)} stroke="currentColor" strokeOpacity="0.06" />
            <text x={padding.l - 6} y={yAt(v) + 3} fontSize="9" textAnchor="end" fill="currentColor" opacity="0.5">{v.toFixed(1)}</text>
          </g>
        );
      })}
      {threshold !== undefined && (
        <line x1={padding.l} x2={width - padding.r} y1={yAt(threshold)} y2={yAt(threshold)} stroke="#ef4444" strokeDasharray="3 3" opacity="0.5" />
      )}
      {data.map((d, i) => {
        const x = padding.l + i * (innerW / data.length) + gap / 2;
        const y = yAt(d.value);
        const h = yAt(min) - y;
        const color = colorFn ? colorFn(d) : (d.color || "currentColor");
        return (
          <g key={i} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} style={{ cursor: "pointer" }}>
            <rect x={x} y={y} width={barW} height={Math.abs(h)} fill={color} opacity={hover === null || hover === i ? 1 : 0.4} rx="1" />
            <text x={x + barW / 2} y={height - padding.b + 14} fontSize="10" textAnchor="middle" fill="currentColor" opacity="0.7">{d.label}</text>
            {hover === i && (
              <text x={x + barW / 2} y={y - 4} fontSize="10" textAnchor="middle" fill="currentColor" fontWeight="700">{d.value.toFixed(2)}</text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

// ---------- Gauge ----------
function Gauge({ value, min = 0, max = 10, thresholds, size = 140, label, sublabel }) {
  // semicircle gauge
  const angle = Math.PI * Math.max(0, Math.min(1, (value - min) / (max - min)));
  const cx = size / 2;
  const cy = size * 0.62;
  const r = size * 0.42;
  const segs = thresholds || [
    { to: 0.3, color: "#ef4444" },
    { to: 0.6, color: "#f59e0b" },
    { to: 1.0, color: "#22c55e" },
  ];
  const arc = (a0, a1) => {
    const x0 = cx + r * Math.cos(Math.PI + a0);
    const y0 = cy + r * Math.sin(Math.PI + a0);
    const x1 = cx + r * Math.cos(Math.PI + a1);
    const y1 = cy + r * Math.sin(Math.PI + a1);
    return `M${x0},${y0} A${r},${r} 0 0 1 ${x1},${y1}`;
  };
  const px = cx + r * Math.cos(Math.PI + angle);
  const py = cy + r * Math.sin(Math.PI + angle);
  return (
    <svg viewBox={`0 0 ${size} ${size * 0.78}`} width={size} height={size * 0.78}>
      {/* base */}
      {segs.map((s, i) => {
        const a0 = (i === 0 ? 0 : segs[i - 1].to) * Math.PI;
        const a1 = s.to * Math.PI;
        return <path key={i} d={arc(a0, a1)} fill="none" stroke={s.color} strokeWidth="10" opacity="0.25" />;
      })}
      {/* active */}
      <path d={arc(0, angle)} fill="none" stroke="currentColor" strokeWidth="10" />
      {/* needle */}
      <circle cx={cx} cy={cy} r="4" fill="currentColor" />
      <line x1={cx} y1={cy} x2={px} y2={py} stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      {label && <text x={cx} y={cy + 22} fontSize="18" fontWeight="700" fill="currentColor" textAnchor="middle">{label}</text>}
      {sublabel && <text x={cx} y={cy + 36} fontSize="9" fill="currentColor" opacity="0.5" textAnchor="middle" style={{ textTransform: "uppercase", letterSpacing: "0.1em" }}>{sublabel}</text>}
    </svg>
  );
}

// ---------- Heatmap matrix ----------
function HeatmapMatrix({ rows, cols, values, colorScale = ["#16a34a", "#facc15", "#ef4444"] }) {
  // values is 2D array [row][col] of 0..1
  const cellH = 22;
  return (
    <div style={{ display: "grid", gridTemplateColumns: `100px repeat(${cols.length}, 1fr)`, gap: 2, fontFamily: "var(--font-mono)", fontSize: 10 }}>
      <div></div>
      {cols.map((c, i) => <div key={i} style={{ textAlign: "center", opacity: 0.5, paddingBottom: 4 }}>{c}</div>)}
      {rows.map((r, ri) => (
        <React.Fragment key={ri}>
          <div style={{ height: cellH, display: "flex", alignItems: "center", opacity: 0.8, fontSize: 11 }}>{r}</div>
          {cols.map((_, ci) => {
            const v = values[ri][ci];
            // interpolate
            const i = v * (colorScale.length - 1);
            const lo = Math.floor(i);
            const hi = Math.min(colorScale.length - 1, lo + 1);
            const t = i - lo;
            return (
              <div key={ci} style={{ height: cellH, background: colorScale[lo], opacity: 0.3 + 0.7 * v, display: "flex", alignItems: "center", justifyContent: "center", color: v > 0.5 ? "white" : "currentColor", fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
                {(v * 10).toFixed(1)}
              </div>
            );
          })}
        </React.Fragment>
      ))}
    </div>
  );
}

Object.assign(window, { Sparkline, LineChart, Donut, HBarChart, VBarChart, Gauge, HeatmapMatrix });
