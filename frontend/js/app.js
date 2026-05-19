const API = '';

// ── Toast ──────────────────────────────────────────────────────────────────
function toast(msg, type = 'info', duration = 4000) {
  const container = document.getElementById('toast-container');
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.innerHTML = `<strong>${{ success: '✓', error: '✗', warning: '⚠', info: 'ℹ' }[type] || '•'}</strong> ${msg}`;
  container.appendChild(el);
  setTimeout(() => el.remove(), duration);
}

// ── HTTP helpers ──────────────────────────────────────────────────────────
async function apiFetch(path, opts = {}) {
  const res = await fetch(API + path, opts);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail || `HTTP ${res.status}`);
  }
  return res.json();
}

// ── Charts ────────────────────────────────────────────────────────────────
let riskPieChart = null;
let featureBarChart = null;
let trendLineChart = null;

function initCharts() {
  const pieCtx = document.getElementById('riskPieChart').getContext('2d');
  riskPieChart = new Chart(pieCtx, {
    type: 'doughnut',
    data: {
      labels: ['Risc mic', 'Risc mediu', 'Risc mare', 'Neevaluat'],
      datasets: [{
        data: [0, 0, 0, 0],
        backgroundColor: ['#22c55e', '#f59e0b', '#ef4444', '#3a3f55'],
        borderWidth: 0,
        hoverOffset: 8,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '65%',
      plugins: {
        legend: {
          position: 'bottom',
          labels: { color: '#8892a4', padding: 12, font: { size: 12 } },
        },
      },
    },
  });

  const barCtx = document.getElementById('featureBarChart').getContext('2d');
  featureBarChart = new Chart(barCtx, {
    type: 'bar',
    data: { labels: [], datasets: [{ data: [], backgroundColor: '#4f8ef7', borderRadius: 6 }] },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      indexAxis: 'y',
      plugins: { legend: { display: false } },
      scales: {
        x: {
          ticks: { color: '#8892a4', font: { size: 11 } },
          grid: { color: 'rgba(255,255,255,.05)' },
        },
        y: {
          ticks: { color: '#e2e8f0', font: { size: 11 } },
          grid: { display: false },
        },
      },
    },
  });

  const trendCtx = document.getElementById('trendLineChart').getContext('2d');
  trendLineChart = new Chart(trendCtx, {
    type: 'line',
    data: { labels: [], datasets: [] },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { labels: { color: '#8892a4', font: { size: 11 } } } },
      scales: {
        x: { ticks: { color: '#8892a4' }, grid: { color: 'rgba(255,255,255,.05)' } },
        y: {
          min: 0, max: 100,
          ticks: { color: '#8892a4' },
          grid: { color: 'rgba(255,255,255,.05)' },
          title: { display: true, text: 'Scor risc', color: '#8892a4' },
        },
      },
    },
  });
}

function updatePieChart(stats) {
  const none = stats.total - (stats.low_risk || 0) - (stats.medium_risk || 0) - (stats.high_risk || 0);
  riskPieChart.data.datasets[0].data = [
    stats.low_risk || 0,
    stats.medium_risk || 0,
    stats.high_risk || 0,
    Math.max(0, none),
  ];
  riskPieChart.update();
}

function updateFeatureChart(importance) {
  const entries = Object.entries(importance).sort((a, b) => b[1] - a[1]);
  featureBarChart.data.labels = entries.map(([k]) => k.replace(/_/g, ' '));
  featureBarChart.data.datasets[0].data = entries.map(([, v]) => v);
  featureBarChart.update();
}

