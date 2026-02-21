/**
 * Hospital IoT Dashboard — Main Application Logic
 * SPA Router, WebSocket Client, Auth, API, Toasts, Theme Switcher
 */

// ============================================
// Configuration
// ============================================
const API_BASE = window.location.origin.includes('localhost')
    ? 'http://localhost:8000'
    : window.location.origin;
const WS_URL = API_BASE.replace('http', 'ws') + '/ws/live';

// ============================================
// State
// ============================================
const state = {
    token: sessionStorage.getItem('iot_token') || null,
    username: sessionStorage.getItem('iot_username') || '',
    role: sessionStorage.getItem('iot_role') || '',
    devices: [],
    latestVitals: {},    // device_id -> { heart_rate, spo2, bed_status }
    currentPage: 'overview',
    currentDeviceId: null,
    ws: null,
    wsReconnectTimer: null,
};

// Expose state globally for three_scene.js vital overlay
window._state = state;
window._latestVitals = state.latestVitals;

// ============================================
// Initialize
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    if (state.token) {
        showApp();
    } else {
        showLogin();
    }
    setupEventListeners();
});

// ============================================
// Auth
// ============================================
function showLogin() {
    document.getElementById('login-page').classList.add('active');
    document.getElementById('app').classList.add('hidden');
    disconnectWS();
}

function showApp() {
    document.getElementById('login-page').classList.remove('active');
    document.getElementById('app').classList.remove('hidden');
    document.getElementById('username-display').textContent = state.username || 'Admin';
    connectWS();
    navigateTo('overview');
}

