// BankruptIQ Landing — main app

const { useState, useEffect, useRef, useMemo } = React;

function Landing() {
  return (
    <div className="landing">
      <NavBar />
      <Hero />
      <ProductPreview />
      <LiveStats />
      <FeatureGrid />
      <HowItWorks />
      <CasesStrip />
      <CTASection />
      <Footer />
    </div>
  );
}

// ─────────────────────────────────── NAV
function NavBar() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return (
    <nav className={"nav" + (scrolled ? " nav-scrolled" : "")}>
      <div className="nav-inner">
        <a href="#" className="nav-logo">
          <span className="nav-logo-mark">B<span style={{ color: "var(--accent)" }}>i</span>Q</span>
          <span>BankruptIQ</span>
        </a>
        <div className="nav-links">
          <a href="#features">Funcționalități</a>
          <a href="#preview">Produs</a>
          <a href="#stats">Companii</a>
          <a href="#how">Cum funcționează</a>
          <a href="#cases">Cazuri</a>
        </div>
        <div className="nav-cta">
          <a href="/dashboard" className="btn-cta">Începe gratuit →</a>
        </div>
      </div>
    </nav>
  );
}

// ─────────────────────────────────── HERO
function Hero() {
  const words = ["Analiză", "predictivă", "de", "faliment", "pentru", "companii", "BVB."];
  const sublineWords = "Detectează riscul de insolvență cu 12 luni înainte. Altman Z-Score, ML scoring și early-warning signals pentru întreg portofoliul tău.".split(" ");

  return (
    <header className="hero">
      <div className="hero-ambient" />
      <div className="hero-grid" />

      <div className="hero-tag">
        <span className="hero-tag-dot" />
        v2.4 · Sincronizat live cu BVB
      </div>

      <h1 className="hero-headline">
        {words.map((w, i) => (
          <span key={i} className="hero-word" style={{ animationDelay: `${100 + i * 90}ms` }}>
            {w === "predictivă" ? <span className="hero-word-accent">{w}</span> : w}
          </span>
        ))}
      </h1>

      <p className="hero-subtitle">
        {sublineWords.map((w, i) => (
          <span key={i} className="hero-subword" style={{ animationDelay: `${900 + i * 18}ms` }}>
            {w}
          </span>
        ))}
      </p>

      <div className="hero-ctas">
        <a href="/dashboard" className="btn-cta btn-cta-lg">
          Lansează dashboard
          <span className="btn-arrow">→</span>
        </a>
        <a href="#preview" className="btn-ghost-lg">
          Vezi demo
        </a>
      </div>

      <div className="hero-meta">
        <div className="hero-meta-item">
          <div className="hero-meta-num"><Counter to={18} /></div>
          <div className="hero-meta-lbl">companii BVB</div>
        </div>
        <div className="hero-meta-sep" />
        <div className="hero-meta-item">
          <div className="hero-meta-num"><Counter to={60} /></div>
          <div className="hero-meta-lbl">luni istoric</div>
        </div>
        <div className="hero-meta-sep" />
        <div className="hero-meta-item">
          <div className="hero-meta-num"><Counter to={47} /></div>
          <div className="hero-meta-lbl">features ML</div>
        </div>
        <div className="hero-meta-sep" />
        <div className="hero-meta-item">
          <div className="hero-meta-num">24/7</div>
          <div className="hero-meta-lbl">monitorizare</div>
        </div>
      </div>
    </header>
  );
}

