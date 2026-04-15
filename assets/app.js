// =========================================================
// FlexiPay × Yuno — Dashboard
// Tab router · Charts · War Room (4 modules)
// =========================================================

// --- Color scale: YUNO navy + blue gradient + danger red -----
const C = {
  navy:    '#282A30',
  navySoft:'#4B5563',
  blue900: '#003D7A',
  blue700: '#0052A8',
  blue:    '#0066CC',
  blue500: '#2F86D6',
  blue300: '#66A8E3',
  blue100: '#A3C9EE',
  blueBg:  'rgba(0, 102, 204, 0.08)',
  blueBgStrong: 'rgba(0, 102, 204, 0.15)',
  danger:  '#9B2C2C',
  dangerBg:'rgba(155, 44, 44, 0.12)',
  grid:    'rgba(40, 42, 48, 0.08)',
  text:    '#6B7280',
  textStrong: '#282A30',
  textMute:'#9CA3AF',
};

Chart.defaults.color = C.text;
Chart.defaults.font.family = "'Inter', system-ui, sans-serif";
Chart.defaults.font.size = 11;
Chart.defaults.borderColor = C.grid;

// --- formatters ----
const fmtMoney = v => {
  if (Math.abs(v) >= 1e6) return '$' + (v/1e6).toFixed(2) + 'M';
  if (Math.abs(v) >= 1e3) return '$' + Math.round(v/1e3) + 'K';
  return '$' + Math.round(v);
};
const fmtMoneyFull = v => '$' + Math.round(v).toLocaleString('en-US');
const fmtSigned = v => (v >= 0 ? '+' : '−') + fmtMoneyFull(Math.abs(v));

// --- global state -----
let MODEL = null;
let activeTab = 'overview';
let activeScenario = 1;
let chartsInit = { qbr: false, expansion: false, retention: false };
let brChart, arChart;
let objState = { category: 'All', stakeholder: 'All', activeId: null };

// =========================================================
// BOOT
// =========================================================
async function boot() {
  const r = await fetch('data/model.json');
  MODEL = await r.json();

  initTabs();
  initWarRoom();

  const tab = new URLSearchParams(location.search).get('tab') || 'overview';
  setTab(tab);
}

// =========================================================
// TAB ROUTER
// =========================================================
function initTabs() {
  // Top nav buttons
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => setTab(btn.dataset.tab));
  });
  // In-page nav buttons (summary cards, CTAs)
  document.querySelectorAll('[data-nav]').forEach(el => {
    el.addEventListener('click', () => setTab(el.dataset.nav));
  });
}

function setTab(tab) {
  const valid = ['overview','qbr','expansion','retention','memo','warroom'];
  if (!valid.includes(tab)) tab = 'overview';
  activeTab = tab;

  document.querySelectorAll('.tab-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.tab === tab);
  });
  document.querySelectorAll('.view').forEach(v => {
    v.classList.toggle('active', v.dataset.view === tab);
  });

  // URL persistence
  const url = new URL(location.href);
  url.searchParams.set('tab', tab);
  history.replaceState(null, '', url.toString());

  // Lazy init charts — only when the tab is first opened
  if (tab === 'qbr' && !chartsInit.qbr) { initQBRCharts(); chartsInit.qbr = true; }
  if (tab === 'expansion' && !chartsInit.expansion) { initExpansionCharts(); chartsInit.expansion = true; }
  if (tab === 'retention' && !chartsInit.retention) { initWaterfallChart(); chartsInit.retention = true; }

  window.scrollTo({ top: 0, behavior: 'instant' });
}