async function login(username, password) {
    try {
        const res = await fetch(`${API_BASE}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password }),
        });
        if (!res.ok) throw new Error('Invalid credentials');
        const data = await res.json();
        state.token = data.token;
        state.username = data.username;
        state.role = data.role;
        sessionStorage.setItem('iot_token', data.token);
        sessionStorage.setItem('iot_username', data.username);
        sessionStorage.setItem('iot_role', data.role);
        showApp();
    } catch (err) {
        document.getElementById('login-error').textContent = err.message;
    }
}

function logout() {
    state.token = null;
    state.username = '';
    state.role = '';
    sessionStorage.removeItem('iot_token');
    sessionStorage.removeItem('iot_username');
    sessionStorage.removeItem('iot_role');
    showLogin();
}

// ============================================
// API Helper
// ============================================
async function apiFetch(endpoint, options = {}) {
    const headers = {
        'Content-Type': 'application/json',
        ...(state.token && { 'Authorization': `Bearer ${state.token}` }),
        ...(options.headers || {}),
    };
    const res = await fetch(`${API_BASE}${endpoint}`, { ...options, headers });
    if (res.status === 401) {
        logout();
        throw new Error('Session expired');
    }
    if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: 'Request failed' }));
        throw new Error(err.detail || 'Request failed');
    }
    return res;
}

async function apiGet(endpoint) {
    const res = await apiFetch(endpoint);
    return res.json();
}

async function apiPost(endpoint, body) {
    const res = await apiFetch(endpoint, {
        method: 'POST',
        body: JSON.stringify(body),
    });
    return res.json();
}

// ============================================
// WebSocket & Fallback Polling
// ============================================
function connectWS() {
    if (state.ws && state.ws.readyState === WebSocket.OPEN) return;

    // Vercel Serverless Fallback: If WS fails twice, switch to HTTP polling
    if (state.wsFails >= 2) {
        console.warn('WebSocket failed multiple times. Falling back to HTTP polling...');
        startHttpPolling();
        return;
    }

    try {
        state.ws = new WebSocket(WS_URL);

        state.ws.onopen = () => {
            console.log('WebSocket connected');
            state.wsFails = 0; // Reset fails on success
            clearInterval(state.wsReconnectTimer);
            // Ping every 25s to keep alive
            state.wsPingInterval = setInterval(() => {
                if (state.ws.readyState === WebSocket.OPEN) {
                    state.ws.send('ping');
                }
            }, 25000);
        };

        state.ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            handleWSMessage(data);
        };

        state.ws.onclose = () => {
            console.log('WebSocket disconnected...');
            state.wsFails = (state.wsFails || 0) + 1;
            clearInterval(state.wsPingInterval);
            state.wsReconnectTimer = setTimeout(connectWS, 3000);
        };

        state.ws.onerror = (err) => {
            console.error('WebSocket error:', err);
            // Close event will trigger reconnect/fail logic
            state.ws.close();
        };
    } catch (err) {
        console.error('WebSocket connection failed:', err);
        state.wsFails = (state.wsFails || 0) + 1;
        state.wsReconnectTimer = setTimeout(connectWS, 3000);
    }
}

let pollingInterval = null;
async function startHttpPolling() {
    if (pollingInterval) return;
    pollingInterval = setInterval(async () => {
        try {
            // Fetch latest vitals for all devices
            const devices = state.devices || [];
            if (devices.length === 0) return;

            // We just need the latest data. To be perfectly efficient, we could hit a new bulk endpoint, 
            // but fetching the devices array again works for a fallback.
            const res = await apiFetch('/api/devices');
            const data = await res.json();

            // Format data as if it came from WebSocket
            data.forEach(d => {
                if (d.latest_vitals) {
                    handleWSMessage({
                        type: 'vitals_update',
                        data: {
                            device_id: d.device_id,
                            heart_rate: d.latest_vitals.heart_rate,
                            spo2: d.latest_vitals.spo2,
                            bed_status: d.latest_vitals.bed_status,
                            timestamp: d.latest_vitals.timestamp
                        }
                    });
                }
            });
        } catch (e) {
            console.error("Polling error:", e);
        }
    }, 3000); // Poll every 3 seconds
}

function disconnectWS() {
    clearInterval(state.wsPingInterval);
    clearTimeout(state.wsReconnectTimer);
    clearInterval(pollingInterval);
    pollingInterval = null;
    if (state.ws) state.ws.close();
}

function handleWSMessage(data) {
    switch (data.type) {
        case 'sensor_data':
            state.latestVitals[data.device_id] = {
                heart_rate: data.heart_rate,
                spo2: data.spo2,
                bed_status: data.bed_status,
                timestamp: data.timestamp,
            };
            updateDeviceTileVitals(data.device_id);
            if (state.currentPage === 'device-detail' && state.currentDeviceId === data.device_id) {
                updateDetailVitals(data);
            }
            // Update 3D scene
            if (typeof updateBedStatus === 'function') {
                const status = getDeviceStatus(data);
                updateBedStatus(data.device_id, status);
            }
            if (typeof updateBedVitals === 'function') {
                updateBedVitals(data.device_id);
            }
            break;

        case 'device_status':
            updateDeviceStatus(data.device_id, data.status);
            if (typeof updateBedStatus === 'function') {
                updateBedStatus(data.device_id, data.status === 'online' ? 'stable' : 'offline');
            }
            break;

        case 'alert':
            showToast(data.severity, data.message, data.device_id);
            updateAlertBadge();
            if (state.currentPage === 'alerts') loadAlerts();
            break;

        case 'pong':
            break;
    }
}

function getDeviceStatus(data) {
    if (data.spo2 < 90) return 'critical';
    if (data.spo2 < 94 || data.heart_rate > 120 || data.heart_rate < 50) return 'warning';
    return 'stable';
}

// ============================================
// SPA Router
// ============================================
function navigateTo(page, params = {}) {
    state.currentPage = page;
    document.querySelectorAll('.page-content').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-link').forEach(n => n.classList.remove('active'));

    const pageEl = document.getElementById(`page-${page}`);
    const navEl = document.querySelector(`.nav-link[data-page="${page}"]`);

    if (pageEl) pageEl.classList.add('active');
    if (navEl) navEl.classList.add('active');

    // Show/hide device detail nav link
    document.getElementById('nav-device-detail').style.display = page === 'device-detail' ? '' : 'none';

    switch (page) {
        case 'overview':
            loadOverview();
            break;
        case 'devices':
            loadDevicesTable();
            break;
        case 'device-detail':
            state.currentDeviceId = params.deviceId;
            loadDeviceDetail(params.deviceId);
            break;
        case 'alerts':
            loadAlerts();
            break;
        case 'analytics':
            loadAnalytics();
            break;
    }

    window.location.hash = page;
}

// ============================================
// Overview Page
// ============================================
async function loadOverview() {
    try {
        const [stats, devices] = await Promise.all([
            apiGet('/api/dashboard/stats'),
            apiGet('/api/dashboard/devices'),
        ]);

        state.devices = devices;
        animateCounter('stat-total', stats.total_devices);
        animateCounter('stat-online', stats.online_devices);
        document.getElementById('stat-occupancy').textContent = stats.occupancy_percent + '%';
        animateCounter('stat-alerts', stats.active_alerts);

        renderDeviceGrid(devices);
        updateAlertBadge(stats.active_alerts);

        // Init 3D scene if available
        if (typeof initHospitalScene === 'function') {
            initHospitalScene(devices);
        }
    } catch (err) {
        console.error('Failed to load overview:', err);
    }
}

function renderDeviceGrid(devices) {
    const grid = document.getElementById('device-grid');
    grid.innerHTML = devices.map(d => {
        const vitals = state.latestVitals[d.device_id] || {};
        const statusClass = d.status === 'online'
            ? (getDeviceStatus(vitals) || 'online')
            : 'offline';

        return `
        <div class="device-tile glass-card ${statusClass}" onclick="navigateTo('device-detail', {deviceId: '${d.device_id}'})">
            <div class="device-tile-header">
                <span class="status-dot ${d.status}"></span>
                <span class="device-tile-name">${d.device_id}</span>
            </div>
            <div class="device-tile-meta">
                <span>🏥 ${d.ward || '—'}</span>
                <span>🛏️ Bed ${d.bed_number || '—'}</span>
                <span>👤 ${d.patient_name || 'Unassigned'}</span>
                <span>${d.status === 'online' ? '🟢 Online' : '⚫ Offline'}</span>
            </div>
            ${vitals.heart_rate ? `
            <div class="device-tile-vitals">
                <div class="vital-mini">
                    <span class="vital-mini-value">${Math.round(vitals.heart_rate)}</span>
                    <span class="vital-mini-label">BPM</span>
                </div>
                <div class="vital-mini">
                    <span class="vital-mini-value">${Math.round(vitals.spo2)}</span>
                    <span class="vital-mini-label">SpO₂</span>
                </div>
                <div class="vital-mini">
                    <span class="vital-mini-value">${vitals.bed_status ? '🟢' : '⚪'}</span>
                    <span class="vital-mini-label">Bed</span>
                </div>
            </div>` : ''}
        </div>`;
    }).join('');
}

function updateDeviceTileVitals(deviceId) {
    // Re-render grid to update vitals (simple approach)
    if (state.currentPage === 'overview' && state.devices.length > 0) {
        renderDeviceGrid(state.devices);
    }
}

function updateDeviceStatus(deviceId, status) {
    const device = state.devices.find(d => d.device_id === deviceId);
    if (device) device.status = status;
    if (state.currentPage === 'overview') renderDeviceGrid(state.devices);
}

// ============================================
// Devices Table Page
// ============================================
async function loadDevicesTable() {
    try {
        const devices = await apiGet('/api/dashboard/devices');
        state.devices = devices;
        const tbody = document.getElementById('device-table-body');
        tbody.innerHTML = devices.map(d => `
            <tr>
                <td><span class="status-dot ${d.status}"></span> ${d.status}</td>
                <td><strong>${d.device_id}</strong></td>
                <td>${d.ward || '—'}</td>
                <td>${d.bed_number || '—'}</td>
                <td>${d.patient_name || '—'}</td>
                <td>${d.last_seen ? new Date(d.last_seen).toLocaleString() : 'Never'}</td>
                <td>
                    <button class="btn-table" onclick="navigateTo('device-detail', {deviceId: '${d.device_id}'})">View</button>
                    <button class="btn-table" onclick="regenerateKey('${d.device_id}')">🔑 New Key</button>
                    <button class="btn-table danger" onclick="deleteDevice('${d.device_id}')">🗑️</button>
                </td>
            </tr>
        `).join('');
    } catch (err) {
        console.error('Failed to load devices:', err);
    }
}

async function registerDevice(ward, bedNumber, patientName) {
    try {
        const data = await apiPost('/api/device/register', {
            bed_number: bedNumber,
            ward: ward,
            patient_name: patientName || null,
        });
        document.getElementById('new-api-key').textContent = data.api_key;
        document.getElementById('new-device-id').textContent = data.device_id;
        document.getElementById('add-device-form').classList.add('hidden');
        document.getElementById('api-key-result').classList.remove('hidden');
        showToast('success', `Device ${data.device_id} registered!`);
    } catch (err) {
        showToast('critical', err.message);
    }
}

async function regenerateKey(deviceId) {
    if (!confirm(`Regenerate API key for ${deviceId}? The old key will stop working.`)) return;
    try {
        const data = await apiPost(`/api/device/${deviceId}/regenerate-key`, {});
        showToast('info', `New key for ${deviceId}: ${data.new_api_key.slice(0, 8)}...`);
        prompt('New API Key (copy it):', data.new_api_key);
    } catch (err) {
        showToast('critical', err.message);
    }
}

async function deleteDevice(deviceId) {
    if (!confirm(`Delete device ${deviceId}? This cannot be undone.`)) return;
    try {
        await apiFetch(`/api/device/${deviceId}`, { method: 'DELETE' });
        showToast('info', `Device ${deviceId} deleted`);
        loadDevicesTable();
    } catch (err) {
        showToast('critical', err.message);
    }
}

// ============================================
// Device Detail Page
// ============================================
async function loadDeviceDetail(deviceId) {
    try {
        const data = await apiGet(`/api/dashboard/device/${deviceId}`);
        const d = data.device;

        document.getElementById('detail-device-title').textContent = d.device_id;
        document.getElementById('detail-device-id').textContent = d.device_id;
        document.getElementById('detail-ward').textContent = d.ward || '—';
        document.getElementById('detail-bed').textContent = d.bed_number || '—';
        document.getElementById('detail-patient').textContent = d.patient_name || 'Unassigned';

        const badge = document.getElementById('detail-status-badge');
        badge.textContent = d.status;
        badge.className = `status-badge ${d.status}`;

        // Latest vitals
        if (data.vitals.length > 0) {
            const latest = data.vitals[data.vitals.length - 1];
            updateDetailVitals(latest);
        }

        // Initialize charts
        initDetailCharts(data.vitals);

        // Start heartbeat animation
        startHeartbeatAnimation();

        // Alerts
        renderDetailAlerts(data.alerts);
    } catch (err) {
        console.error('Failed to load device detail:', err);
        showToast('critical', 'Failed to load device detail');
    }
}

function renderDetailAlerts(alerts) {
    const container = document.getElementById('detail-alerts');
    if (alerts.length === 0) {
        container.innerHTML = '<p style="color:var(--text-muted); font-size:0.9rem;">No alerts</p>';
        return;
    }
    container.innerHTML = alerts.map(a => `
        <div class="alert-card">
            <span class="alert-severity-dot ${a.severity}"></span>
            <div class="alert-content">
                <div class="alert-message">${a.message}</div>
                <div class="alert-meta">
                    <span>${a.alert_type}</span>
                    <span>${new Date(a.timestamp).toLocaleString()}</span>
                    <span>${a.escalation_status}</span>
                </div>
            </div>
        </div>
    `).join('');
}

// ============================================
// Alerts Page
// ============================================
async function loadAlerts(severity = '') {
    try {
        const filter = severity ? `?severity=${severity}` : '';
        const alerts = await apiGet(`/api/dashboard/alerts${filter}`);
        const container = document.getElementById('alerts-list');
        if (alerts.length === 0) {
            container.innerHTML = '<p style="color:var(--text-muted); text-align:center; padding:3rem;">No alerts found</p>';
            return;
        }
        container.innerHTML = alerts.map(a => `
            <div class="alert-card">
                <span class="alert-severity-dot ${a.severity}"></span>
                <div class="alert-content">
                    <div class="alert-message">${a.message}</div>
                    <div class="alert-meta">
                        <span>${a.device_id}</span>
                        <span>${a.alert_type}</span>
                        <span>${new Date(a.timestamp).toLocaleString()}</span>
                    </div>
                </div>
                <div class="alert-actions">
                    ${a.escalation_status === 'new' ? `<button class="btn-ack" onclick="acknowledgeAlert(${a.id})">Acknowledge</button>` : `<span style="color:var(--text-muted);font-size:0.75rem;">${a.escalation_status}</span>`}
                </div>
            </div>
        `).join('');
    } catch (err) {
        console.error('Failed to load alerts:', err);
    }
}

async function acknowledgeAlert(alertId) {
    try {
        await apiFetch(`/api/dashboard/alerts/${alertId}/acknowledge`, { method: 'PUT' });
        showToast('success', 'Alert acknowledged');
        loadAlerts();
    } catch (err) {
        showToast('critical', err.message);
    }
}

function updateAlertBadge(count) {
    const badge = document.getElementById('alert-badge');
    if (count !== undefined) {
        badge.textContent = count;
        badge.classList.toggle('hidden', count === 0);
    } else {
        // Increment
        const current = parseInt(badge.textContent) || 0;
        badge.textContent = current + 1;
        badge.classList.remove('hidden');
    }
}

// ============================================
// Toast Notifications
// ============================================
function showToast(severity, message, deviceId = '') {
    const container = document.getElementById('toast-container');
    const icons = { critical: '🔴', high: '🟡', medium: '🔵', low: '⚪', success: '✅', info: 'ℹ️' };

    const toast = document.createElement('div');
    toast.className = `toast ${severity}`;
    toast.innerHTML = `
        <span class="toast-icon">${icons[severity] || 'ℹ️'}</span>
        <div class="toast-body">
            <div class="toast-title">${severity.toUpperCase()} ${deviceId ? `· ${deviceId}` : ''}</div>
            <div class="toast-message">${message}</div>
        </div>
    `;

    container.appendChild(toast);

    // Auto remove after 5s
    setTimeout(() => {
        toast.classList.add('fadeout');
        setTimeout(() => toast.remove(), 400);
    }, 5000);
}

// ============================================
// Counter Animation
// ============================================
function animateCounter(elementId, target) {
    const el = document.getElementById(elementId);
    const start = parseInt(el.textContent) || 0;
    const duration = 800;
    const startTime = performance.now();

    function step(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        el.textContent = Math.round(start + (target - start) * eased);
        if (progress < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
}

// ============================================
// Theme Switcher
// ============================================
function setTheme(theme) {
    document.body.setAttribute('data-theme', theme);
    document.querySelectorAll('.theme-btn').forEach(b => {
        b.classList.toggle('active', b.dataset.theme === theme);
    });
    localStorage.setItem('iot_theme', theme);
}

// ============================================
// Event Listeners
// ============================================
function setupEventListeners() {
    // Login form
    document.getElementById('login-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const u = document.getElementById('login-username').value;
        const p = document.getElementById('login-password').value;
        login(u, p);
    });

    // Logout
    document.getElementById('logout-btn').addEventListener('click', logout);

    // Sidebar nav
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            navigateTo(link.dataset.page);
        });
    });

    // Theme buttons
    document.querySelectorAll('.theme-btn').forEach(btn => {
        btn.addEventListener('click', () => setTheme(btn.dataset.theme));
    });

    // Restore saved theme
    const savedTheme = localStorage.getItem('iot_theme');
    if (savedTheme) setTheme(savedTheme);

    // Add device modal
    document.getElementById('add-device-btn').addEventListener('click', () => {
        document.getElementById('add-device-modal').classList.remove('hidden');
        document.getElementById('add-device-form').classList.remove('hidden');
        document.getElementById('api-key-result').classList.add('hidden');
    });

    document.getElementById('cancel-device-btn').addEventListener('click', () => {
        document.getElementById('add-device-modal').classList.add('hidden');
    });

    document.querySelector('.modal-overlay')?.addEventListener('click', () => {
        document.getElementById('add-device-modal').classList.add('hidden');
    });

    document.getElementById('add-device-form').addEventListener('submit', (e) => {
        e.preventDefault();
        registerDevice(
            document.getElementById('device-ward').value,
            document.getElementById('device-bed').value,
            document.getElementById('device-patient').value
        );
    });

    // Copy API key
    document.getElementById('copy-key-btn').addEventListener('click', () => {
        const key = document.getElementById('new-api-key').textContent;
        navigator.clipboard.writeText(key);
        showToast('success', 'API key copied to clipboard');
    });

    // Alert filter
    document.getElementById('alert-filter').addEventListener('change', (e) => {
        loadAlerts(e.target.value);
    });

    // Handle hash navigation
    window.addEventListener('hashchange', () => {
        const page = window.location.hash.slice(1) || 'overview';
        if (page !== state.currentPage) navigateTo(page);
    });
}
