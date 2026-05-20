// BankruptIQ — Loading screen v2 (100 companies max)

const { useState: useStateL, useEffect: useEffectL, useRef: useRefL } = React;

const GLOBE_LIMIT = 100;

function LoadingScreen({ onComplete }) {
  const [progress, setProgress] = useStateL(0);
  const [statusIdx, setStatusIdx] = useStateL(0);
  const [done, setDone] = useStateL(false);

  // Folosim GLOBE_COMPANIES (100) sau primele 100 din COMPANIES ca fallback
  const allC = (window.BIQ_DATA.GLOBE_COMPANIES || window.BIQ_DATA.COMPANIES || []);
  const COMPANIES = allC.length > GLOBE_LIMIT
    ? allC.slice(0, GLOBE_LIMIT)
    : allC;

  const statusMessages = [
    "Inițializare motor de risc",
    "Conectare la feed BVB",
    "Sincronizare 18 companii",
    "Încărcare istoric 60 luni",
    "Calibrare Altman Z-Score",
    "Antrenare ML ensemble",
    "Detectare anomalii portofoliu",
    "Generare globe interactiv",
    "Pregătire dashboard",
  ];

  useEffectL(() => {
    const interval = setInterval(() => {
      setStatusIdx(i => (i + 1) % statusMessages.length);
    }, 420);
    return () => clearInterval(interval);
  }, []);

  useEffectL(() => {
    const start = performance.now();
    const dur = 3800;
    let raf;
    const tick = (now) => {
      const t = Math.min(1, (now - start) / dur);
      setProgress(t);
      if (t >= 1) {
        setDone(true);
        setTimeout(() => onComplete && onComplete(), 700);
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  // Companiile care au "ajuns" pe glob până la momentul curent
  const visibleCompanies = Math.min(COMPANIES.length, Math.floor(progress * COMPANIES.length) + 1);

  return (
    <div className={"loading-root2" + (done ? " loading-exit2" : "")}>
      {/* ambient glow */}
      <div className="load2-ambient" />
      {/* subtle grid */}
      <div className="load2-grid" />

      {/* Tag */}
      <div className="load2-tag">
        <span className="load2-tag-dot" />
        v2.4 · risk engine boot
      </div>

      {/* Brand wordmark */}
      <h1 className="load2-wordmark">
        {"BankruptIQ".split("").map((c, i) => (
          <span key={i} className="load2-letter" style={{ animationDelay: `${100 + i * 60}ms` }}>{c}</span>
        ))}
      </h1>

      {/* Subtitle */}
      <p className="load2-sub">
        {"Analiză predictivă · companii BVB".split(" ").map((w, i) => (
          <span key={i} className="load2-subword" style={{ animationDelay: `${800 + i * 80}ms` }}>{w} </span>
        ))}
      </p>

      {/* Globe forming animation */}
      <div className="load2-globe-wrap">
        <LoadingGlobe progress={progress} companies={COMPANIES.slice(0, visibleCompanies)} visibleCount={visibleCompanies} />
      </div>

      {/* Status + progress */}
      <div className="load2-status">
        <span className="load2-status-dot" />
        <span className="load2-status-text">{statusMessages[statusIdx]}<span className="load2-blink">_</span></span>
      </div>

      <div className="load2-progress">
        <div className="load2-progress-track">
          <div className="load2-progress-fill" style={{ width: `${progress * 100}%` }} />
        </div>
        <div className="load2-progress-num">
          <span>{Math.round(progress * 100).toString().padStart(2, "0")}</span>
          <span className="load2-progress-pct">%</span>
        </div>
      </div>

      {/* Counter row */}
      <div className="load2-counters">
        <div className="load2-counter">
          <div className="load2-counter-val">{visibleCompanies}<span className="load2-counter-tot">/{GLOBE_LIMIT}</span></div>
          <div className="load2-counter-lbl">COMPANII ÎNCĂRCATE</div>
        </div>
        <div className="load2-counter-sep" />
        <div className="load2-counter">
          <div className="load2-counter-val">{Math.round(progress * 60)}<span className="load2-counter-tot">/60</span></div>
          <div className="load2-counter-lbl">LUNI ISTORIC</div>
        </div>
        <div className="load2-counter-sep" />
        <div className="load2-counter">
          <div className="load2-counter-val">{Math.round(progress * 47)}<span className="load2-counter-tot">/47</span></div>
          <div className="load2-counter-lbl">FEATURES ML</div>
        </div>
      </div>

      <button className="load2-skip" onClick={() => { setDone(true); setTimeout(() => onComplete && onComplete(), 300); }}>
        Skip →
      </button>
    </div>
  );
}

// Globe forming animation: companies converge from edges into spherical layout
function LoadingGlobe({ progress, companies, visibleCount }) {
  const size = 320;
  const cx = size / 2;
  const cy = size / 2;
  const r = 120;

  // Position each company on a 3D sphere using fibonacci spiral, project to 2D
  const points = companies.map((c, i) => {
    const phi = Math.acos(1 - 2 * (i + 0.5) / companies.length);
    const theta = Math.PI * (1 + Math.sqrt(5)) * (i + 0.5);
    // Rotation based on progress
    const rotY = progress * Math.PI * 1.5;
    const x = r * Math.sin(phi) * Math.cos(theta + rotY);
    const y = r * Math.cos(phi);
    const z = r * Math.sin(phi) * Math.sin(theta + rotY);
    // Project (simple orthographic)
    const px = cx + x;
    const py = cy + y;
    // depth scale: front (z>0) bigger, back smaller
    const depthT = (z + r) / (2 * r); // 0..1
    return { c, px, py, z, depthT, idx: i };
  }).sort((a, b) => a.z - b.z); // back to front

  // For converging effect: each company starts at random edge, converges over time
  const animatedPoints = points.map((p, i) => {
    const startAngle = (p.idx * 137.5 * Math.PI) / 180; // golden angle for distribution
    const startDist = size * 0.8;
    const startX = cx + Math.cos(startAngle) * startDist;
    const startY = cy + Math.sin(startAngle) * startDist;
    // When this company "arrives": staggered
    const arriveAt = (p.idx + 1) / companies.length;
    const t = Math.max(0, Math.min(1, (progress - arriveAt * 0.7) / 0.3));
    const eased = 1 - Math.pow(1 - t, 3);
    const px = startX + (p.px - startX) * eased;
    const py = startY + (p.py - startY) * eased;
    return { ...p, px, py, t: eased };
  });

  return (
    <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} className="load2-globe">
      <defs>
        <radialGradient id="lgCore" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#7c8aff" stopOpacity="0.6" />
          <stop offset="50%" stopColor="#7c8aff" stopOpacity="0.1" />
          <stop offset="100%" stopColor="#7c8aff" stopOpacity="0" />
        </radialGradient>
        <filter id="lgGlow">
          <feGaussianBlur stdDeviation="1.5" result="b" />
          <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>

      {/* core glow */}
      <circle cx={cx} cy={cy} r={r * 1.2} fill="url(#lgCore)" />

      {/* equator ring */}
      <ellipse cx={cx} cy={cy} rx={r} ry={r * 0.18}
        fill="none" stroke="rgba(124,138,255,0.25)" strokeWidth="1"
        transform={`rotate(${progress * 360} ${cx} ${cy})`} />
      {/* meridian rings */}
      <ellipse cx={cx} cy={cy} rx={r * 0.4} ry={r}
        fill="none" stroke="rgba(124,138,255,0.2)" strokeWidth="1" />
      <ellipse cx={cx} cy={cy} rx={r * 0.7} ry={r}
        fill="none" stroke="rgba(124,138,255,0.12)" strokeWidth="1" />
      <ellipse cx={cx} cy={cy} rx={r} ry={r * 0.4}
        fill="none" stroke="rgba(124,138,255,0.12)" strokeWidth="1" />

      {/* sphere outline */}
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(124,138,255,0.35)" strokeWidth="1" />

      {/* connection lines (front-facing) */}
      {animatedPoints.filter(p => p.t > 0.3 && p.z > 0).map((p, i) => (
        <line key={`l${p.idx}`} x1={cx} y1={cy} x2={p.px} y2={p.py}
          stroke="rgba(124,138,255,0.15)" strokeWidth="0.5"
          opacity={p.t * 0.6} />
      ))}

      {/* dots */}
      {animatedPoints.map((p, i) => {
        const risk = p.c.riskClass;
        const color = risk === "high" ? "#ef4444" : risk === "medium" ? "#f59e0b" : "#22c55e";
        const dotR = 2.5 + p.depthT * 2;
        return (
          <g key={p.idx} opacity={p.t}>
            <circle cx={p.px} cy={p.py} r={dotR + 2}
              fill={color} opacity={0.2 * p.t} filter="url(#lgGlow)" />
            <circle cx={p.px} cy={p.py} r={dotR}
              fill={color} opacity={0.6 + p.depthT * 0.4} />
          </g>
        );
      })}

      {/* center mark */}
      <circle cx={cx} cy={cy} r="3" fill="#7c8aff" filter="url(#lgGlow)" />
      <circle cx={cx} cy={cy} r="1" fill="white" />
    </svg>
  );
}

Object.assign(window, { LoadingScreen });
