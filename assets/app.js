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
let chartsInit = { qbr: false, expansion: false, retention: false, situation: false };
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
  const valid = ['overview','situation','qbr','expansion','retention','memo','warroom'];
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

  // Lazy init per tab
  if (tab === 'situation' && !chartsInit.situation) { initSituation(); chartsInit.situation = true; }
  if (tab === 'qbr' && !chartsInit.qbr) { initQBRCharts(); initQBREnrichments(); chartsInit.qbr = true; }
  if (tab === 'expansion' && !chartsInit.expansion) { initExpansionCharts(); chartsInit.expansion = true; }
  if (tab === 'retention' && !chartsInit.retention) { initWaterfallChart(); chartsInit.retention = true; }

  window.scrollTo({ top: 0, behavior: 'instant' });
}

// =========================================================
// SITUATION TAB — render all strategic framework data
// =========================================================
function initSituation() {
  const s = MODEL.situation;

  // Executive brief
  document.getElementById('execBrief').textContent = s.executive_brief;

  // 4 forces
  document.getElementById('forcesGrid').innerHTML = s.four_forces.map(f => `
    <div class="force-card">
      <div class="force-head">
        <div class="force-name">${f.name}</div>
        <div class="force-owner">${f.owner}</div>
      </div>
      <div class="force-data">${f.data}</div>
      <div class="force-pull" data-label="PULL">${f.pull}</div>
      <div class="force-tension" data-label="TENSION">${f.tension}</div>
    </div>
  `).join('');

  // MEDDPICC
  document.getElementById('meddpiccGrid').innerHTML = s.meddpicc.map(m => `
    <div class="meddpicc-row">
      <div class="meddpicc-letter">${m.letter}</div>
      <div class="meddpicc-label">${m.label}</div>
      <div class="meddpicc-filled">${m.filled}</div>
    </div>
  `).join('');

  // Stakeholder matrix
  const plot = document.getElementById('matrixPlot');
  plot.innerHTML = `
    <div class="matrix-axis-x">Interest →</div>
    <div class="matrix-axis-y">Power →</div>
    <div class="matrix-quadrant matrix-q-tl">Keep satisfied</div>
    <div class="matrix-quadrant matrix-q-tr">Manage closely</div>
    <div class="matrix-quadrant matrix-q-bl">Monitor</div>
    <div class="matrix-quadrant matrix-q-br">Keep informed</div>
  ` + s.stakeholder_matrix.map(st => `
    <div class="matrix-point ${st.strategy.toLowerCase()}" style="left: ${st.position.x}%; bottom: ${st.position.y}%;">
      <div class="mp-name">${st.name.split(' ')[0]}</div>
      <div class="mp-role">${st.role.split(' ')[0]}</div>
    </div>
  `).join('');

  document.getElementById('matrixLegend').innerHTML = s.stakeholder_matrix.map(st => `
    <div class="legend-card ${st.strategy.toLowerCase()}">
      <div class="legend-head">
        <div class="legend-name">${st.name} · <span style="color: var(--text-mute); font-weight: 500;">${st.role}</span></div>
        <div class="legend-strategy">${st.strategy}</div>
      </div>
      <div class="legend-tactic">${st.tactic}</div>
    </div>
  `).join('');

  // Value pyramid
  document.getElementById('valuePyramid').innerHTML = s.value_pyramid.map((v, i) => `
    <div class="pyramid-level l${v.rank}">
      <div class="pyramid-header">
        <div class="pyramid-tier">TIER ${v.rank}</div>
        <div class="pyramid-level-name">${v.level}</div>
        <div class="pyramid-wins ${v.yuno_wins ? 'yes' : 'no'}">${v.yuno_wins ? '✓ Yuno wins' : 'dLocal competes'}</div>
      </div>
      <div class="pyramid-vs">
        <strong>Yuno</strong>
        ${v.yuno_value}
      </div>
      <div class="pyramid-vs">
        <strong>dLocal</strong>
        ${v.dlocal_value}
        ${v.note ? `<div style="margin-top:10px;padding:10px;background:var(--blue-bg);border-radius:4px;font-size:11px;color:var(--blue-700);"><strong style="display:block;color:var(--blue);text-transform:uppercase;font-size:9px;letter-spacing:0.08em;margin-bottom:4px;">Implication</strong>${v.note}</div>` : ''}
      </div>
    </div>
  `).join('');

  // Key principles
  document.getElementById('principlesGrid').innerHTML = s.key_principles.map((p, i) => `
    <div class="principle-card">
      <div class="principle-num">PRINCIPLE ${String(i+1).padStart(2, '0')}</div>
      <div class="principle-title">${p.principle}</div>
      <div class="principle-explanation">${p.explanation}</div>
    </div>
  `).join('');

  // Risk register
  const scoreClass = score => score >= 10 ? 'critical' : score >= 7 ? 'high' : score >= 5 ? 'med' : 'low';
  document.getElementById('riskTable').innerHTML = `
    <thead>
      <tr>
        <th style="width:60px;">ID</th>
        <th>Risk</th>
        <th style="width:90px;">Prob.</th>
        <th style="width:90px;">Impact</th>
        <th style="width:70px;">Score</th>
        <th>Mitigation</th>
        <th style="width:140px;">Owner</th>
      </tr>
    </thead>
    <tbody>
      ${s.risk_register.map(r => `
        <tr class="risk-row">
          <td><span class="risk-id">${r.id}</span></td>
          <td><strong>${r.risk}</strong></td>
          <td>${r.probability}</td>
          <td>${r.impact}</td>
          <td><span class="risk-score ${scoreClass(r.score)}">${r.score}</span></td>
          <td>${r.mitigation}</td>
          <td>${r.owner}</td>
        </tr>
      `).join('')}
    </tbody>
  `;
}

