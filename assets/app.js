// =========================================================
// FlexiPay × Yuno — Dashboard interactivity
// =========================================================

const CHART_COLORS = {
  accent: '#ff5c3a',
  blue: '#60a5fa',
  purple: '#a78bfa',
  green: '#4ade80',
  yellow: '#fbbf24',
  red: '#f87171',
  grid: 'rgba(255,255,255,0.05)',
  text: '#9aa0b4',
};

Chart.defaults.color = CHART_COLORS.text;
Chart.defaults.font.family = "'Inter', system-ui, sans-serif";
Chart.defaults.font.size = 11;
Chart.defaults.borderColor = CHART_COLORS.grid;

function fmtMoney(v) {
  if (v >= 1e6) return '$' + (v/1e6).toFixed(2) + 'M';
  if (v >= 1e3) return '$' + Math.round(v/1e3) + 'K';
  return '$' + v;
}
function fmtMoneyFull(v) {
  return '$' + Math.round(v).toLocaleString('en-US');
}

// Global state
let MODEL = null;
let activeScenario = 1;
let brChart, arChart;

async function loadModel() {
  const r = await fetch('data/model.json');
  MODEL = await r.json();
  initCharts();
  initScenarioTabs();
  initAIModules();
}

// =========================================================
// SECTION 1 — QBR CHARTS
// =========================================================
function initCharts() {
  const tpv = MODEL.tpv_history;
  const months = tpv.map(t => t.month);

  // TPV stacked area
  new Chart(document.getElementById('tpvChart'), {
    type: 'bar',
    data: {
      labels: months,
      datasets: [
        {label: 'Mexico', data: tpv.map(t => t.MX), backgroundColor: CHART_COLORS.accent, stack: 'a'},
        {label: 'Colombia', data: tpv.map(t => t.CO), backgroundColor: CHART_COLORS.blue, stack: 'a'},
        {label: 'Chile', data: tpv.map(t => t.CL), backgroundColor: CHART_COLORS.purple, stack: 'a'},
        {label: 'Peru', data: tpv.map(t => t.PE), backgroundColor: CHART_COLORS.green, stack: 'a'},
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'bottom', labels: { boxWidth: 12, padding: 14 } },
        tooltip: {
          callbacks: {
            label: (ctx) => ctx.dataset.label + ': $' + ctx.parsed.y.toFixed(1) + 'M',
            footer: (items) => {
              const sum = items.reduce((a, i) => a + i.parsed.y, 0);
              return 'Total: $' + sum.toFixed(1) + 'M';
            }
          }
        }
      },
      scales: {
        x: { stacked: true, grid: { display: false } },
        y: {
          stacked: true,
          grid: { color: CHART_COLORS.grid },
          ticks: { callback: v => '$' + v + 'M' },
        }
      }
    }
  });

  // Yuno revenue line
  new Chart(document.getElementById('revChart'), {
    type: 'line',
    data: {
      labels: months,
      datasets: [{
        label: 'Monthly Yuno revenue',
        data: tpv.map(t => t.yuno_rev),
        borderColor: CHART_COLORS.accent,
        backgroundColor: 'rgba(255, 92, 58, 0.1)',
        fill: true,
        tension: 0.35,
        pointRadius: 4,
        pointBackgroundColor: CHART_COLORS.accent,
        pointBorderColor: '#0a0b0f',
        pointBorderWidth: 2,
        borderWidth: 2.5,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: { label: (ctx) => fmtMoneyFull(ctx.parsed.y) }
        }
      },
      scales: {
        x: { grid: { display: false } },
        y: {
          grid: { color: CHART_COLORS.grid },
          ticks: { callback: v => '$' + (v/1000) + 'K' }
        }
      }
    }
  });

  // Approval gap
  const gap = MODEL.approval_gap;
  new Chart(document.getElementById('approvalChart'), {
    type: 'bar',
    data: {
      labels: gap.map(g => g.market),
      datasets: [
        {
          label: 'Current',
          data: gap.map(g => g.current),
          backgroundColor: gap.map(g => g.gap < -5 ? CHART_COLORS.red : g.gap < -2 ? CHART_COLORS.yellow : CHART_COLORS.green),
          borderRadius: 6,
        },
        {
          label: 'Benchmark (80%)',
          data: gap.map(g => 80),
          type: 'line',
          borderColor: CHART_COLORS.blue,
          borderDash: [5, 5],
          borderWidth: 2,
          pointRadius: 0,
          fill: false,
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'bottom', labels: { boxWidth: 12, padding: 14 } },
        tooltip: {
          callbacks: {
            label: (ctx) => {
              if (ctx.dataset.label === 'Benchmark (80%)') return 'Benchmark: 80%';
              const g = gap[ctx.dataIndex];
              return `${g.current}% (gap: ${g.gap}pt)`;
            }
          }
        }
      },
      scales: {
        x: { grid: { display: false } },
        y: {
          min: 65, max: 85,
          grid: { color: CHART_COLORS.grid },
          ticks: { callback: v => v + '%' }
        }
      }
    }
  });

  // Unlock
  new Chart(document.getElementById('unlockChart'), {
    type: 'bar',
    data: {
      labels: gap.map(g => g.market),
      datasets: [{
        label: 'Monthly TPV unlock',
        data: gap.map(g => g.monthly_unlock),
        backgroundColor: CHART_COLORS.accent,
        borderRadius: 6,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (ctx) => '$' + ctx.parsed.y.toFixed(2) + 'M/month unlocked',
            footer: (items) => 'Annual: $' + (items[0].parsed.y * 12).toFixed(2) + 'M'
          }
        }
      },
      scales: {
        x: { grid: { display: false } },
        y: {
          grid: { color: CHART_COLORS.grid },
          ticks: { callback: v => '$' + v.toFixed(2) + 'M' }
        }
      }
    }
  });

  // ========== SECTION 2 charts ==========
  initExpansionCharts();

  // ========== SECTION 3 waterfall ==========
  initWaterfallChart();
}