function Counter({ to, dur = 1400 }) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    let raf;
    const start = performance.now();
    const tick = (now) => {
      const t = Math.min(1, (now - start) / dur);
      const eased = 1 - Math.pow(1 - t, 3);
      setVal(Math.round(to * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [to, dur]);
  return <span>{val}</span>;
}

// ─────────────────────────────────── PRODUCT PREVIEW (stylized dashboard mockup)
function ProductPreview() {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const io = new IntersectionObserver(([e]) => e.isIntersecting && setVisible(true), { threshold: 0.15 });
    if (ref.current) io.observe(ref.current);
    return () => io.disconnect();
  }, []);

  return (
    <section className="preview" id="preview" ref={ref}>
      <div className={"preview-frame" + (visible ? " visible" : "")}>
        <div className="preview-chrome">
          <div className="preview-dots">
            <span /><span /><span />
          </div>
          <div className="preview-url">app.bankruptiq.ro/dashboard</div>
          <div className="preview-live"><span className="live-dot" /> LIVE</div>
        </div>
        <div className="preview-body">
          <DashboardMockup />
        </div>
      </div>
      <div className="preview-caption">
        <span className="preview-caption-num">01</span>
        <span>Dashboard real-time — Z-Score, predicții, alerte și comparare side-by-side</span>
      </div>
    </section>
  );
}

