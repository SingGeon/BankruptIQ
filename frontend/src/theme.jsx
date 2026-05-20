// BankruptIQ — theming system: 3 aesthetics × dark/light × risk palettes × density

const AESTHETIC_THEMES = {
  terminal: {
    name: "Terminal",
    fontHead: '"IBM Plex Mono", ui-monospace, Menlo, monospace',
    fontBody: '"IBM Plex Sans", system-ui, sans-serif',
    fontMono: '"IBM Plex Mono", ui-monospace, monospace',
    radius: "0px",
    radiusCard: "0px",
    cardBorder: "1px solid var(--border)",
    cardShadow: "none",
    cardBg: "var(--bg-elev)",
    headerWeight: 500,
    headerCase: "uppercase",
    headerSpacing: "0.06em",
    titleSize: "1.05rem",
    chromeBlur: false,
    accentStyle: "block",
    dark: {
      bg: "#0a0d0c",
      bgElev: "#11161a",
      bgElev2: "#161c20",
      fg: "#d4e0d8",
      fgDim: "#7a8b82",
      fgFaint: "#4a5853",
      border: "#1f2a2e",
      accent: "#5af28a",
      accentDim: "#3da767",
    },
    light: {
      bg: "#f5f7f3",
      bgElev: "#ffffff",
      bgElev2: "#eaeee5",
      fg: "#1a221c",
      fgDim: "#5a6860",
      fgFaint: "#a0aaa3",
      border: "#dde3d8",
      accent: "#1f7a3e",
      accentDim: "#52a673",
    },
  },
  fintech: {
    name: "Fintech",
    fontHead: '"IBM Plex Sans", "Geist", system-ui, sans-serif',
    fontBody: '"IBM Plex Sans", "Geist", system-ui, sans-serif',
    fontMono: '"IBM Plex Mono", "Geist Mono", ui-monospace, monospace',
    radius: "6px",
    radiusCard: "10px",
    cardBorder: "1px solid var(--border)",
    cardShadow: "0 1px 2px rgba(15, 23, 42, 0.04), 0 4px 16px rgba(15, 23, 42, 0.04)",
    cardBg: "var(--bg-elev)",
    headerWeight: 600,
    headerCase: "none",
    headerSpacing: "-0.015em",
    titleSize: "1.15rem",
    chromeBlur: true,
    accentStyle: "pill",
    dark: {
      bg: "#08090b",
      bgElev: "#0f1116",
      bgElev2: "#14171c",
      fg: "#e8e9ee",
      fgDim: "#9aa0ac",
      fgFaint: "#555a66",
      border: "#1b1e25",
      accent: "#7c8aff",
      accentDim: "#5d68d4",
    },
    light: {
      bg: "#f8f9fc",
      bgElev: "#ffffff",
      bgElev2: "#f1f3f8",
      fg: "#0c1326",
      fgDim: "#535d7a",
      fgFaint: "#8b94ac",
      border: "#e4e7ef",
      accent: "#4f56eb",
      accentDim: "#7c83f0",
    },
  },
  editorial: {
    name: "Editorial",
    fontHead: '"Instrument Serif", "Source Serif Pro", Georgia, serif',
    fontBody: '"Geist", system-ui, sans-serif',
    fontMono: '"JetBrains Mono", ui-monospace, monospace',
    radius: "2px",
    radiusCard: "4px",
    cardBorder: "1px solid var(--border)",
    cardShadow: "none",
    cardBg: "var(--bg-elev)",
    headerWeight: 400,
    headerCase: "none",
    headerSpacing: "-0.01em",
    titleSize: "1.4rem",
    chromeBlur: false,
    accentStyle: "underline",
    dark: {
      bg: "#161310",
      bgElev: "#1f1b17",
      bgElev2: "#2a251f",
      fg: "#ece4d8",
      fgDim: "#a8a094",
      fgFaint: "#6b6356",
      border: "#332d25",
      accent: "#d97757",
      accentDim: "#a55a3f",
    },
    light: {
      bg: "#faf7f2",
      bgElev: "#ffffff",
      bgElev2: "#f1ece3",
      fg: "#2a1f16",
      fgDim: "#6b5d4f",
      fgFaint: "#a89c8b",
      border: "#e8e0d2",
      accent: "#b85a32",
      accentDim: "#d6855d",
    },
  },
};

const RISK_PALETTES = {
  classic: {
    name: "Clasic (verde/galben/roșu)",
    low: "#16a34a",
    medium: "#f59e0b",
    high: "#dc2626",
    critical: "#991b1b",
  },
  pro: {
    name: "Profesional (cobalt/amber/coral)",
    low: "#0ea5e9",
    medium: "#eab308",
    high: "#f97316",
    critical: "#dc2626",
  },
  mono: {
    name: "Monocrom (grade)",
    low: "#94a3b8",
    medium: "#facc15",
    high: "#fb923c",
    critical: "#ef4444",
  },
};

const DENSITY_VALUES = {
  compact: { row: 28, gap: 12, padCard: 14, fontTable: 11 },
  comfortable: { row: 40, gap: 20, padCard: 22, fontTable: 13 },
};

function buildCssVars(aesthetic, mode, riskPalette, density) {
  const t = AESTHETIC_THEMES[aesthetic];
  const m = t[mode];
  const r = RISK_PALETTES[riskPalette];
  const d = DENSITY_VALUES[density];
  return {
    "--bg": m.bg,
    "--bg-elev": m.bgElev,
    "--bg-elev-2": m.bgElev2,
    "--fg": m.fg,
    "--fg-dim": m.fgDim,
    "--fg-faint": m.fgFaint,
    "--border": m.border,
    "--accent": m.accent,
    "--accent-dim": m.accentDim,
    "--risk-low": r.low,
    "--risk-medium": r.medium,
    "--risk-high": r.high,
    "--risk-critical": r.critical,
    "--radius": t.radius,
    "--radius-card": t.radiusCard,
    "--card-border": t.cardBorder,
    "--card-shadow": t.cardShadow,
    "--card-bg": t.cardBg,
    "--font-head": t.fontHead,
    "--font-body": t.fontBody,
    "--font-mono": t.fontMono,
    "--header-weight": t.headerWeight,
    "--header-case": t.headerCase,
    "--header-spacing": t.headerSpacing,
    "--title-size": t.titleSize,
    "--row-h": `${d.row}px`,
    "--gap": `${d.gap}px`,
    "--pad-card": `${d.padCard}px`,
    "--font-table": `${d.fontTable}px`,
  };
}

function riskColor(cls) {
  const map = { low: "var(--risk-low)", medium: "var(--risk-medium)", high: "var(--risk-high)", critical: "var(--risk-critical)" };
  return map[cls] || "var(--fg-dim)";
}

function severityColor(sev) {
  const map = { low: "var(--risk-low)", medium: "var(--risk-medium)", high: "var(--risk-high)", critical: "var(--risk-critical)" };
  return map[sev] || "var(--fg-dim)";
}

Object.assign(window, { AESTHETIC_THEMES, RISK_PALETTES, DENSITY_VALUES, buildCssVars, riskColor, severityColor });