function initExpansionCharts() {
  const s = MODEL.expansion.scenarios;
  const scen = s[activeScenario];

  const brMonths = ['M1', 'M2', 'M3', 'M4', 'M5', 'M6'];
  const brLinear = (m1, m3, m6) => [
    m1,
    (m1 + m3) / 2,
    m3,
    (m3 + m6) * 0.45,
    (m3 + m6) * 0.47,
    m6,
  ];

  brChart = new Chart(document.getElementById('brRampChart'), {
    type: 'line',
    data: {
      labels: brMonths,
      datasets: [{
        label: 'Brazil TPV',
        data: brLinear(scen.br_m1, scen.br_m3, scen.br_m6),
        borderColor: CHART_COLORS.green,
        backgroundColor: 'rgba(74, 222, 128, 0.12)',
        fill: true,
        tension: 0.3,
        pointRadius: 5,
        pointBackgroundColor: CHART_COLORS.green,
        pointBorderColor: '#0a0b0f',
        pointBorderWidth: 2,
        borderWidth: 2.5,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: (ctx) => '$' + ctx.parsed.y.toFixed(1) + 'M' } }
      },
      scales: {
        x: { grid: { display: false } },
        y: {
          beginAtZero: true,
          grid: { color: CHART_COLORS.grid },
          ticks: { callback: v => '$' + v + 'M' }
        }
      }
    }
  });

  arChart = new Chart(document.getElementById('arRampChart'), {
    type: 'line',
    data: {
      labels: brMonths,
      datasets: [{
        label: 'Argentina TPV',
        data: brLinear(scen.ar_m1, scen.ar_m3, scen.ar_m6),
        borderColor: CHART_COLORS.blue,
        backgroundColor: 'rgba(96, 165, 250, 0.12)',
        fill: true,
        tension: 0.3,
        pointRadius: 5,
        pointBackgroundColor: CHART_COLORS.blue,
        pointBorderColor: '#0a0b0f',
        pointBorderWidth: 2,
        borderWidth: 2.5,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: (ctx) => '$' + ctx.parsed.y.toFixed(1) + 'M' } }
      },
      scales: {
        x: { grid: { display: false } },
        y: {
          beginAtZero: true,
          grid: { color: CHART_COLORS.grid },
          ticks: { callback: v => '$' + v + 'M' }
        }
      }
    }
  });

  // Revenue impact grouped bar
  new Chart(document.getElementById('revImpactChart'), {
    type: 'bar',
    data: {
      labels: s.map(sc => sc.name),
      datasets: [
        {
          label: 'Yuno Year 1 incremental revenue',
          data: s.map(sc => sc.yuno_y1_total),
          backgroundColor: CHART_COLORS.accent,
          borderRadius: 6,
        },
        {
          label: 'FlexiPay Year 1 net upside',
          data: s.map(sc => sc.flexipay_y1_total),
          backgroundColor: CHART_COLORS.purple,
          borderRadius: 6,
        },
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'bottom', labels: { boxWidth: 12, padding: 14 } },
        tooltip: {
          callbacks: { label: (ctx) => ctx.dataset.label + ': ' + fmtMoneyFull(ctx.parsed.y) }
        }
      },
      scales: {
        x: { grid: { display: false } },
        y: {
          grid: { color: CHART_COLORS.grid },
          ticks: { callback: v => fmtMoney(v) }
        }
      }
    }
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

function initScenarioTabs() {
  document.querySelectorAll('.scenario-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.scenario-tab').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeScenario = parseInt(btn.dataset.scenario);

      const s = MODEL.expansion.scenarios[activeScenario];
      const brLinear = (m1, m3, m6) => [m1, (m1+m3)/2, m3, (m3+m6)*0.45, (m3+m6)*0.47, m6];
      brChart.data.datasets[0].data = brLinear(s.br_m1, s.br_m3, s.br_m6);
      brChart.update();
      arChart.data.datasets[0].data = brLinear(s.ar_m1, s.ar_m3, s.ar_m6);
      arChart.update();

      updateScenarioMetrics();
    });
  });
}