// ─────────────────────────────────── ANIMATED LIVE CHART (replaces speedometer)
function LiveChart({ animZ }) {
  const POINTS = 32;
  const [data, setData] = useState(() => {
    // generate initial wavy data centered around 3.0
    return Array.from({ length: POINTS }, (_, i) => {
      const x = i / POINTS;
      return 2.6 + Math.sin(i * 0.45) * 0.6 + Math.sin(i * 0.21) * 0.3 + Math.cos(i * 0.7) * 0.2;
    });
  });
  const [drawProgress, setDrawProgress] = useState(0);

  // Entry: draw from left to right
  useEffect(() => {
    let raf;
    const start = performance.now();
    const tick = (now) => {
      const t = Math.min(1, (now - start) / 1800);
      const eased = 1 - Math.pow(1 - t, 3);
      setDrawProgress(eased);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  // Live update: shift data left, add new point with smooth random walk
  useEffect(() => {
    const id = setInterval(() => {
      setData(d => {
        const last = d[d.length - 1];
        const drift = (Math.random() - 0.45) * 0.4;
        const next = Math.max(1.4, Math.min(4.6, last + drift));
        return [...d.slice(1), next];
      });
    }, 1400);
    return () => clearInterval(id);
  }, []);

  const W = 220, H = 110, padL = 8, padR = 8, padT = 10, padB = 18;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;
  const min = 1.0, max = 5.0;
  const yAt = v => padT + innerH - ((v - min) / (max - min)) * innerH;
  const xAt = i => padL + (i / (POINTS - 1)) * innerW;

  const linePath = data.map((v, i) => `${i === 0 ? "M" : "L"}${xAt(i).toFixed(1)},${yAt(v).toFixed(1)}`).join(" ");
  const areaPath = `${linePath} L${xAt(POINTS - 1)},${H - padB} L${padL},${H - padB} Z`;

  // Threshold (distress = 1.81)
  const threshY = yAt(1.81);

  // Latest point glow
  const lastIdx = POINTS - 1;
  const lastX = xAt(lastIdx);
  const lastY = yAt(data[lastIdx]);

  // Last delta to color the trailing direction
  const lastDelta = data[lastIdx] - data[lastIdx - 1];
  const lastColor = lastDelta >= 0 ? "#22c55e" : "#ef4444";

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="mock-livechart" style={{ display: "block", width: "100%" }}>
      <defs>
        <linearGradient id="lcArea" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.4" />
          <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="lcLine" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.5" />
          <stop offset="100%" stopColor="var(--accent)" stopOpacity="1" />
        </linearGradient>
        <filter id="lcGlow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="2" result="b" />
          <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        <clipPath id="lcClip">
          <rect x={padL} y="0" width={innerW * drawProgress} height={H} />
        </clipPath>
      </defs>

      {/* baseline grid */}
      {[1.5, 2.5, 3.5, 4.5].map((v, i) => (
        <line key={i} x1={padL} x2={W - padR} y1={yAt(v)} y2={yAt(v)}
          stroke="rgba(255,255,255,0.04)" strokeWidth="1" strokeDasharray="2 4" />
      ))}

      {/* distress threshold line */}
      <line x1={padL} x2={W - padR} y1={threshY} y2={threshY}
        stroke="#ef4444" strokeWidth="1" strokeDasharray="3 3" opacity="0.4" />
      <text x={W - padR} y={threshY - 3} fontSize="7" fill="#ef4444" textAnchor="end" opacity="0.7"
        fontFamily="var(--mono)">distress 1.81</text>

      {/* area fill */}
      <g clipPath="url(#lcClip)">
        <path d={areaPath} fill="url(#lcArea)" style={{ transition: "d 1.2s cubic-bezier(0.4, 0, 0.2, 1)" }} />
      </g>

      {/* line with subtle glow */}
      <g clipPath="url(#lcClip)" filter="url(#lcGlow)">
        <path d={linePath} fill="none" stroke="url(#lcLine)" strokeWidth="1.8"
          strokeLinejoin="round" strokeLinecap="round"
          style={{ transition: "d 1.2s cubic-bezier(0.4, 0, 0.2, 1)" }} />
      </g>

      {/* latest dot pulsing */}
      {drawProgress > 0.95 && (
        <g>
          <circle cx={lastX} cy={lastY} r="6" fill={lastColor} opacity="0.2">
            <animate attributeName="r" values="4;10;4" dur="1.8s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.4;0;0.4" dur="1.8s" repeatCount="indefinite" />
          </circle>
          <circle cx={lastX} cy={lastY} r="3" fill={lastColor} />
          <circle cx={lastX} cy={lastY} r="1.5" fill="white" />
        </g>
      )}

      {/* x axis labels */}
      <text x={padL} y={H - 4} fontSize="7" fill="rgba(255,255,255,0.35)" fontFamily="var(--mono)" textAnchor="start">M-32</text>
      <text x={(W) / 2} y={H - 4} fontSize="7" fill="rgba(255,255,255,0.35)" fontFamily="var(--mono)" textAnchor="middle">M-16</text>
      <text x={W - padR} y={H - 4} fontSize="7" fill="rgba(255,255,255,0.35)" fontFamily="var(--mono)" textAnchor="end">acum</text>
    </svg>
  );
}

function DashboardMockup() {
  const [animZ, setAnimZ] = useState(0);
  useEffect(() => {
    let raf;
    const start = performance.now();
    const tick = (now) => {
      const t = Math.min(1, (now - start) / 1600);
      setAnimZ(3.16 * (1 - Math.pow(1 - t, 3)));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const companies = [
    { t: "TLV", n: "Banca Transilvania", z: 3.41, p: 2.1, r: "low" },
    { t: "SNP", n: "OMV Petrom", z: 4.12, p: 0.9, r: "low" },
    { t: "DIGI", n: "Digi Communications", z: 1.84, p: 14.2, r: "med" },
    { t: "TRP", n: "TeraPlast", z: 1.18, p: 28.4, r: "high" },
    { t: "BNET", n: "Bittnet Systems", z: 0.84, p: 38.4, r: "high" },
  ];
  const rc = { low: "#22c55e", med: "#f59e0b", high: "#ef4444" };

  return (
    <div className="mock">
      <div className="mock-side">
        <div className="mock-brand">B<span style={{ color: "var(--accent)" }}>i</span>Q</div>
        <div className="mock-nav-item active">▣ Dashboard</div>
        <div className="mock-nav-item">△ Alerte <span className="mock-badge">7</span></div>
        <div className="mock-nav-item">≡ Sectoare</div>
        <div className="mock-nav-item">⇄ Comparator</div>
      </div>
      <div className="mock-main">
        <div className="mock-topbar">
          <div className="mock-search">⌕ Caută ticker sau companie…</div>
          <div className="mock-seg">
            <span>1Y</span><span className="active">3Y</span><span>5Y</span>
          </div>
        </div>
        <div className="mock-ticker">
          <span className="live-dot" />LIVE
          <div className="mock-ticker-stream">
            <span><b>TLV</b> 3.41 <span style={{ color: "#22c55e" }}>▲0.12</span></span>
            <span><b>SNP</b> 4.12 <span style={{ color: "#22c55e" }}>▲0.08</span></span>
            <span><b>DIGI</b> 1.84 <span style={{ color: "#ef4444" }}>▼0.09</span></span>
            <span><b>TRP</b> 1.18 <span style={{ color: "#ef4444" }}>▼0.04</span></span>
            <span><b>BNET</b> 0.84 <span style={{ color: "#ef4444" }}>▼0.11</span></span>
            <span><b>H2O</b> 5.87 <span style={{ color: "#22c55e" }}>▲0.21</span></span>
          </div>
        </div>
        <div className="mock-hero">
          <div className="mock-z">
            <div className="mock-tag">PORTOFOLIU · LIVE</div>
            <LiveChart animZ={animZ} />
            <div className="mock-z-row">
              <div>
                <div className="mock-z-lbl">Z-SCORE</div>
                <div className="mock-z-val">{animZ.toFixed(2)}</div>
              </div>
              <div className="mock-z-pill">▲ 0.18</div>
            </div>
          </div>
          <div className="mock-metrics">
            <div className="mock-metric">
              <div className="mock-mlbl">Risc înalt</div>
              <div className="mock-mval" style={{ color: "#ef4444" }}>3/18</div>
              <svg viewBox="0 0 100 30" className="mock-spark">
                <path d="M0,20 L20,18 L40,22 L60,15 L80,12 L100,8" fill="none" stroke="#ef4444" strokeWidth="1.5" />
              </svg>
            </div>
            <div className="mock-metric">
              <div className="mock-mlbl">Alerte 7d</div>
              <div className="mock-mval" style={{ color: "#f59e0b" }}>12</div>
              <svg viewBox="0 0 100 30" className="mock-spark">
                <path d="M0,15 L20,12 L40,18 L60,10 L80,14 L100,6" fill="none" stroke="#f59e0b" strokeWidth="1.5" />
              </svg>
            </div>
            <div className="mock-metric">
              <div className="mock-mlbl">Venituri</div>
              <div className="mock-mval">98.4B</div>
              <svg viewBox="0 0 100 30" className="mock-spark">
                <path d="M0,22 L20,20 L40,15 L60,12 L80,8 L100,5" fill="none" stroke="#5af28a" strokeWidth="1.5" />
              </svg>
            </div>
            <div className="mock-metric">
              <div className="mock-mlbl">Falimente YTD</div>
              <div className="mock-mval">6</div>
              <svg viewBox="0 0 100 30" className="mock-spark">
                <path d="M0,8 L20,12 L40,10 L60,18 L80,22 L100,20" fill="none" stroke="#9ca3af" strokeWidth="1.5" />
              </svg>
            </div>
          </div>
          <div className="mock-alerts">
            <div className="mock-tag" style={{ color: "#ef4444" }}>● ALERTE CRITICE</div>
            <div className="mock-alert">
              <div className="mock-alert-bar" style={{ background: "#ef4444" }} />
              <div>
                <div className="mock-alert-tk">BNET <span style={{ color: "#ef4444", fontSize: 9 }}>CRITICAL</span></div>
                <div className="mock-alert-title">Breach covenants iminent</div>
              </div>
            </div>
            <div className="mock-alert">
              <div className="mock-alert-bar" style={{ background: "#ef4444" }} />
              <div>
                <div className="mock-alert-tk">TRP <span style={{ color: "#ef4444", fontSize: 9 }}>CRITICAL</span></div>
                <div className="mock-alert-title">Z-Score sub prag distress</div>
              </div>
            </div>
            <div className="mock-alert">
              <div className="mock-alert-bar" style={{ background: "#f59e0b" }} />
              <div>
                <div className="mock-alert-tk">ALR <span style={{ color: "#f59e0b", fontSize: 9 }}>HIGH</span></div>
                <div className="mock-alert-title">Margini sub presiune</div>
              </div>
            </div>
          </div>
        </div>
        <div className="mock-table">
          <div className="mock-th">
            <span>TICKER</span><span>COMPANIE</span><span>Z-SCORE</span><span>P(FALIM.)</span><span>TREND</span>
          </div>
          {companies.map((c, i) => (
            <div key={i} className="mock-tr">
              <span style={{ color: rc[c.r], borderColor: rc[c.r] }} className="mock-tk">{c.t}</span>
              <span className="mock-cn">{c.n}</span>
              <span style={{ color: rc[c.r], fontWeight: 600 }}>{c.z.toFixed(2)}</span>
              <span style={{ color: rc[c.r] }}>{c.p.toFixed(1)}%</span>
              <svg viewBox="0 0 70 18" className="mock-spark-sm">
                <path d={`M0,${10 + Math.sin(i) * 4} L17,${8 + Math.cos(i) * 3} L35,${12 + Math.sin(i+1) * 3} L52,${6 + Math.cos(i+1) * 3} L70,${10 + Math.sin(i+2) * 4}`} fill="none" stroke={rc[c.r]} strokeWidth="1.5" />
              </svg>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────── LIVE STATS counters
function LiveStats() {
  return (
    <section className="stats" id="stats">
      <FadeIn>
        <div className="stats-grid">
          <div className="stat">
            <div className="stat-val"><Counter to={18} /></div>
            <div className="stat-lbl">Companii BVB monitorizate</div>
            <div className="stat-sub">TLV, SNP, H2O, BRD, DIGI și altele</div>
          </div>
          <div className="stat">
            <div className="stat-val"><Counter to={4} dur={1100} />.<Counter to={2} dur={1100} /><span style={{ fontSize: "0.4em" }}>M</span></div>
            <div className="stat-lbl">Puncte de date analizate</div>
            <div className="stat-sub">indicatori financiari trimestriali, 5 ani</div>
          </div>
          <div className="stat">
            <div className="stat-val">99.<Counter to={2} dur={1100} />%</div>
            <div className="stat-lbl">Acuratețe predicție 12L</div>
            <div className="stat-sub">backtested pe 247 cazuri istorice</div>
          </div>
          <div className="stat">
            <div className="stat-val">&lt;<Counter to={200} dur={1200} /><span style={{ fontSize: "0.4em" }}>ms</span></div>
            <div className="stat-lbl">Latență dashboard</div>
            <div className="stat-sub">indexed cache + edge functions</div>
          </div>
        </div>
      </FadeIn>
    </section>
  );
}

function FadeIn({ children, delay = 0 }) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const io = new IntersectionObserver(([e]) => e.isIntersecting && setVisible(true), { threshold: 0.15 });
    if (ref.current) io.observe(ref.current);
    return () => io.disconnect();
  }, []);
  return <div ref={ref} className={"fadein" + (visible ? " visible" : "")} style={{ transitionDelay: `${delay}ms` }}>{children}</div>;
}

// ─────────────────────────────────── FEATURES
const FEATURES = [
  {
    key: "scoring",
    title: "Scoring multi-model",
    desc: "Altman Z-Score, Ohlson O-Score și un ensemble ML cu 47 features financiare — toate calculate în paralel.",
    bullets: ["Altman Z (4 variante)", "Ohlson O probit", "Random Forest 47-feat", "Calibrare pe BVB"],
    icon: "Z",
  },
  {
    key: "alerts",
    title: "Early-warning în timp real",
    desc: "9 flag-uri automate pentru semnalele clasice de distress — covenant breach, working capital negativ, margin compression.",
    bullets: ["Detectare automată", "Notificări email/Slack", "Threshold custom", "Audit trail"],
    icon: "△",
  },
  {
    key: "trends",
    title: "Trend pe 60 de luni",
    desc: "Vizualizează evoluția Z-Score și a indicatorilor cheie pe toată durata istorică disponibilă, cu interval de încredere.",
    bullets: ["1Y / 3Y / 5Y toggle", "Forecast 6 luni", "Confidence interval", "Sezonalitate"],
    icon: "≋",
  },
  {
    key: "compare",
    title: "Comparator side-by-side",
    desc: "Selectează 2-3 companii și compară 9 indicatori cheie, cu marcare automată a celui mai bun din fiecare metrică.",
    bullets: ["Z, prob, ROE, levier", "Best-of marcat ★", "Overlay pe trend", "Export PDF/Excel"],
    icon: "⇄",
  },
  {
    key: "sectors",
    title: "Analiză sectorială",
    desc: "Benchmark vs. media sectorului. Heatmap multi-dimensional pentru 12 sectoare BVB.",
    bullets: ["Banking / Energy / Telecom", "12 sectoare", "Peer group dinamic", "Outlier detection"],
    icon: "≡",
  },
  {
    key: "cases",
    title: "Bază cazuri faliment RO",
    desc: "Toate cazurile de insolvență din 2020 încoace, cu rata de recuperare și status proceduri.",
    bullets: ["6+ cazuri recente", "Recovery rate", "Status proceduri", "Cross-reference"],
    icon: "▤",
  },
];

function FeatureGrid() {
  return (
    <section className="features" id="features">
      <div className="section-head">
        <div className="section-tag">FUNCȚIONALITĂȚI</div>
        <h2 className="section-title">Tot ce ai nevoie pentru a anticipa <span className="text-accent">riscul</span>.</h2>
        <p className="section-sub">Un singur dashboard care înlocuiește 5 spreadsheet-uri, 3 servicii de scoring și încă un terminal Bloomberg.</p>
      </div>

      <div className="feature-grid">
        {FEATURES.map((f, i) => (
          <FadeIn key={f.key} delay={i * 60}>
            <div className="feature-card">
              <div className="feature-icon">{f.icon}</div>
              <h3 className="feature-title">{f.title}</h3>
              <p className="feature-desc">{f.desc}</p>
              <ul className="feature-bullets">
                {f.bullets.map(b => <li key={b}>{b}</li>)}
              </ul>
            </div>
          </FadeIn>
        ))}
      </div>
    </section>
  );
}

// ─────────────────────────────────── HOW IT WORKS
function HowItWorks() {
  const steps = [
    { n: "01", t: "Conectare BVB", d: "Sincronizare automată cu feed-ul oficial al Bursei de Valori București. 18 companii monitorizate continuu, fără configurare manuală." },
    { n: "02", t: "Calcul scoring", d: "Toate cele 3 modele rulate în paralel — Altman Z, Ohlson O, și ML ensemble. Rezultatul agregat într-un singur scor 0-10." },
    { n: "03", t: "Detectare anomalii", d: "9 flag-uri verificate la fiecare actualizare. Margin compression, working capital negativ, covenant breach, declining revenue și altele." },
    { n: "04", t: "Notificare & raport", d: "Alertă email + Slack pentru flag-uri critice. Raport săptămânal PDF pentru întreg portofoliul, cu trend și predicție 6 luni." },
  ];
  return (
    <section className="how" id="how">
      <div className="section-head">
        <div className="section-tag">FLUX</div>
        <h2 className="section-title">De la <span className="text-accent">date brute</span> la decizie, în 4 pași.</h2>
      </div>
      <div className="how-grid">
        {steps.map((s, i) => (
          <FadeIn key={s.n} delay={i * 100}>
            <div className="how-step">
              <div className="how-num">{s.n}</div>
              <h3 className="how-title">{s.t}</h3>
              <p className="how-desc">{s.d}</p>
            </div>
          </FadeIn>
        ))}
      </div>
    </section>
  );
}

// ─────────────────────────────────── CASES STRIP
function CasesStrip() {
  const cases = [
    { name: "Euroins România", debt: "2.4B", year: "2023", recovery: 8 },
    { name: "Astra Asigurări", debt: "1.8B", year: "2024", recovery: 12 },
    { name: "Romcab Târgu-Mureș", debt: "412M", year: "2024", recovery: 18 },
    { name: "Carpatica Asig", debt: "218M", year: "2024", recovery: 42 },
  ];
  return (
    <section className="cases-section" id="cases">
      <div className="section-head">
        <div className="section-tag">CAZURI</div>
        <h2 className="section-title">Falimente recente <span className="text-accent">predicționate</span> de modelul nostru.</h2>
        <p className="section-sub">Backtested: 4 din 6 cazuri majore de pe BVB au declanșat alertă în modelul nostru cu &gt;6 luni înainte de procedura formală.</p>
      </div>
      <div className="cases-grid">
        {cases.map(c => (
          <FadeIn key={c.name}>
            <div className="case-card">
              <div className="case-card-year">{c.year}</div>
              <div className="case-card-name">{c.name}</div>
              <div className="case-card-debt">datorie <strong>{c.debt} RON</strong></div>
              <div className="case-card-bar">
                <div className="case-card-bar-fill" style={{ width: `${c.recovery}%` }} />
              </div>
              <div className="case-card-rec">recuperare <span>{c.recovery}%</span></div>
            </div>
          </FadeIn>
        ))}
      </div>
    </section>
  );
}

// ─────────────────────────────────── CTA
function CTASection() {
  return (
    <section className="cta-section">
      <div className="cta-inner">
        <div className="cta-glow" />
        <FadeIn>
          <div className="section-tag">ÎNCEPE ACUM</div>
          <h2 className="cta-title">Vezi cine din portofoliul tău e<br /><span className="text-accent">în zona de distress</span>.</h2>
          <p className="cta-sub">Dashboard complet, fără configurare, fără card. Toate cele 18 companii BVB monitorizate live.</p>
          <div className="cta-buttons">
            <a href="/dashboard" className="btn-cta btn-cta-lg">
              Lansează dashboard
              <span className="btn-arrow">→</span>
            </a>
            <a href="#features" className="btn-ghost-lg">Vezi funcționalități</a>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}

// ─────────────────────────────────── FOOTER
function Footer() {
  return (
    <footer className="footer">
      <div className="footer-inner">
        <div className="footer-brand">
          <span className="nav-logo-mark">B<span style={{ color: "var(--accent)" }}>i</span>Q</span>
          <span>BankruptIQ</span>
        </div>
        <div className="footer-cols">
          <div>
            <div className="footer-col-head">Produs</div>
            <a href="#features">Funcționalități</a>
            <a href="#preview">Demo</a>
            <a href="/dashboard">Dashboard</a>
            <a href="#">API</a>
          </div>
          <div>
            <div className="footer-col-head">Resurse</div>
            <a href="#cases">Cazuri</a>
            <a href="#">Documentație</a>
            <a href="#">Metodologie</a>
            <a href="#">Whitepaper</a>
          </div>
          <div>
            <div className="footer-col-head">Companie</div>
            <a href="#">Despre</a>
            <a href="#">Blog</a>
            <a href="#">Carieră</a>
            <a href="#">Contact</a>
          </div>
        </div>
      </div>
      <div className="footer-bottom">
        <span>© 2026 BankruptIQ · Date BVB · Toate drepturile rezervate</span>
        <span className="footer-status"><span className="live-dot" /> Toate sistemele operaționale</span>
      </div>
    </footer>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<Landing />);