function updateTrendChart(companies) {
  const byName = {};
  companies.forEach(c => {
    if (!c.risk_score) return;
    if (!byName[c.company_name]) byName[c.company_name] = [];
    byName[c.company_name].push({ year: c.year, score: c.risk_score });
  });

  const colors = ['#4f8ef7', '#22c55e', '#f59e0b', '#ef4444', '#a78bfa', '#34d399'];
  const datasets = Object.entries(byName).slice(0, 6).map(([name, pts], i) => {
    pts.sort((a, b) => a.year - b.year);
    return {
      label: name,
      data: pts.map(p => ({ x: p.year, y: p.score })),
      borderColor: colors[i % colors.length],
      backgroundColor: 'transparent',
      tension: 0.3,
      pointRadius: 4,
    };
  });

  const allYears = [...new Set(companies.filter(c => c.risk_score).map(c => c.year))].sort();
  trendLineChart.data.labels = allYears;
  trendLineChart.data.datasets = datasets;
  trendLineChart.update();
}

// ── Stats ─────────────────────────────────────────────────────────────────
async function loadStats() {
  try {
    const s = await apiFetch('/api/companies/stats');
    document.getElementById('statTotal').textContent = s.total;
    document.getElementById('statHigh').textContent = s.high_risk;
    document.getElementById('statMedium').textContent = s.medium_risk;
    document.getElementById('statLow').textContent = s.low_risk;
    document.getElementById('statAvg').textContent =
      s.avg_risk_score != null ? s.avg_risk_score.toFixed(1) : '—';
    updatePieChart(s);
  } catch (e) {
    console.error('Stats error:', e);
  }
}

// ── Companies table ───────────────────────────────────────────────────────
let allCompanies = [];

function riskClass(label) {
  if (!label) return 'none';
  if (label.includes('mic')) return 'low';
  if (label.includes('mediu')) return 'medium';
  if (label.includes('mare')) return 'high';
  return 'none';
}

function riskDot(label, score) {
  const cls = riskClass(label);
  const icon = { low: '🟢', medium: '🟡', high: '🔴', none: '⚪' }[cls];
  return `${icon} ${score != null ? score.toFixed(1) : '—'}`;
}

function bankruptDot(val) {
  if (val === 1) return '<span class="bankrupt-dot yes" title="Falimentat"></span> Da';
  if (val === 0) return '<span class="bankrupt-dot no" title="Sănătos"></span> Nu';
  return '<span class="bankrupt-dot unk" title="Necunoscut"></span> —';
}

function renderTable(companies) {
  const tbody = document.querySelector('#companiesTable tbody');
  if (!companies.length) {
    tbody.innerHTML = `<tr><td colspan="7">
      <div class="empty-state">
        <div class="icon">📂</div>
        <p>Nu există companii. Importați un fișier CSV pentru a începe.</p>
      </div>
    </td></tr>`;
    return;
  }

  tbody.innerHTML = companies.map(c => {
    const cls = riskClass(c.risk_label);
    return `<tr>
      <td>
        <div class="company-name">${escHtml(c.company_name)}</div>
        <div class="company-year">${c.year}</div>
      </td>
      <td>
        <span class="risk-badge ${cls}">
          ${{ low: '●', medium: '●', high: '●', none: '○' }[cls]}
          ${c.risk_label || 'Neevaluat'}
        </span>
      </td>
      <td>
        ${c.risk_score != null ? `
          <div>${c.risk_score.toFixed(1)}</div>
          <div class="progress-bar" style="width:100px">
            <div class="progress-fill ${cls}" style="width:${c.risk_score}%"></div>
          </div>` : '<span style="color:var(--text-muted)">—</span>'}
      </td>
      <td>${bankruptDot(c.is_bankrupt)}</td>
      <td>${c.indicators ? c.indicators.debt_ratio.toFixed(2) : '—'}</td>
      <td>${c.indicators ? c.indicators.current_ratio.toFixed(2) : '—'}</td>
      <td>
        <div style="display:flex;gap:6px">
          <button class="btn btn-secondary btn-sm" onclick="openDetail('${c.id}')">Detalii</button>
          <button class="btn btn-danger btn-sm" onclick="deleteCompany('${c.id}', this)">✕</button>
        </div>
      </td>
    </tr>`;
  }).join('');
}