// =========================================================
// QBR CHARTS — blue scale
// =========================================================
function initQBRCharts() {
  const tpv = MODEL.tpv_history;
  const months = tpv.map(t => t.month);

  // TPV stacked — 4 blue tones (darkest = biggest market MX)
  new Chart(document.getElementById('tpvChart'), {
    type: 'bar',
    data: {
      labels: months,
      datasets: [
        { label: 'Mexico',   data: tpv.map(t => t.MX), backgroundColor: C.blue700, stack: 'a', borderRadius: 2 },
        { label: 'Colombia', data: tpv.map(t => t.CO), backgroundColor: C.blue,    stack: 'a', borderRadius: 2 },
        { label: 'Chile',    data: tpv.map(t => t.CL), backgroundColor: C.blue300, stack: 'a', borderRadius: 2 },
        { label: 'Peru',     data: tpv.map(t => t.PE), backgroundColor: C.blue100, stack: 'a', borderRadius: 2 },
      ],
    },
    options: baseOpts({
      stacked: true,
      yTicks: v => '$' + v + 'M',
      tooltipLabel: ctx => ctx.dataset.label + ': $' + ctx.parsed.y.toFixed(1) + 'M',
      tooltipFooter: items => 'Total: $' + items.reduce((a, i) => a + i.parsed.y, 0).toFixed(1) + 'M',
    }),
  });

  // Yuno revenue line — single blue
  new Chart(document.getElementById('revChart'), {
    type: 'line',
    data: {
      labels: months,
      datasets: [{
        label: 'Monthly Yuno revenue',
        data: tpv.map(t => t.yuno_rev),
        borderColor: C.blue,
        backgroundColor: C.blueBgStrong,
        fill: true,
        tension: 0.35,
        pointRadius: 4,
        pointBackgroundColor: C.blue,
        pointBorderColor: '#FFFFFF',
        pointBorderWidth: 2,
        borderWidth: 2.5,
      }]
    },
    options: baseOpts({
      legend: false,
      yTicks: v => '$' + (v/1000) + 'K',
      tooltipLabel: ctx => fmtMoneyFull(ctx.parsed.y),
    }),
  });

  // Approval gap — red flags on gaps >5pt, blue shades otherwise
  const gap = MODEL.approval_gap;
  new Chart(document.getElementById('approvalChart'), {
    type: 'bar',
    data: {
      labels: gap.map(g => g.market),
      datasets: [
        {
          label: 'Current approval',
          data: gap.map(g => g.current),
          backgroundColor: gap.map(g => g.gap <= -5 ? C.danger : g.gap <= -3 ? C.blue500 : C.blue),
          borderRadius: 4,
        },
        {
          label: 'Benchmark (80%)',
          data: gap.map(() => 80),
          type: 'line',
          borderColor: C.navy,
          borderDash: [5, 5],
          borderWidth: 2,
          pointRadius: 0,
          fill: false,
        }
      ]
    },
    options: baseOpts({
      yMin: 65, yMax: 85,
      yTicks: v => v + '%',
      tooltipLabel: ctx => {
        if (ctx.dataset.label === 'Benchmark (80%)') return 'Benchmark: 80%';
        const g = gap[ctx.dataIndex];
        return `${g.current}% (gap: ${g.gap > 0 ? '+' : ''}${g.gap}pt)`;
      },
    }),
  });

  // Unlock — single blue bar
  new Chart(document.getElementById('unlockChart'), {
    type: 'bar',
    data: {
      labels: gap.map(g => g.market),
      datasets: [{
        label: 'Monthly TPV unlock',
        data: gap.map(g => g.monthly_unlock),
        backgroundColor: gap.map(g => g.gap <= -5 ? C.danger : C.blue),
        borderRadius: 4,
      }]
    },
    options: baseOpts({
      legend: false,
      yTicks: v => '$' + v.toFixed(2) + 'M',
      tooltipLabel: ctx => '$' + ctx.parsed.y.toFixed(2) + 'M/month',
      tooltipFooter: items => 'Annual: $' + (items[0].parsed.y * 12).toFixed(2) + 'M',
    }),
  });
}