// =========================================================
// QBR ENRICHMENTS — Jan dip, methods, NPS, tickets, cost
// =========================================================
function initQBREnrichments() {
  const q = MODEL.qbr_extended;

  // Jan dip evidence
  document.getElementById('janDipEvidence').innerHTML = q.january_dip_analysis.evidence.map(e => `<li>${e}</li>`).join('');

  // Payment method grid
  document.getElementById('methodGrid').innerHTML = q.payment_method_efficiency.map(m => `
    <div class="method-card">
      <div class="method-market">${m.market}</div>
      <div class="method-name">${m.method}</div>
      <div class="method-approval">${m.approval}%</div>
      <div class="method-insight">${m.insight}</div>
    </div>
  `).join('');

  // NPS verbatim
  document.getElementById('npsQuote').textContent = '"' + q.nps_verbatim.verbatim + '"';
  document.getElementById('npsDecode').innerHTML = q.nps_verbatim.decoded.map(d => `
    <div class="decode-row">
      <div class="decode-said">"${d.they_said}"</div>
      <div class="decode-means">${d.what_that_means}</div>
    </div>
  `).join('');

  // Support ticket chart
  document.getElementById('ticketInsight').textContent = q.support_ticket_analysis.insight;
  new Chart(document.getElementById('ticketChart'), {
    type: 'bar',
    data: {
      labels: q.support_ticket_analysis.data.map(d => d.month),
      datasets: [
        {
          label: 'Critical',
          data: q.support_ticket_analysis.data.map(d => d.critical),
          backgroundColor: C.danger,
          borderRadius: 3,
          stack: 'a',
        },
        {
          label: 'Total tickets',
          data: q.support_ticket_analysis.data.map(d => d.total - d.critical),
          backgroundColor: C.blue,
          borderRadius: 3,
          stack: 'a',
        },
      ],
    },
    options: baseOpts({
      stacked: true,
      yTicks: v => v,
      tooltipLabel: ctx => ctx.dataset.label + ': ' + ctx.parsed.y,
    }),
  });

  // Cost benchmark visual
  const cost = q.cost_efficiency;
  const [min, max] = cost.benchmark_range;
  const pct = v => ((v - min) / (max - min)) * 100;
  document.getElementById('costBenchmark').innerHTML = `
    <div class="cost-range">
      <div class="cost-marker dlocal" style="left: ${Math.max(0, pct(cost.dlocal_proposed))}%;">
        <div class="cost-marker-sub">Bottom of market · single-acquirer</div>
        <div class="cost-marker-label">dLocal · ${cost.dlocal_proposed}%</div>
        <div class="cost-marker-dot"></div>
      </div>
      <div class="cost-marker flexipay" style="left: ${pct(cost.flexipay_effective_take)}%;">
        <div class="cost-marker-dot"></div>
        <div class="cost-marker-label">FlexiPay today · ${cost.flexipay_effective_take}%</div>
        <div class="cost-marker-sub">Median LatAm orchestration</div>
      </div>
    </div>
    <div class="cost-scale">
      <span>${min}% (floor)</span>
      <span>0.82% (median)</span>
      <span>${max}% (ceiling)</span>
    </div>
  `;
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
  const icebergEl = document.getElementById('icebergToggle');

  [cardEl, pixEl, platformEl].forEach(el => el.addEventListener('input', recalc));
  icebergEl.addEventListener('change', recalc);

  // Presets
  document.querySelectorAll('.calc-preset').forEach(btn => {
    btn.addEventListener('click', () => applyPreset(btn.dataset.preset));
  });

  // Sync button — push current state to localStorage so client deck,
  // formal proposal, and internal approval memo all read the latest terms.
  const syncBtn = document.getElementById('syncBtn');
  if (syncBtn) {
    syncBtn.addEventListener('click', () => {
      const terms = {
        cardRate: parseFloat(cardEl.value),
        pixRate: parseFloat(pixEl.value),
        platformFee: parseFloat(platformEl.value),
        timestamp: Date.now(),
      };
      localStorage.setItem('flexipay_deal_terms', JSON.stringify(terms));

      // Visual feedback
      const status = document.getElementById('syncStatus');
      status.textContent = '✓ Synced';
      status.classList.add('show');
      setTimeout(() => status.classList.remove('show'), 2800);
    });
  }

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

  // === THE ICEBERG ===
  updateIceberg(currentYunoRev, dlocalAnnual);
}

