// BankruptIQ — CRUD management page

const { useState: useStateC, useEffect: useEffectC, useCallback: useCbC } = React;

const SECTORS_LIST = [
  "Energie", "IT_Telecom", "Sanatate_Farma", "Agricultura",
  "Constructii", "Comert", "Transport_Logistica", "Productie",
  "Turism_HoReCa", "Diverse",
];

const IND_FIELDS = [
  { key: "current_ratio",       label: "Lichiditate curentă",    hint: "Active curente / Pasive curente  (≥ 1)" },
  { key: "quick_ratio",         label: "Lichiditate rapidă",      hint: "Excluzând stocuri  (≥ 0.8)" },
  { key: "debt_ratio",          label: "Rată îndatorare",         hint: "Datorii totale / Active totale  (0–1)" },
  { key: "debt_to_equity",      label: "Datorii / Capitaluri",    hint: "D/E — levier financiar" },
  { key: "net_profit_margin",   label: "Marjă profit net (%)",    hint: "Profit net / Cifra de afaceri × 100" },
  { key: "return_on_assets",    label: "ROA (%)",                 hint: "Profit net / Active totale × 100" },
  { key: "return_on_equity",    label: "ROE (%)",                 hint: "Profit net / Capitaluri proprii × 100" },
  { key: "asset_turnover",      label: "Rotație active",          hint: "Cifra de afaceri / Active totale" },
  { key: "working_capital_ratio", label: "Capital de lucru / Active", hint: "(Active cur. − Pasive cur.) / Active" },
  { key: "interest_coverage",   label: "Acoperire dobânzi",       hint: "EBIT / Dobânzi  (> 1.5 = ok)" },
];

const EMPTY_IND = Object.fromEntries(IND_FIELDS.map(f => [f.key, ""]));

const EMPTY_FORM = {
  company_name: "", year: new Date().getFullYear(), sector: "Diverse",
  is_bankrupt: "0", indicators: { ...EMPTY_IND },
};

// ── helpers ──────────────────────────────────────────────────────────────────

function riskColor(label) {
  if (label === "Risc mare")  return "var(--risk-high)";
  if (label === "Risc mediu") return "var(--risk-medium)";
  return "var(--risk-low)";
}

function RiskBadge({ label }) {
  if (!label) return null;
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 4,
      background: `color-mix(in oklab, ${riskColor(label)} 16%, transparent)`,
      color: riskColor(label), fontFamily: "var(--font-mono)", letterSpacing: "0.04em",
    }}>{label}</span>
  );
}

// ── Form modal ────────────────────────────────────────────────────────────────