// =========================================================
// EXPANSION CHARTS
// =========================================================
function initExpansionCharts() {
  const s = MODEL.expansion.scenarios;
  const scen = s[activeScenario];
  const brMonths = ['M1','M2','M3','M4','M5','M6'];
  const ramp = (m1, m3, m6) => [m1, (m1+m3)/2, m3, (m3+m6)*0.45, (m3+m6)*0.47, m6];

  brChart = new Chart(document.getElementById('brRampChart'), {
    type: 'line',
    data: {
      labels: brMonths,
      datasets: [{
        label: 'Brazil TPV',
        data: ramp(scen.br_m1, scen.br_m3, scen.br_m6),
        borderColor: C.blue700,
        backgroundColor: C.blueBgStrong,
        fill: true,
        tension: 0.3,
        pointRadius: 5,
        pointBackgroundColor: C.blue700,
        pointBorderColor: '#FFFFFF',
        pointBorderWidth: 2,
        borderWidth: 2.5,
      }]
    },
    options: baseOpts({
      legend: false,
      yTicks: v => '$' + v + 'M',
      yBeginAtZero: true,
      tooltipLabel: ctx => '$' + ctx.parsed.y.toFixed(1) + 'M',
    }),
  });

  arChart = new Chart(document.getElementById('arRampChart'), {
    type: 'line',
    data: {
      labels: brMonths,
      datasets: [{
        label: 'Argentina TPV',
        data: ramp(scen.ar_m1, scen.ar_m3, scen.ar_m6),
        borderColor: C.blue,
        backgroundColor: C.blueBg,
        fill: true,
        tension: 0.3,
        pointRadius: 5,
        pointBackgroundColor: C.blue,
        pointBorderColor: '#FFFFFF',
        pointBorderWidth: 2,
        borderWidth: 2.5,
      }]
    },
    options: baseOpts({
      legend: false,
      yTicks: v => '$' + v + 'M',
      yBeginAtZero: true,
      tooltipLabel: ctx => '$' + ctx.parsed.y.toFixed(1) + 'M',
    }),
  });

  new Chart(document.getElementById('revImpactChart'), {
    type: 'bar',
    data: {
      labels: s.map(sc => sc.name),
      datasets: [
        {
          label: 'Yuno Year 1 incremental revenue',
          data: s.map(sc => sc.yuno_y1_total),
          backgroundColor: C.blue700,
          borderRadius: 4,
        },
        {
          label: 'FlexiPay Year 1 net upside',
          data: s.map(sc => sc.flexipay_y1_total),
          backgroundColor: C.blue300,
          borderRadius: 4,
        },
      ]
    },
    options: baseOpts({
      yTicks: v => fmtMoney(v),
      tooltipLabel: ctx => ctx.dataset.label + ': ' + fmtMoneyFull(ctx.parsed.y),
    }),
  });

  // Scenario tabs
  document.querySelectorAll('.scenario-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.scenario-tab').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeScenario = parseInt(btn.dataset.scenario);
      const sc = MODEL.expansion.scenarios[activeScenario];
      brChart.data.datasets[0].data = ramp(sc.br_m1, sc.br_m3, sc.br_m6);
      arChart.data.datasets[0].data = ramp(sc.ar_m1, sc.ar_m3, sc.ar_m6);
      brChart.update();
      arChart.update();
      updateScenarioMetrics();
    });
  });

  updateScenarioMetrics();
}

function updateScenarioMetrics() {
  const s = MODEL.expansion.scenarios[activeScenario];
  document.getElementById('yunoY1').textContent = fmtMoneyFull(s.yuno_y1_total);
  document.getElementById('flexY1').textContent = '$' + (s.flexipay_y1_total/1e6).toFixed(2) + 'M';
  document.getElementById('m6Rev').textContent = fmtMoneyFull(s.m6_monthly_rev) + '/mo';
  document.getElementById('multiple').textContent = (s.flexipay_y1_total / 427920).toFixed(1) + '×';
  document.getElementById('brRampLabel').textContent = s.name + ' scenario';
  document.getElementById('arRampLabel').textContent = s.name + ' scenario';
}