function escHtml(str) {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

async function loadCompanies(search = '') {
  try {
    const url = `/api/companies/?limit=200${search ? `&search=${encodeURIComponent(search)}` : ''}`;
    const companies = await apiFetch(url);
    allCompanies = companies;
    renderTable(companies);
    updateTrendChart(companies);
  } catch (e) {
    toast('Eroare la încărcarea companiilor: ' + e.message, 'error');
  }
}

async function deleteCompany(id, btn) {
  if (!confirm('Ștergeți această companie?')) return;
  try {
    btn.disabled = true;
    await apiFetch(`/api/companies/${id}`, { method: 'DELETE' });
    toast('Companie ștearsă', 'success');
    await loadCompanies();
    await loadStats();
  } catch (e) {
    toast('Eroare la ștergere: ' + e.message, 'error');
    btn.disabled = false;
  }
}

// ── Detail Modal ──────────────────────────────────────────────────────────
async function openDetail(id) {
  const modal = document.getElementById('detailModal');
  modal.classList.add('open');
  document.getElementById('detailContent').innerHTML = '<div style="text-align:center;padding:2rem"><div class="spinner"></div></div>';

  try {
    const c = await apiFetch(`/api/companies/${id}`);
    const cls = riskClass(c.risk_label);

    const ind = c.indicators;
    const fields = [
      ['Lichiditate curentă', ind.current_ratio?.toFixed(3)],
      ['Lichiditate rapidă', ind.quick_ratio?.toFixed(3)],
      ['Rata datoriilor', ind.debt_ratio?.toFixed(3)],
      ['Datorii / Cap. propriu', ind.debt_to_equity?.toFixed(3)],
      ['Marja profit net (%)', ind.net_profit_margin?.toFixed(2)],
      ['ROA (%)', ind.return_on_assets?.toFixed(2)],
      ['ROE (%)', ind.return_on_equity?.toFixed(2)],
      ['Rotația activelor', ind.asset_turnover?.toFixed(3)],
      ['Fond rulment / Active', ind.working_capital_ratio?.toFixed(3)],
      ['Acoperire dobânzi', ind.interest_coverage?.toFixed(2)],
    ];

    document.getElementById('detailContent').innerHTML = `
      <div class="score-display">
        <div class="score-number ${cls}">${c.risk_score != null ? c.risk_score.toFixed(1) : '—'}</div>
        <div class="score-label">${c.risk_label || 'Neevaluat'}</div>
        <div style="color:var(--text-muted);font-size:.8rem;margin-top:4px">${c.company_name} · ${c.year}</div>
      </div>
      <div class="detail-grid">
        ${fields.map(([k, v]) => `
          <div class="detail-item">
            <div class="key">${k}</div>
            <div class="val">${v ?? '—'}</div>
          </div>`).join('')}
      </div>
      <div style="display:flex;gap:.75rem;justify-content:flex-end">
        <button class="btn btn-primary" onclick="predictCompany('${id}')">
          🔮 Re-calculează risc
        </button>
      </div>`;
  } catch (e) {
    document.getElementById('detailContent').innerHTML = `<p style="color:var(--danger)">Eroare: ${e.message}</p>`;
  }
}

function closeDetailModal() {
  document.getElementById('detailModal').classList.remove('open');
}

async function predictCompany(id) {
  try {
    const res = await apiFetch(`/api/companies/${id}/predict`, { method: 'POST' });
    toast(`Scor actualizat: ${res.risk_score.toFixed(1)} — ${res.risk_label}`, 'success');
    await openDetail(id);
    await loadCompanies();
    await loadStats();
  } catch (e) {
    toast('Eroare predicție: ' + e.message, 'error');
  }
}

// ── CSV Upload ────────────────────────────────────────────────────────────
let selectedFile = null;

function initUpload() {
  const zone = document.getElementById('uploadZone');
  const input = document.getElementById('fileInput');

  zone.addEventListener('click', () => input.click());

  zone.addEventListener('dragover', e => {
    e.preventDefault();
    zone.classList.add('drag-over');
  });
  zone.addEventListener('dragleave', () => zone.classList.remove('drag-over'));
  zone.addEventListener('drop', e => {
    e.preventDefault();
    zone.classList.remove('drag-over');
    const f = e.dataTransfer.files[0];
    if (f) selectFile(f);
  });

  input.addEventListener('change', () => {
    if (input.files[0]) selectFile(input.files[0]);
  });
}

function selectFile(f) {
  selectedFile = f;
  document.getElementById('fileName').textContent = `📄 ${f.name} (${(f.size / 1024).toFixed(1)} KB)`;
  document.getElementById('uploadBtn').disabled = false;
}

async function uploadCSV() {
  if (!selectedFile) return;
  const btn = document.getElementById('uploadBtn');
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Se importă...';

  const form = new FormData();
  form.append('file', selectedFile);

  try {
    const res = await fetch(API + '/api/upload/csv', { method: 'POST', body: form });
    const body = await res.json();
    if (!res.ok) throw new Error(body.detail || `HTTP ${res.status}`);

    toast(
      `✓ ${body.imported} companii importate${body.predictions_applied ? ' cu scoruri de risc' : ' (antrenați modelul pentru scoruri)'}`,
      'success', 6000
    );
    selectedFile = null;
    document.getElementById('fileName').textContent = '';
    document.getElementById('fileInput').value = '';
    await loadCompanies();
    await loadStats();
  } catch (e) {
    toast('Eroare import: ' + e.message, 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '⬆ Importă CSV';
  }
}

// ── ML Training ───────────────────────────────────────────────────────────
async function trainModel() {
  const btn = document.getElementById('trainBtn');
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Se antrenează...';

  try {
    const res = await apiFetch('/api/ml/train', { method: 'POST' });
    toast(
      `Model antrenat! AUC-ROC: ${(res.auc_roc * 100).toFixed(1)}% · Acuratețe: ${(res.accuracy * 100).toFixed(1)}%`,
      'success', 6000
    );
    document.getElementById('metricsPanel').style.display = 'block';
    document.getElementById('metAccuracy').textContent = (res.accuracy * 100).toFixed(1) + '%';
    document.getElementById('metPrecision').textContent = (res.precision * 100).toFixed(1) + '%';
    document.getElementById('metRecall').textContent = (res.recall * 100).toFixed(1) + '%';
    document.getElementById('metF1').textContent = (res.f1_score * 100).toFixed(1) + '%';
    document.getElementById('metAUC').textContent = (res.auc_roc * 100).toFixed(1) + '%';
    document.getElementById('metSamples').textContent = res.n_samples;
    updateFeatureChart(res.feature_importance);

    await predictAllCompanies();
  } catch (e) {
    toast('Eroare antrenare: ' + e.message, 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '🧠 Antrenează Model';
  }
}

async function predictAllCompanies() {
  try {
    const res = await apiFetch('/api/ml/predict-all', { method: 'POST' });
    toast(`Scoruri recalculate pentru ${res.updated} companii`, 'info');
    await loadCompanies();
    await loadStats();
  } catch (e) {
    console.warn('predict-all:', e.message);
  }
}

// ── Model Info ────────────────────────────────────────────────────────────
async function checkModelStatus() {
  try {
    const info = await apiFetch('/api/ml/model-info');
    const badge = document.getElementById('modelBadge');
    if (info.model_trained) {
      badge.textContent = '✓ Model antrenat';
      badge.style.color = 'var(--success)';
      badge.style.borderColor = 'var(--success)';
      if (info.feature_importance) updateFeatureChart(info.feature_importance);
      document.getElementById('metricsPanel').style.display = 'block';
    } else {
      badge.textContent = '⚠ Model neantrenat';
      badge.style.color = 'var(--warning)';
      badge.style.borderColor = 'var(--warning)';
    }
  } catch (e) {
    console.warn('Model info error:', e);
  }
}

// ── Search ────────────────────────────────────────────────────────────────
let searchTimer = null;
function onSearch(val) {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => loadCompanies(val), 300);
}

// ── Init ──────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  initCharts();
  initUpload();
  await Promise.all([loadStats(), loadCompanies(), checkModelStatus()]);
});