// =========================================================
// ICEBERG — True cost comparison with toggle
// =========================================================
function updateIceberg(yunoCost, dlocalPrice) {
  const toggle = document.getElementById('icebergToggle');
  const showHidden = toggle.checked;

  // Hidden costs are structural — they don't depend on slider position.
  // They are the cost of the ACT of migrating.
  const HIDDEN_COSTS = MODEL.competitive.total_switching; // $1,135,620

  const dlocalTrueCost = showHidden ? dlocalPrice + HIDDEN_COSTS : dlocalPrice;
  const maxCost = Math.max(yunoCost, dlocalTrueCost);

  // Bar widths (the larger bar is 95% of container)
  const yunoWidth = (yunoCost / maxCost) * 95;
  const dlocalWidth = (dlocalTrueCost / maxCost) * 95;

  // Yuno bar
  const yunoBar = document.getElementById('yunoBar');
  yunoBar.style.width = yunoWidth + '%';
  document.getElementById('yunoTotalCost').textContent = fmtMoneyFull(Math.round(yunoCost));
  document.getElementById('yunoBreakdown').textContent = 'Annual pricing (all-in)';

  // dLocal bar (two segments)
  const dlocalBar = document.getElementById('dlocalBar');
  dlocalBar.style.width = dlocalWidth + '%';

  const priceSeg = document.getElementById('dlocalPriceSegment');
  const hiddenSeg = document.getElementById('dlocalHiddenSegment');

  if (showHidden) {
    // Both segments visible, proportionally sized
    const pricePortion = (dlocalPrice / dlocalTrueCost) * 100;
    const hiddenPortion = (HIDDEN_COSTS / dlocalTrueCost) * 100;
    priceSeg.style.width = pricePortion + '%';
    priceSeg.style.padding = '0 14px';
    priceSeg.style.borderLeft = '';
    hiddenSeg.style.width = hiddenPortion + '%';
    hiddenSeg.style.padding = '0 14px';
    hiddenSeg.style.borderLeft = '2px solid rgba(255,255,255,0.4)';
    document.getElementById('dlocalBreakdown').textContent = `Pricing + $${(HIDDEN_COSTS/1e6).toFixed(2)}M hidden`;
  } else {
    // Hidden segment collapses to zero
    priceSeg.style.width = '100%';
    priceSeg.style.padding = '0 14px';
    hiddenSeg.style.width = '0%';
    hiddenSeg.style.padding = '0';
    hiddenSeg.style.borderLeft = '0';
    document.getElementById('dlocalBreakdown').textContent = 'Headline price only';
  }
  document.getElementById('dlocalPriceValue').textContent = '$' + (dlocalPrice/1e6).toFixed(2) + 'M';

  // Verdict
  const verdict = document.getElementById('icebergVerdict');
  const delta = yunoCost - dlocalTrueCost;
  const deltaEl = document.getElementById('icebergDelta');

  if (delta < 0) {
    // Yuno wins (cheaper all-in)
    verdict.classList.remove('danger-mode');
    deltaEl.textContent = fmtMoneyFull(Math.abs(Math.round(delta)));
    verdict.querySelector('.ice-winner-icon').textContent = '✓';
    if (showHidden) {
      verdict.querySelector('.ice-winner-text').innerHTML = `
        <strong>Yuno wins by <span id="icebergDelta">${fmtMoneyFull(Math.abs(Math.round(delta)))}</span>.</strong>
        dLocal's ${fmtMoneyFull(Math.round(yunoCost - dlocalPrice))} headline savings are consumed by $24K re-integration engineering, $337K Brazil delay, $248K approval regression, $180K tokenization churn, and $345K commitment overage. <strong>The iceberg lives below the waterline.</strong>
      `;
    } else {
      verdict.querySelector('.ice-winner-text').innerHTML = `
        <strong>Yuno wins by <span id="icebergDelta">${fmtMoneyFull(Math.abs(Math.round(delta)))}</span> on headline.</strong>
        Your offer already undercuts dLocal before hidden costs. Add them back (toggle on) and the margin widens.
      `;
    }
  } else if (delta > 0) {
    // Yuno is more expensive
    deltaEl.textContent = fmtMoneyFull(Math.round(delta));
    if (showHidden) {
      // Hidden costs included but Yuno still more expensive — this shouldn't happen at defaults, but handle it
      verdict.classList.remove('danger-mode');
      verdict.querySelector('.ice-winner-icon').textContent = '⚠';
      verdict.querySelector('.ice-winner-text').innerHTML = `
        <strong>Close call.</strong>
        Yuno is ${fmtMoneyFull(Math.round(delta))}/yr more expensive even with hidden costs included. Your concessions may have gone too far — expansion upside ($951K) still wins overall, but the headline story weakens.
      `;
    } else {
      verdict.classList.add('danger-mode');
      verdict.querySelector('.ice-winner-icon').textContent = '⚠';
      verdict.querySelector('.ice-winner-text').innerHTML = `
        <strong>This is what Carlos sees without the iceberg.</strong>
        On pricing alone, Yuno is ${fmtMoneyFull(Math.round(delta))}/yr more expensive than dLocal. <strong>Toggle on the hidden costs</strong> to show the real comparison — $1.13M of switching costs that Carlos's spreadsheet doesn't have.
      `;
    }
  } else {
    // Parity
    deltaEl.textContent = '$0';
    verdict.classList.remove('danger-mode');
    verdict.querySelector('.ice-winner-text').innerHTML = `<strong>Parity.</strong> Yuno and dLocal cost the same on this basis.`;
  }
}

// =========================================================
// Boot
// =========================================================
boot().catch(err => {
  console.error('Boot failed', err);
  document.body.innerHTML = '<div style="padding:40px;color:#9B2C2C;font-family:Inter,system-ui">Failed to load model.json. If opening via file://, serve with http instead.</div>';
});