function initWaterfallChart() {
  const c = MODEL.competitive;
  const labels = [
    'dLocal\nheadline\nsavings',
    'Re-integration\nengineering',
    'Brazil\nlaunch\ndelay',
    'Approval\nrate risk',
    'Token\nmigration\nchurn',
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
  const colors = values.map((v, i) => {
    if (i === 0) return CHART_COLORS.green;
    if (i === labels.length - 1) return CHART_COLORS.red;
    return CHART_COLORS.yellow;
  });

  new Chart(document.getElementById('waterfallChart'), {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: 'Year 1 impact',
        data: values,
        backgroundColor: colors,
        borderRadius: 6,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: { label: (ctx) => fmtMoneyFull(ctx.parsed.y) }
        }
      },
      scales: {
        x: { grid: { display: false }, ticks: { font: { size: 10 } } },
        y: {
          grid: { color: CHART_COLORS.grid },
          ticks: { callback: v => fmtMoney(v) }
        }
      }
    }
  });
}

// =========================================================
// AI MODULES
// =========================================================
function initAIModules() {
  // QBR Script
  const qbrBtns = document.querySelectorAll('.stake-btn');
  qbrBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      qbrBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderQBRScript(parseInt(btn.dataset.stake));
    });
  });
  renderQBRScript(1); // default Daniela

  // Plan B picker
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

function renderQBRScript(idx) {
  const s = MODEL.qbr_scripts[idx];
  const out = document.getElementById('qbrOutput');
  out.style.opacity = 0;
  setTimeout(() => {
    out.innerHTML = `
      <h5>${s.stakeholder}</h5>
      <div class="ai-role">${s.role}</div>
      <div class="ai-tone">Tone: ${s.tone}</div>
      <div class="ai-hook">"${s.opening_hook}"</div>
      <ul class="ai-bullets">
        ${s.three_bullets.map(b => `<li>${b}</li>`).join('')}
      </ul>
      <div class="ai-close">"${s.close}"</div>
    `;
    out.style.opacity = 1;
  }, 100);
}

function renderPlanB(idx) {
  const p = MODEL.plan_b_scenarios[idx];
  const out = document.getElementById('planBOutput');
  out.style.opacity = 0;
  setTimeout(() => {
    out.innerHTML = `
      <h5>${p.trigger}</h5>
      <div class="ai-metrics">
        <div class="ai-metric">
          <div class="ai-metric-label">Probability</div>
          <div class="ai-metric-value">${p.probability}</div>
        </div>
        <div class="ai-metric">
          <div class="ai-metric-label">Win probability after plan</div>
          <div class="ai-metric-value">${p.estimated_win_probability}</div>
        </div>
      </div>
      <div class="ai-analysis">${p.ai_analysis}</div>
      <ul class="ai-bullets">
        ${p.response_plan.map(r => `<li>${r}</li>`).join('')}
      </ul>
    `;
    out.style.opacity = 1;
  }, 100);
}

loadModel().catch(err => {
  console.error('Model load failed', err);
  document.body.innerHTML = '<div style="padding:40px;color:#f87171">Failed to load model.json — make sure you opened via http://, not file://</div>';
});
