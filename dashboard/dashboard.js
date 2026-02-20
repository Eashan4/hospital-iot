/**
 * Hospital IoT Dashboard — Charts, Gauges, Heartbeat Waveform, Analytics
 */

// ============================================
// Chart Instances
// ============================================
let hrChart = null;
let spo2Chart = null;
let riskChart = null;
let anomalyChart = null;
let timelineChart = null;
let heartbeatAnimId = null;

// Chart.js global config
Chart.defaults.color = '#94a3b8';
Chart.defaults.borderColor = 'rgba(255,255,255,0.05)';
Chart.defaults.font.family = "'Inter', sans-serif";

// ============================================
// Detail Page: Initialize Vitals Charts
// ============================================
function initDetailCharts(vitals) {
    const labels = vitals.map(v => {
        const d = new Date(v.timestamp);
        return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    });
    const hrData = vitals.map(v => v.heart_rate);
    const spo2Data = vitals.map(v => v.spo2);

    // Destroy old charts
    if (hrChart) hrChart.destroy();
    if (spo2Chart) spo2Chart.destroy();

    // Heart Rate Chart
    const hrCtx = document.getElementById('hr-chart');
    if (hrCtx) {
        hrChart = new Chart(hrCtx, {
            type: 'line',
            data: {
                labels,
                datasets: [{
                    label: 'Heart Rate (BPM)',
                    data: hrData,
                    borderColor: '#ff6b6b',
                    backgroundColor: 'rgba(255, 107, 107, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4,
                    pointRadius: 0,
                    pointHoverRadius: 4,
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: { duration: 500 },
                scales: {
                    y: {
                        min: 40,
                        max: 140,
                        grid: { color: 'rgba(255,255,255,0.03)' },
                    },
                    x: {
                        ticks: { maxTicksLimit: 10 },
                        grid: { display: false },
                    }
                },
                plugins: {
                    legend: { display: false },
                }
            }
        });
    }

    // SpO2 Chart
    const spo2Ctx = document.getElementById('spo2-chart');
    if (spo2Ctx) {
        spo2Chart = new Chart(spo2Ctx, {
            type: 'line',
            data: {
                labels,
                datasets: [{
                    label: 'SpO₂ (%)',
                    data: spo2Data,
                    borderColor: '#448aff',
                    backgroundColor: 'rgba(68, 138, 255, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4,
                    pointRadius: 0,
                    pointHoverRadius: 4,
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: { duration: 500 },
                scales: {
                    y: {
                        min: 80,
                        max: 100,
                        grid: { color: 'rgba(255,255,255,0.03)' },
                    },
                    x: {
                        ticks: { maxTicksLimit: 10 },
                        grid: { display: false },
                    }
                },
                plugins: {
                    legend: { display: false },
                }
            }
        });
    }
}

// ============================================
// Update Detail Vitals (called from WS)
// ============================================
function updateDetailVitals(data) {
    // Update large numbers with smooth transition
    const hrEl = document.getElementById('detail-hr');
    const spo2El = document.getElementById('detail-spo2');
    const bedEl = document.getElementById('detail-bed-status');

    if (hrEl) {
        hrEl.textContent = Math.round(data.heart_rate);
        hrEl.style.color = data.heart_rate > 120 || data.heart_rate < 50
            ? 'var(--red)' : 'var(--accent)';
    }
    if (spo2El) {
        spo2El.textContent = Math.round(data.spo2);
        spo2El.style.color = data.spo2 < 90 ? 'var(--red)'
            : data.spo2 < 94 ? 'var(--yellow)' : 'var(--accent)';
    }
    if (bedEl) {
        bedEl.textContent = data.bed_status ? 'Occupied' : 'Empty';
        const indicator = document.getElementById('bed-status-indicator');
        if (indicator) {
            indicator.className = `bed-indicator ${data.bed_status ? 'occupied' : 'empty'}`;
        }
    }

    // Update SpO2 gauge
    updateSpo2Gauge(data.spo2);

    // Append to charts
    if (hrChart && data.timestamp) {
        const time = new Date(data.timestamp).toLocaleTimeString([], {
            hour: '2-digit', minute: '2-digit', second: '2-digit'
        });

        hrChart.data.labels.push(time);
        hrChart.data.datasets[0].data.push(data.heart_rate);
        if (hrChart.data.labels.length > 60) {
            hrChart.data.labels.shift();
            hrChart.data.datasets[0].data.shift();
        }
        hrChart.update('none');
    }

    if (spo2Chart && data.timestamp) {
        const time = new Date(data.timestamp).toLocaleTimeString([], {
            hour: '2-digit', minute: '2-digit', second: '2-digit'
        });

        spo2Chart.data.labels.push(time);
        spo2Chart.data.datasets[0].data.push(data.spo2);
        if (spo2Chart.data.labels.length > 60) {
            spo2Chart.data.labels.shift();
            spo2Chart.data.datasets[0].data.shift();
        }
        spo2Chart.update('none');
    }
}

// ============================================
// SpO2 Circular Gauge
// ============================================
function updateSpo2Gauge(value) {
    const fill = document.getElementById('spo2-gauge-fill');
    if (!fill) return;

    const circumference = 2 * Math.PI * 52; // r=52
    const percent = Math.max(0, Math.min(100, value)) / 100;
    const offset = circumference * (1 - percent);

    fill.style.strokeDasharray = circumference;
    fill.style.strokeDashoffset = offset;

    // Color based on value
    if (value < 90) {
        fill.style.stroke = 'var(--red)';
    } else if (value < 94) {
        fill.style.stroke = 'var(--yellow)';
    } else {
        fill.style.stroke = 'var(--accent)';
    }
}

// ============================================
// Heartbeat Waveform Animation
// ============================================
function startHeartbeatAnimation() {
    const canvas = document.getElementById('heartbeat-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    // Set canvas resolution
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    let offset = 0;
    const w = rect.width;
    const h = rect.height;
    const midY = h / 2;

    // Cancel previous animation
    if (heartbeatAnimId) cancelAnimationFrame(heartbeatAnimId);

    function drawHeartbeat() {
        ctx.clearRect(0, 0, w, h);

        // Background grid
        ctx.strokeStyle = 'rgba(0, 230, 180, 0.05)';
        ctx.lineWidth = 0.5;
        for (let y = 0; y < h; y += 10) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(w, y);
            ctx.stroke();
        }

        // ECG waveform
        ctx.strokeStyle = '#00e676';
        ctx.lineWidth = 2;
        ctx.shadowColor = '#00e676';
        ctx.shadowBlur = 6;
        ctx.beginPath();

        for (let x = 0; x < w; x++) {
            const t = ((x + offset) % w) / w;
            let y = midY;

            // Generate ECG-like pattern
            const phase = t * Math.PI * 2;
            if (t > 0.1 && t < 0.15) {
                // P wave
                y = midY - Math.sin((t - 0.1) / 0.05 * Math.PI) * 8;
            } else if (t > 0.2 && t < 0.23) {
                // Q dip
                y = midY + Math.sin((t - 0.2) / 0.03 * Math.PI) * 6;
            } else if (t > 0.23 && t < 0.28) {
                // R peak (tall spike)
                y = midY - Math.sin((t - 0.23) / 0.05 * Math.PI) * 30;
            } else if (t > 0.28 && t < 0.32) {
                // S dip
                y = midY + Math.sin((t - 0.28) / 0.04 * Math.PI) * 10;
            } else if (t > 0.38 && t < 0.48) {
                // T wave
                y = midY - Math.sin((t - 0.38) / 0.1 * Math.PI) * 10;
            }

            if (x === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.stroke();
        ctx.shadowBlur = 0;

        // Moving dot
        const dotX = ((w - offset % w) + w) % w;
        ctx.fillStyle = '#00e676';
        ctx.shadowColor = '#00e676';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(dotX, midY, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        offset += 1.5;
        heartbeatAnimId = requestAnimationFrame(drawHeartbeat);
    }

    drawHeartbeat();
}

// ============================================
// Analytics Page
// ============================================
async function loadAnalytics() {
    try {
        const alerts = await apiGet('/api/dashboard/alerts?limit=200');

        // Risk distribution (doughnut)
        const severityCounts = { critical: 0, high: 0, medium: 0, low: 0 };
        alerts.forEach(a => { severityCounts[a.severity] = (severityCounts[a.severity] || 0) + 1; });

        if (riskChart) riskChart.destroy();
        const riskCtx = document.getElementById('risk-chart');
        if (riskCtx) {
            riskChart = new Chart(riskCtx, {
                type: 'doughnut',
                data: {
                    labels: ['Critical', 'High', 'Medium', 'Low'],
                    datasets: [{
                        data: [severityCounts.critical, severityCounts.high, severityCounts.medium, severityCounts.low],
                        backgroundColor: ['#ff1744', '#ffab00', '#448aff', '#64748b'],
                        borderWidth: 0,
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    cutout: '65%',
                    plugins: {
                        legend: { position: 'bottom', labels: { padding: 15 } }
                    }
                }
            });
        }

        // Anomaly trends (bar chart - hourly counts for last 24h)
        const hourlyBuckets = {};
        const now = new Date();
        for (let i = 23; i >= 0; i--) {
            const hour = new Date(now - i * 3600000);
            const key = hour.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            hourlyBuckets[key] = 0;
        }
        alerts.forEach(a => {
            const d = new Date(a.timestamp);
            const diff = (now - d) / 3600000;
            if (diff <= 24) {
                const key = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                if (key in hourlyBuckets) hourlyBuckets[key]++;
            }
        });

        if (anomalyChart) anomalyChart.destroy();
        const anomalyCtx = document.getElementById('anomaly-chart');
        if (anomalyCtx) {
            anomalyChart = new Chart(anomalyCtx, {
                type: 'bar',
                data: {
                    labels: Object.keys(hourlyBuckets),
                    datasets: [{
                        label: 'Alerts',
                        data: Object.values(hourlyBuckets),
                        backgroundColor: 'rgba(255, 107, 107, 0.6)',
                        borderColor: '#ff6b6b',
                        borderWidth: 1,
                        borderRadius: 4,
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.03)' } },
                        x: { ticks: { maxTicksLimit: 12 }, grid: { display: false } },
                    },
                    plugins: { legend: { display: false } }
                }
            });
        }

        // Alert timeline (line - cumulative)
        const typeCounts = {};
        alerts.forEach(a => {
            typeCounts[a.alert_type] = (typeCounts[a.alert_type] || 0) + 1;
        });

        if (timelineChart) timelineChart.destroy();
        const timelineCtx = document.getElementById('timeline-chart');
        if (timelineCtx) {
            const colors = ['#ff6b6b', '#448aff', '#ffab00', '#b388ff', '#00e676'];
            const types = Object.keys(typeCounts);
            timelineChart = new Chart(timelineCtx, {
                type: 'bar',
                data: {
                    labels: types,
                    datasets: [{
                        label: 'Count',
                        data: types.map(t => typeCounts[t]),
                        backgroundColor: types.map((_, i) => colors[i % colors.length] + '99'),
                        borderColor: types.map((_, i) => colors[i % colors.length]),
                        borderWidth: 1,
                        borderRadius: 6,
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    indexAxis: 'y',
                    scales: {
                        x: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.03)' } },
                        y: { grid: { display: false } },
                    },
                    plugins: { legend: { display: false } }
                }
            });
        }
    } catch (err) {
        console.error('Failed to load analytics:', err);
    }
}