function CompanyFormModal({ initial, onSave, onClose }) {
  const [form, setFormRaw] = useStateC(() =>
    initial
      ? {
          company_name: initial.company_name,
          year: initial.year,
          sector: initial.sector || "Diverse",
          is_bankrupt: String(initial.is_bankrupt ?? 0),
          indicators: { ...EMPTY_IND, ...initial.indicators },
        }
      : { ...EMPTY_FORM, indicators: { ...EMPTY_IND } }
  );
  const [saving, setSaving] = useStateC(false);
  const [errors, setErrors] = useStateC({});

  function setField(path, val) {
    setFormRaw(f => {
      if (path.startsWith("indicators.")) {
        const k = path.slice(11);
        return { ...f, indicators: { ...f.indicators, [k]: val } };
      }
      return { ...f, [path]: val };
    });
    setErrors(e => { const n = { ...e }; delete n[path]; return n; });
  }

  function validate() {
    const errs = {};
    if (!form.company_name.trim()) errs.company_name = "Obligatoriu";
    if (!form.year || form.year < 2000 || form.year > 2100) errs.year = "An invalid";
    for (const f of IND_FIELDS) {
      const v = parseFloat(form.indicators[f.key]);
      if (isNaN(v)) errs[`indicators.${f.key}`] = "Număr invalid";
    }
    return errs;
  }

  async function handleSave() {
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setSaving(true);
    try {
      const payload = {
        company_name: form.company_name.trim(),
        year: parseInt(form.year),
        sector: form.sector,
        is_bankrupt: parseInt(form.is_bankrupt),
        indicators: Object.fromEntries(
          IND_FIELDS.map(f => [f.key, parseFloat(form.indicators[f.key])])
        ),
      };
      const url    = initial ? `/api/companies/${initial.id}` : "/api/companies/";
      const method = initial ? "PUT" : "POST";
      const res    = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json();
        setErrors({ _global: err.detail || "Eroare server" });
        return;
      }
      const saved = await res.json();
      onSave(saved);
    } finally {
      setSaving(false);
    }
  }

  const overlay = {
    position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)",
    display: "flex", alignItems: "center", justifyContent: "center",
    zIndex: 1200, backdropFilter: "blur(4px)",
  };
  const modal = {
    background: "var(--card-bg)", border: "1px solid var(--border)",
    borderRadius: 12, padding: "28px 32px", width: "min(700px,96vw)",
    maxHeight: "90vh", overflowY: "auto", position: "relative",
  };
  const label = { fontSize: 11, color: "var(--fg-dim)", fontWeight: 600,
    fontFamily: "var(--font-mono)", marginBottom: 4, letterSpacing: "0.03em" };
  const inp = (err) => ({
    width: "100%", background: "rgba(255,255,255,0.04)", border: `1px solid ${err ? "var(--risk-high)" : "var(--border)"}`,
    borderRadius: 6, padding: "7px 10px", color: "var(--fg)", fontSize: 13,
    fontFamily: "var(--font-mono)", outline: "none", boxSizing: "border-box",
  });

  return (
    <div style={overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={modal}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: "var(--fg)" }}>
              {initial ? "Editează companie" : "Adaugă companie nouă"}
            </div>
            <div style={{ fontSize: 11, color: "var(--fg-dim)", marginTop: 2 }}>
              {initial ? `ID: ${initial.id}` : "Scorul de risc va fi calculat automat"}
            </div>
          </div>
          <button onClick={onClose} style={{
            background: "none", border: "none", fontSize: 20, cursor: "pointer",
            color: "var(--fg-dim)", lineHeight: 1, padding: 4,
          }}>✕</button>
        </div>

        {errors._global && (
          <div style={{ background: "color-mix(in oklab, var(--risk-high) 15%, transparent)",
            border: "1px solid var(--risk-high)", borderRadius: 6, padding: "8px 12px",
            color: "var(--risk-high)", fontSize: 12, marginBottom: 16 }}>
            {errors._global}
          </div>
        )}

        {/* Basic fields */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px 20px", marginBottom: 20 }}>
          <div style={{ gridColumn: "1/-1" }}>
            <div style={label}>Denumire companie *</div>
            <input style={inp(errors.company_name)} value={form.company_name}
              onChange={e => setField("company_name", e.target.value)}
              placeholder="ex: Romgaz SA" />
            {errors.company_name && <div style={{ color: "var(--risk-high)", fontSize: 10, marginTop: 3 }}>{errors.company_name}</div>}
          </div>

          <div>
            <div style={label}>An raportare *</div>
            <input type="number" style={inp(errors.year)} value={form.year}
              onChange={e => setField("year", e.target.value)} min="2000" max="2100" />
            {errors.year && <div style={{ color: "var(--risk-high)", fontSize: 10, marginTop: 3 }}>{errors.year}</div>}
          </div>

          <div>
            <div style={label}>Sector</div>
            <select style={{ ...inp(), cursor: "pointer" }} value={form.sector}
              onChange={e => setField("sector", e.target.value)}>
              {SECTORS_LIST.map(s => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}
            </select>
          </div>

          <div>
            <div style={label}>Status faliment</div>
            <select style={{ ...inp(), cursor: "pointer" }} value={form.is_bankrupt}
              onChange={e => setField("is_bankrupt", e.target.value)}>
              <option value="0">Activ</option>
              <option value="1">Falit / Insolvență</option>
            </select>
          </div>
        </div>

        {/* Indicators */}
        <div style={{ fontSize: 12, fontWeight: 700, color: "var(--fg-dim)", marginBottom: 10,
          fontFamily: "var(--font-mono)", borderBottom: "1px solid var(--border)", paddingBottom: 8 }}>
          INDICATORI FINANCIARI (10)
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px 20px", marginBottom: 24 }}>
          {IND_FIELDS.map(f => {
            const ek = `indicators.${f.key}`;
            return (
              <div key={f.key}>
                <div style={label} title={f.hint}>{f.label} *</div>
                <input type="number" step="0.0001" style={inp(errors[ek])}
                  value={form.indicators[f.key]}
                  onChange={e => setField(ek, e.target.value)}
                  placeholder={f.hint.split("(")[0].trim()} />
                {errors[ek] && <div style={{ color: "var(--risk-high)", fontSize: 10, marginTop: 2 }}>{errors[ek]}</div>}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <button onClick={onClose} style={{
            padding: "8px 20px", borderRadius: 6, border: "1px solid var(--border)",
            background: "none", color: "var(--fg-dim)", cursor: "pointer", fontSize: 13,
          }}>Anulează</button>
          <button onClick={handleSave} disabled={saving} style={{
            padding: "8px 24px", borderRadius: 6, border: "none",
            background: "var(--accent)", color: "#fff", cursor: saving ? "wait" : "pointer",
            fontSize: 13, fontWeight: 700, opacity: saving ? 0.7 : 1,
          }}>{saving ? "Se salvează…" : initial ? "Actualizează" : "Adaugă companie"}</button>
        </div>
      </div>
    </div>
  );
}

// ── Delete confirm dialog ────────────────────────────────────────────────────

function DeleteDialog({ company, onConfirm, onClose }) {
  const [loading, setLoading] = useStateC(false);
  async function doDelete() {
    setLoading(true);
    await fetch(`/api/companies/${company.id}`, { method: "DELETE" });
    onConfirm(company.id);
  }
  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)",
      display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: 1300, backdropFilter: "blur(4px)",
    }}>
      <div style={{
        background: "var(--card-bg)", border: "1px solid var(--risk-high)",
        borderRadius: 12, padding: "28px 32px", width: "min(440px,94vw)",
      }}>
        <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 8, color: "var(--fg)" }}>Confirmare ștergere</div>
        <div style={{ fontSize: 13, color: "var(--fg-dim)", marginBottom: 20 }}>
          Ești sigur că vrei să ștergi <strong style={{ color: "var(--fg)" }}>{company.company_name}</strong> ({company.year})?
          <br />Această acțiune este ireversibilă.
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <button onClick={onClose} style={{
            padding: "8px 20px", borderRadius: 6, border: "1px solid var(--border)",
            background: "none", color: "var(--fg-dim)", cursor: "pointer", fontSize: 13,
          }}>Anulează</button>
          <button onClick={doDelete} disabled={loading} style={{
            padding: "8px 20px", borderRadius: 6, border: "none",
            background: "var(--risk-high)", color: "#fff", cursor: loading ? "wait" : "pointer",
            fontSize: 13, fontWeight: 700, opacity: loading ? 0.7 : 1,
          }}>{loading ? "Se șterge…" : "Șterge definitiv"}</button>
        </div>
      </div>
    </div>
  );
}