// =========================================================
// WATERFALL — blue for savings, red for net, navy for costs
// =========================================================
function initWaterfallChart() {
  const c = MODEL.competitive;
  const labels = [
    'dLocal\nheadline\nsavings',
    'Re-integration\nengineering',
    'Brazil\nlaunch\ndelay',
    'Approval\nrate risk',
    'Token\nmigration',
    'Commitment\novershoot',
    'NET Y1\nimpact'
  ];
  const values = [
    c.headline_savings,
    -c.switching_costs[0].amount,
    -c.switching_costs[1].amount,
    -c.switching_costs[2].amount,
    -c.switching_costs[3].amount,
    -c.switching_costs[4].amount,
    c.headline_savings - c.total_switching,
  ];
  const colors = values.map((_, i) => {
    if (i === 0) return C.blue;
    if (i === labels.length - 1) return C.danger;
    return C.navySoft;
  });

  new Chart(document.getElementById('waterfallChart'), {
    type: 'bar',
    data: {
      labels,
      datasets: [{ label: 'Year 1 impact', data: values, backgroundColor: colors, borderRadius: 4 }]
    },
    options: baseOpts({
      legend: false,
      xTicks: { font: { size: 10 } },
      yTicks: v => fmtMoney(v),
      tooltipLabel: ctx => fmtMoneyFull(ctx.parsed.y),
    }),
  });
}

// =========================================================
// Shared chart options builder
// =========================================================
function baseOpts(o = {}) {
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: o.legend === false ? { display: false } : {
        position: 'bottom',
        labels: { boxWidth: 10, padding: 14, font: { size: 11 } },
      },
      tooltip: {
        backgroundColor: '#FFFFFF',
        titleColor: C.textStrong,
        bodyColor: C.text,
        borderColor: C.grid,
        borderWidth: 1,
        padding: 12,
        titleFont: { weight: '700', size: 12 },
        bodyFont: { size: 12 },
        displayColors: true,
        boxPadding: 4,
        callbacks: {
          label: o.tooltipLabel || undefined,
          footer: o.tooltipFooter || undefined,
        },
      },
    },
    scales: {
      x: {
        stacked: !!o.stacked,
        grid: { display: false, drawBorder: false },
        ticks: o.xTicks || { font: { size: 11 } },
      },
      y: {
        stacked: !!o.stacked,
        beginAtZero: !!o.yBeginAtZero,
        min: o.yMin,
        max: o.yMax,
        grid: { color: C.grid, drawBorder: false },
        ticks: { callback: o.yTicks || (v => v), font: { size: 11 } },
      },
    },
  };
}

// =========================================================
// WAR ROOM — 4 modules
// =========================================================
function initWarRoom() {
  // War Room sub-tab switcher
  document.querySelectorAll('.war-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.war-tab').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      document.querySelectorAll('.war-mod').forEach(m => m.classList.add('hidden'));
      document.getElementById('warmod-' + btn.dataset.warmod).classList.remove('hidden');
    });
  });

  initObjectionHandler();
  initPlanBModule();
  initQBRScriptModule();
  initConcessionCalculator();
}

// ---- Objection Handler ----
function initObjectionHandler() {
  const objs = MODEL.objection_bank;
  const categories = ['All', ...new Set(objs.map(o => o.category))];
  const stakes = ['All', ...new Set(objs.map(o => o.stakeholder))];

  // Build filter pills
  const catFilter = document.getElementById('objCategoryFilter');
  categories.forEach(cat => {
    const b = document.createElement('button');
    b.className = 'filter-pill' + (cat === 'All' ? ' active' : '');
    b.textContent = cat;
    b.dataset.value = cat;
    b.addEventListener('click', () => {
      catFilter.querySelectorAll('.filter-pill').forEach(x => x.classList.remove('active'));
      b.classList.add('active');
      objState.category = cat;
      renderObjList();
    });
    catFilter.appendChild(b);
  });

  const stakeFilter = document.getElementById('objStakeFilter');
  stakes.forEach(stake => {
    const b = document.createElement('button');
    b.className = 'filter-pill' + (stake === 'All' ? ' active' : '');
    b.textContent = stake;
    b.dataset.value = stake;
    b.addEventListener('click', () => {
      stakeFilter.querySelectorAll('.filter-pill').forEach(x => x.classList.remove('active'));
      b.classList.add('active');
      objState.stakeholder = stake;
      renderObjList();
    });
    stakeFilter.appendChild(b);
  });

  renderObjList();
  renderObjDetail(objs[0]);
  objState.activeId = objs[0].id;
}