// ── Main CRUD page ────────────────────────────────────────────────────────────

function CRUDPage() {
  const [rows, setRows]             = useStateC([]);
  const [total, setTotal]           = useStateC(0);
  const [loading, setLoading]       = useStateC(true);
  const [search, setSearch]         = useStateC("");
  const [page, setPage]             = useStateC(0);
  const [modal, setModal]           = useStateC(null);   // null | "add" | company obj
  const [delTarget, setDelTarget]   = useStateC(null);
  const [toast, setToast]           = useStateC(null);
  const [sectorF, setSectorF]       = useStateC("all");
  const [riskF, setRiskF]           = useStateC("all");

  const PAGE_SIZE = 20;

  const showToast = (msg, type = "ok") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const load = useCbC(async () => {
    setLoading(true);
    try {
      const params = {
        limit: PAGE_SIZE,
        skip: page * PAGE_SIZE,
      };
      if (search)            params.search     = search;
      if (sectorF !== "all") params.sector     = sectorF;
      if (riskF   !== "all") params.risk_label = riskF;

      const q   = new URLSearchParams(params);
      const res = await fetch(`/api/companies/?${q}`);
      const data = res.ok ? await res.json() : [];
      setRows(data);
    } finally {
      setLoading(false);
    }
  }, [page, search, sectorF, riskF]);

  useEffectC(() => { load(); }, [load]);

  // reset pagina când se schimbă filtrele
  useEffectC(() => { setPage(0); }, [search, sectorF, riskF]);

  function handleSaved(company) {
    setModal(null);
    showToast(modal?.id
      ? `${company.company_name} actualizată cu succes.`
      : `${company.company_name} adăugată cu succes. Scor: ${company.risk_score?.toFixed(1)}`,
      "ok"
    );
    load();
  }

  function handleDeleted(id) {
    setDelTarget(null);
    setRows(r => r.filter(c => c.id !== id));
    showToast("Compania a fost ștearsă.", "warn");
  }

  const S = {
    page: { padding: "0 0 40px" },
    header: { display: "flex", alignItems: "center", justifyContent: "space-between",
      marginBottom: 20, flexWrap: "wrap", gap: 12 },
    title: { fontSize: 20, fontWeight: 700, color: "var(--fg)" },
    sub: { fontSize: 12, color: "var(--fg-dim)", marginTop: 2 },
    addBtn: {
      padding: "9px 18px", borderRadius: 7, border: "none",
      background: "var(--accent)", color: "#fff", cursor: "pointer",
      fontSize: 13, fontWeight: 700, display: "flex", alignItems: "center", gap: 6,
    },
    filters: { display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", marginBottom: 16 },
    searchWrap: {
      display: "flex", alignItems: "center", gap: 8, flex: "1 1 260px",
      background: "rgba(255,255,255,0.04)", border: "1px solid var(--border)",
      borderRadius: 7, padding: "6px 12px",
    },
    searchInp: {
      background: "none", border: "none", outline: "none",
      color: "var(--fg)", fontSize: 13, width: "100%", fontFamily: "var(--font-mono)",
    },
    sel: {
      background: "rgba(255,255,255,0.04)", border: "1px solid var(--border)",
      borderRadius: 7, padding: "6px 10px", color: "var(--fg)",
      fontSize: 12, fontFamily: "var(--font-mono)", cursor: "pointer",
    },
    table: { width: "100%", borderCollapse: "collapse" },
    th: {
      textAlign: "left", padding: "10px 12px", fontSize: 10, fontWeight: 700,
      color: "var(--fg-dim)", fontFamily: "var(--font-mono)", letterSpacing: "0.05em",
      borderBottom: "1px solid var(--border)", whiteSpace: "nowrap",
    },
    td: {
      padding: "10px 12px", fontSize: 12, borderBottom: "1px solid rgba(255,255,255,0.05)",
      color: "var(--fg)", verticalAlign: "middle",
    },
    rowHover: { background: "rgba(124,138,255,0.04)" },
    actBtn: (color) => ({
      padding: "4px 10px", borderRadius: 5, border: `1px solid ${color}`,
      background: "none", color, cursor: "pointer", fontSize: 11, fontWeight: 600,
      fontFamily: "var(--font-mono)",
    }),
    pager: { display: "flex", alignItems: "center", gap: 10, marginTop: 16,
      fontSize: 12, color: "var(--fg-dim)", fontFamily: "var(--font-mono)" },
    pgBtn: (disabled) => ({
      padding: "5px 14px", borderRadius: 6, border: "1px solid var(--border)",
      background: "none", color: disabled ? "var(--fg-faint)" : "var(--fg)",
      cursor: disabled ? "default" : "pointer", fontSize: 12,
    }),
  };

  const card = {
    background: "var(--card-bg)", border: "1px solid var(--border)",
    borderRadius: 12, padding: 24, overflow: "hidden",
  };

  return (
    <div style={S.page}>
      {/* Toast */}
      {toast && (
        <div style={{
          position: "fixed", top: 20, right: 24, zIndex: 2000,
          background: toast.type === "ok" ? "var(--risk-low)" : "var(--risk-high)",
          color: "#fff", borderRadius: 8, padding: "10px 18px", fontSize: 13, fontWeight: 600,
          boxShadow: "0 4px 20px rgba(0,0,0,0.4)", maxWidth: 360,
        }}>{toast.msg}</div>
      )}

      {/* Header */}
      <div style={S.header}>
        <div>
          <div style={S.title}>Gestionare date</div>
          <div style={S.sub}>Inserare, actualizare și ștergere înregistrări companii</div>
        </div>
        <button style={S.addBtn} onClick={() => setModal("add")}>
          <span style={{ fontSize: 16, lineHeight: 1 }}>+</span> Adaugă companie
        </button>
      </div>

      <div style={card}>
        {/* Filters */}
        <div style={S.filters}>
          <div style={S.searchWrap}>
            <span style={{ color: "var(--fg-dim)", fontSize: 15 }}>⌕</span>
            <input style={S.searchInp} placeholder="Caută după denumire…"
              value={search} onChange={e => setSearch(e.target.value)} />
            {search && (
              <button onClick={() => setSearch("")} style={{
                background: "none", border: "none", cursor: "pointer",
                color: "var(--fg-faint)", fontSize: 14, lineHeight: 1,
              }}>×</button>
            )}
          </div>
          <select style={S.sel} value={sectorF} onChange={e => setSectorF(e.target.value)}>
            <option value="all">Toate sectoarele</option>
            {SECTORS_LIST.map(s => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}
          </select>
          <select style={S.sel} value={riskF} onChange={e => setRiskF(e.target.value)}>
            <option value="all">Toate riscurile</option>
            <option value="Risc mic">Risc mic</option>
            <option value="Risc mediu">Risc mediu</option>
            <option value="Risc mare">Risc mare</option>
          </select>
          <button onClick={load} style={{
            ...S.pgBtn(false), display: "flex", alignItems: "center", gap: 5,
          }}>⟳ Reîncarcă</button>
        </div>

        {/* Table */}
        {loading ? (
          <div style={{ textAlign: "center", padding: 40, color: "var(--fg-dim)", fontSize: 13 }}>
            Se încarcă…
          </div>
        ) : rows.length === 0 ? (
          <div style={{ textAlign: "center", padding: 40, color: "var(--fg-dim)", fontSize: 13 }}>
            Nicio înregistrare găsită.
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={S.table}>
              <thead>
                <tr>
                  {["Companie", "An", "Sector", "Scor risc", "Risc", "Faliment",
                    "CR", "DR", "NPM%", "ROA%", "Acțiuni"].map(h => (
                    <th key={h} style={S.th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map(c => (
                  <tr key={c.id} style={{ transition: "background .15s" }}
                    onMouseEnter={e => e.currentTarget.style.background = "rgba(124,138,255,0.06)"}
                    onMouseLeave={e => e.currentTarget.style.background = ""}>
                    <td style={{ ...S.td, fontWeight: 600, maxWidth: 180 }}>
                      <div style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {c.company_name}
                      </div>
                    </td>
                    <td style={{ ...S.td, fontFamily: "var(--font-mono)", color: "var(--fg-dim)" }}>{c.year}</td>
                    <td style={{ ...S.td, fontSize: 11, color: "var(--fg-dim)" }}>{(c.sector||"—").replace(/_/g," ")}</td>
                    <td style={{ ...S.td, fontFamily: "var(--font-mono)", fontWeight: 700,
                      color: c.risk_score > 66 ? "var(--risk-high)" : c.risk_score > 33 ? "var(--risk-medium)" : "var(--risk-low)" }}>
                      {c.risk_score != null ? c.risk_score.toFixed(1) : "—"}
                    </td>
                    <td style={S.td}><RiskBadge label={c.risk_label} /></td>
                    <td style={{ ...S.td, fontFamily: "var(--font-mono)", fontSize: 11 }}>
                      {c.is_bankrupt === 1
                        ? <span style={{ color: "var(--risk-high)", fontWeight: 700 }}>DA</span>
                        : <span style={{ color: "var(--fg-faint)" }}>NU</span>}
                    </td>
                    <td style={{ ...S.td, fontFamily: "var(--font-mono)", fontSize: 11 }}>{c.indicators?.current_ratio?.toFixed(2)}</td>
                    <td style={{ ...S.td, fontFamily: "var(--font-mono)", fontSize: 11 }}>{c.indicators?.debt_ratio?.toFixed(2)}</td>
                    <td style={{ ...S.td, fontFamily: "var(--font-mono)", fontSize: 11 }}>{c.indicators?.net_profit_margin?.toFixed(1)}</td>
                    <td style={{ ...S.td, fontFamily: "var(--font-mono)", fontSize: 11 }}>{c.indicators?.return_on_assets?.toFixed(1)}</td>
                    <td style={S.td}>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button style={S.actBtn("var(--accent)")}
                          onClick={() => setModal(c)}>✎ Edit</button>
                        <button style={S.actBtn("var(--risk-high)")}
                          onClick={() => setDelTarget(c)}>✕ Șterge</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {!loading && rows.length > 0 && (
          <div style={S.pager}>
            <button style={S.pgBtn(page === 0)} disabled={page === 0}
              onClick={() => setPage(p => p - 1)}>← Anterior</button>
            <span>Pagina {page + 1}</span>
            <button style={S.pgBtn(rows.length < PAGE_SIZE)} disabled={rows.length < PAGE_SIZE}
              onClick={() => setPage(p => p + 1)}>Următor →</button>
            <span style={{ marginLeft: 8, color: "var(--fg-faint)" }}>
              {rows.length} înregistrări pe pagină
            </span>
          </div>
        )}
      </div>

      {/* Modals */}
      {(modal === "add" || (modal && modal.id)) && (
        <CompanyFormModal
          initial={modal === "add" ? null : modal}
          onSave={handleSaved}
          onClose={() => setModal(null)}
        />
      )}
      {delTarget && (
        <DeleteDialog
          company={delTarget}
          onConfirm={handleDeleted}
          onClose={() => setDelTarget(null)}
        />
      )}
    </div>
  );
}