function renderObjList() {
  const list = document.getElementById('objList');
  const filtered = MODEL.objection_bank.filter(o =>
    (objState.category === 'All' || o.category === objState.category) &&
    (objState.stakeholder === 'All' || o.stakeholder === objState.stakeholder)
  );
  if (filtered.length === 0) {
    list.innerHTML = '<div style="padding:24px;text-align:center;color:#9CA3AF;font-size:13px">No objections match this filter.</div>';
    return;
  }
  list.innerHTML = filtered.map(o => `
    <div class="obj-item ${o.id === objState.activeId ? 'active' : ''}" data-id="${o.id}">
      <div class="obj-item-cat">${o.category}</div>
      <div class="obj-item-text">${o.objection}</div>
      <div class="obj-item-stake">${o.stakeholder}</div>
    </div>
  `).join('');
  list.querySelectorAll('.obj-item').forEach(el => {
    el.addEventListener('click', () => {
      const obj = MODEL.objection_bank.find(o => o.id === el.dataset.id);
      objState.activeId = obj.id;
      list.querySelectorAll('.obj-item').forEach(x => x.classList.remove('active'));
      el.classList.add('active');
      renderObjDetail(obj);
    });
  });
  // Auto-select first if current active not in filtered list
  if (!filtered.find(o => o.id === objState.activeId)) {
    objState.activeId = filtered[0].id;
    list.querySelector('.obj-item').classList.add('active');
    renderObjDetail(filtered[0]);
  }
}

function renderObjDetail(obj) {
  const el = document.getElementById('objDetail');
  el.innerHTML = `
    <div class="obj-detail-meta">
      <span class="obj-detail-badge cat">${obj.category}</span>
      <span class="obj-detail-badge stake">${obj.stakeholder}</span>
    </div>
    <div class="obj-detail-quote">"${obj.objection}"</div>
    <div class="obj-detail-short">${obj.short_answer}</div>
    <div class="obj-detail-full">${obj.full_response}</div>
    <div class="obj-detail-numbers">
      ${obj.numbers_to_cite.map(n => `<span class="obj-number-chip">${n}</span>`).join('')}
    </div>
  `;
}

// ---- Plan B Module ----
function initPlanBModule() {
  const picker = document.getElementById('planBPicker');
  MODEL.plan_b_scenarios.forEach((p, i) => {
    const btn = document.createElement('button');
    btn.className = 'plan-btn' + (i === 0 ? ' active' : '');
    btn.dataset.plan = i;
    btn.innerHTML = `${p.trigger}<span class="prob">Probability: ${p.probability}</span>`;
    btn.addEventListener('click', () => {
      document.querySelectorAll('.plan-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderPlanB(i);
    });
    picker.appendChild(btn);
  });
  renderPlanB(0);
}

function renderPlanB(idx) {
  const p = MODEL.plan_b_scenarios[idx];
  document.getElementById('planBOutput').innerHTML = `
    <h5>${p.trigger}</h5>
    <div class="ai-metrics">
      <div class="ai-metric">
        <div class="ai-metric-label">Base probability</div>
        <div class="ai-metric-value">${p.probability}</div>
      </div>
      <div class="ai-metric">
        <div class="ai-metric-label">Win probability after plan</div>
        <div class="ai-metric-value">${p.estimated_win_probability}</div>
      </div>
    </div>
    <div class="ai-analysis">${p.ai_analysis}</div>
    <ul class="ai-bullets">${p.response_plan.map(r => `<li>${r}</li>`).join('')}</ul>
  `;
}

// ---- QBR Script Module ----
function initQBRScriptModule() {
  const picker = document.getElementById('stakePicker');
  MODEL.qbr_scripts.forEach((s, i) => {
    const btn = document.createElement('button');
    btn.className = 'stake-btn' + (i === 1 ? ' active' : '');
    btn.textContent = s.stakeholder;
    btn.dataset.stake = i;
    btn.addEventListener('click', () => {
      document.querySelectorAll('.stake-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderQBRScript(i);
    });
    picker.appendChild(btn);
  });
  renderQBRScript(1); // default Daniela
}

function renderQBRScript(idx) {
  const s = MODEL.qbr_scripts[idx];
  document.getElementById('qbrOutput').innerHTML = `
    <h5>${s.stakeholder}</h5>
    <div class="ai-role">${s.role}</div>
    <div class="ai-tone">Tone: ${s.tone}</div>
    <div class="ai-hook">"${s.opening_hook}"</div>
    <ul class="ai-bullets">${s.three_bullets.map(b => `<li>${b}</li>`).join('')}</ul>
    <div class="ai-close">"${s.close}"</div>
  `;
}

// ---- Concession Calculator ----
function initConcessionCalculator() {
  const cardEl = document.getElementById('cardRate');
  const pixEl = document.getElementById('pixRate');
  const platformEl = document.getElementById('platformFee');

  [cardEl, pixEl, platformEl].forEach(el => el.addEventListener('input', recalc));

  // Presets
  document.querySelectorAll('.calc-preset').forEach(btn => {
    btn.addEventListener('click', () => applyPreset(btn.dataset.preset));
  });

  recalc();
}

function applyPreset(name) {
  const presets = {
    hold:        { card: 0.85, pix: 0.55, platform: 2000 },
    recommended: { card: 0.85, pix: 0.50, platform: 0 },
    aggressive:  { card: 0.80, pix: 0.50, platform: 0 },
    dlocal:      { card: 0.67, pix: 0.50, platform: 0 },
  };
  const p = presets[name];
  if (!p) return;
  document.getElementById('cardRate').value = p.card;
  document.getElementById('pixRate').value = p.pix;
  document.getElementById('platformFee').value = p.platform;
  recalc();
}

function recalc() {
  const cardRate = parseFloat(document.getElementById('cardRate').value);     // e.g. 0.85
  const pixRate = parseFloat(document.getElementById('pixRate').value);       // e.g. 0.55
  const platformFee = parseFloat(document.getElementById('platformFee').value); // e.g. 2000 per month

  // Update labels
  document.getElementById('cardRateVal').textContent = cardRate.toFixed(2) + '%';
  document.getElementById('pixRateVal').textContent = pixRate.toFixed(2) + '%';
  document.getElementById('platformVal').textContent = platformFee === 0 ? 'Waived' : '$' + platformFee.toLocaleString() + '/mo';

  // Current (non-expansion) revenue
  const CARDS_TPV = 18.7;   // $M/mo Jan
  const LOCAL_TPV = 2.0;
  const LOCAL_RATE = 0.65;  // held constant
  const currentYunoRev =
    CARDS_TPV * (cardRate/100) * 12 * 1e6 +
    LOCAL_TPV * (LOCAL_RATE/100) * 12 * 1e6 +
    platformFee * 12;

  // Baseline (hold-the-line) for comparison
  const baselineYunoRev =
    CARDS_TPV * 0.0085 * 12 * 1e6 +
    LOCAL_TPV * 0.0065 * 12 * 1e6 +
    2000 * 12;  // = 2,087,400

  const concession = baselineYunoRev - currentYunoRev;

  // With Base case BR/AR expansion — PIX revenue responds to pix rate
  const baseScen = MODEL.expansion.scenarios[1]; // Base
  // Base case BR PIX rev at 0.55% default: ~$363K. Scale proportionally.
  const pixYunoRev = 363000 * (pixRate / 0.55);
  const brCardYunoRev = baseScen.yuno_y1_br - 363000; // card portion of BR base
  const nextYearYuno = currentYunoRev + pixYunoRev + brCardYunoRev + baseScen.yuno_y1_ar;

  // vs dLocal
  const dlocalAnnual = MODEL.concession_rules.dlocal_annual_cost;
  const vsDlocal = currentYunoRev - dlocalAnnual;

  // Update DOM
  document.getElementById('calcYunoRev').textContent = fmtMoneyFull(Math.round(currentYunoRev));
  document.getElementById('calcYunoDelta').textContent = concession === 0 ? 'Baseline' : (concession > 0 ? 'Concession: −' : 'Premium: +') + fmtMoneyFull(Math.abs(Math.round(concession)));

  document.getElementById('calcYunoNext').textContent = fmtMoneyFull(Math.round(nextYearYuno));
  const expansionIncrement = nextYearYuno - currentYunoRev;
  document.getElementById('calcYunoNextDelta').textContent = '+ ' + fmtMoneyFull(Math.round(expansionIncrement)) + ' expansion';

  document.getElementById('calcConcession').textContent = fmtMoneyFull(Math.max(0, Math.round(concession)));
  const concessionPct = (Math.max(0, concession) / baselineYunoRev * 100);
  document.getElementById('calcConcessionPct').textContent = concessionPct.toFixed(1) + '% of baseline ARR';

  document.getElementById('calcVsDlocal').textContent = fmtSigned(Math.round(vsDlocal));
  document.getElementById('calcVsDlocalLabel').textContent =
    vsDlocal > 0 ? 'Yuno still more expensive' :
    vsDlocal < 0 ? 'Yuno now cheaper than dLocal' :
    'Parity with dLocal';

  // Verdict logic
  const verdict = document.getElementById('calcVerdict');
  const verdictText = verdict.querySelector('.verdict-text');
  const verdictIcon = verdict.querySelector('.verdict-icon');
  verdict.classList.remove('good','warn','danger');

  // Floor warning
  const floorWarn = document.getElementById('calcFloorWarning');
  if (cardRate < 0.78) {
    floorWarn.classList.remove('hidden');
    verdict.classList.add('danger');
    verdictIcon.textContent = '●';
    verdictText.innerHTML = `
      <strong>Below pricing floor.</strong>
      Card rate at ${cardRate.toFixed(2)}% is below the $0.78% floor set by VP.
      This sets a precedent that resets LatAm pricing for all accounts.
      Do not go here unless explicitly authorized.
    `;
  } else if (concession > 100000) {
    floorWarn.classList.add('hidden');
    verdict.classList.add('warn');
    verdictIcon.textContent = '◐';
    verdictText.innerHTML = `
      <strong>Heavy concession.</strong>
      Annual give of ${fmtMoneyFull(Math.round(concession))} is above the $75K VP-approved envelope.
      Justify carefully — the expansion revenue still covers it, but you're eating into margin.
    `;
  } else if (concession > 0) {
    floorWarn.classList.add('hidden');
    verdict.classList.add('good');
    verdictIcon.textContent = '●';
    const roi = (expansionIncrement / concession).toFixed(1);
    verdictText.innerHTML = `
      <strong>Recommended package territory.</strong>
      ${fmtMoneyFull(Math.round(concession))} of concessions, fully recovered by
      ${fmtMoneyFull(Math.round(expansionIncrement))} of Base-case expansion revenue.
      ROI on the concession: ${roi}×.
    `;
  } else {
    floorWarn.classList.add('hidden');
    verdict.classList.add('good');
    verdictIcon.textContent = '○';
    verdictText.innerHTML = `
      <strong>Hold the line.</strong>
      No concessions applied. Yuno is ${fmtMoneyFull(Math.abs(Math.round(vsDlocal)))}/yr more expensive than dLocal on paper,
      but that gap is justified by $1.13M of switching costs and $951K of expansion upside.
    `;
  }
}

// =========================================================
// Boot
// =========================================================
boot().catch(err => {
  console.error('Boot failed', err);
  document.body.innerHTML = '<div style="padding:40px;color:#9B2C2C;font-family:Inter,system-ui">Failed to load model.json. If opening via file://, serve with http instead.</div>';
});
