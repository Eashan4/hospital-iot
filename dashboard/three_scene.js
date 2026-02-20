/**
 * Hospital IoT — 2D Floor Plan (Dynamic)
 * Only shows blocks that have devices assigned.
 * Hover on bed → patient details tooltip.
 */

const BLOCK_COLORS = ['accent-teal', 'accent-blue', 'accent-purple', 'accent-amber'];

// ─── Render floor plan ───
function initHospitalScene(devices) {
    const container = document.getElementById('floor-plan-container');
    if (!container) return;

    // Group devices by ward (block)
    const blocks = {};
    (devices || []).forEach(d => {
        const ward = d.ward || 'Unassigned';
        if (!blocks[ward]) blocks[ward] = [];
        blocks[ward].push(d);
    });

    const blockNames = Object.keys(blocks);

    // No devices at all → show empty state
    if (blockNames.length === 0) {
        container.innerHTML = `
            <div class="floor-plan-empty">
                <div class="empty-icon">🏥</div>
                <p>No blocks registered yet</p>
                <p class="empty-sub">Register a device from the <strong>Devices</strong> page — a block will be auto-assigned.</p>
            </div>
        `;
        return;
    }

    // Build rooms dynamically for each block that has devices
    const roomsHTML = blockNames.map((name, idx) => {
        const colorClass = BLOCK_COLORS[idx % BLOCK_COLORS.length];
        const devicesInBlock = blocks[name];
        // Pad to 6 (max beds per block)
        while (devicesInBlock.length < 6) devicesInBlock.push(null);
        return buildRoom(name, devicesInBlock, colorClass);
    });

    // Insert corridors between rooms
    let layoutHTML = '';
    roomsHTML.forEach((room, i) => {
        layoutHTML += room;
        if (i < roomsHTML.length - 1) {
            layoutHTML += `
                <div class="corridor">
                    <div class="corridor-line"></div>
                    <span class="corridor-label">Corridor</span>
                    <div class="corridor-line"></div>
                </div>
            `;
        }
    });

    container.innerHTML = `
        <div class="floor-plan">${layoutHTML}</div>
        <div class="floor-legend">
            <span class="legend-item"><span class="legend-dot stable"></span> Stable</span>
            <span class="legend-item"><span class="legend-dot warning"></span> Warning</span>
            <span class="legend-item"><span class="legend-dot critical"></span> Critical</span>
            <span class="legend-item"><span class="legend-dot offline"></span> Offline / Empty</span>
        </div>
        <div id="bed-tooltip" class="bed-tooltip"></div>
    `;
}

function buildRoom(label, devices, accentClass) {
    const leftBeds = devices.slice(0, 3);
    const rightBeds = devices.slice(3, 6);

    return `
        <div class="room ${accentClass}">
            <div class="room-label">${label}</div>
            <div class="room-inner">
                <div class="bed-column left">
                    ${leftBeds.map((d, i) => buildBed(d, i + 1, label)).join('')}
                </div>
                <div class="room-aisle">
                    <div class="aisle-arrow">↕</div>
                </div>
                <div class="bed-column right">
                    ${rightBeds.map((d, i) => buildBed(d, i + 4, label)).join('')}
                </div>
            </div>
            <div class="room-door">
                <span class="door-icon">🚪</span>
                <span class="door-text">Entry</span>
            </div>
        </div>
    `;
}

function buildBed(device, bedNum, blockLabel) {
    const status = getBedStatus(device);
    const devId = device ? device.device_id : '';
    const patient = device?.patient_name || '';
    const isEmpty = !device;

    return `
        <div class="bed-unit ${status} ${isEmpty ? 'empty-bed' : ''}"
             data-device-id="${devId}"
             onmouseenter="showBedTooltip(event, this)"
             onmouseleave="hideBedTooltip()"
             onclick="${devId ? `navigateTo('device-detail', {deviceId: '${devId}'})` : ''}">
            <div class="bed-shape">
                <div class="bed-headboard"></div>
                <div class="bed-mattress">
                    <div class="bed-pillow"></div>
                </div>
            </div>
            <div class="bed-info">
                <span class="bed-number">Bed ${bedNum}</span>
                <span class="bed-patient-name">${patient || (isEmpty ? '— empty —' : 'No patient')}</span>
            </div>
            <div class="bed-status-dot ${status}"></div>
        </div>
    `;
}

function getBedStatus(device) {
    if (!device) return 'offline';
    if (device.status !== 'online') return 'offline';
    const v = window._latestVitals?.[device.device_id] || {};
    if (v.spo2 && v.spo2 < 90) return 'critical';
    if ((v.spo2 && v.spo2 < 94) || (v.heart_rate && (v.heart_rate > 120 || v.heart_rate < 50))) return 'warning';
    return 'stable';
}

// ─── Tooltip ───
function showBedTooltip(event, el) {
    const tooltip = document.getElementById('bed-tooltip');
    if (!tooltip) return;

    const devId = el.dataset.deviceId;
    if (!devId) { tooltip.style.display = 'none'; return; }

    const device = (window._state?.devices || []).find(d => d.device_id === devId);
    if (!device) { tooltip.style.display = 'none'; return; }

    const vitals = window._latestVitals?.[devId] || {};
    const status = getBedStatus(device);
    const hr = vitals.heart_rate ? Math.round(vitals.heart_rate) : '--';
    const spo2 = vitals.spo2 ? Math.round(vitals.spo2) : '--';
    const bedOcc = vitals.bed_status !== undefined ? (vitals.bed_status ? 'Occupied' : 'Empty') : '—';

    tooltip.innerHTML = `
        <div class="tooltip-header ${status}">
            <strong>${device.device_id}</strong>
            <span class="tooltip-status">${status.toUpperCase()}</span>
        </div>
        <div class="tooltip-body">
            <div class="tooltip-row">
                <span class="tooltip-label">👤 Patient</span>
                <span class="tooltip-value">${device.patient_name || 'Unassigned'}</span>
            </div>
            <div class="tooltip-row">
                <span class="tooltip-label">🏥 Ward</span>
                <span class="tooltip-value">${device.ward || '—'}</span>
            </div>
            <div class="tooltip-row">
                <span class="tooltip-label">🛏️ Bed</span>
                <span class="tooltip-value">${device.bed_number || '—'}</span>
            </div>
            <hr class="tooltip-divider">
            <div class="tooltip-vitals">
                <div class="tooltip-vital">
                    <span class="vital-icon heart">♥</span>
                    <span class="vital-num">${hr}</span>
                    <span class="vital-label">BPM</span>
                </div>
                <div class="tooltip-vital">
                    <span class="vital-icon oxy">O₂</span>
                    <span class="vital-num">${spo2}</span>
                    <span class="vital-label">%</span>
                </div>
                <div class="tooltip-vital">
                    <span class="vital-icon bed-v">🛏</span>
                    <span class="vital-num">${bedOcc}</span>
                    <span class="vital-label"></span>
                </div>
            </div>
            <div class="tooltip-footer">Click to view details →</div>
        </div>
    `;

    const rect = el.getBoundingClientRect();
    const cRect = document.getElementById('floor-plan-container').getBoundingClientRect();
    tooltip.style.display = 'block';
    tooltip.style.left = (rect.left - cRect.left + rect.width / 2) + 'px';
    tooltip.style.top = (rect.top - cRect.top - 10) + 'px';
}

function hideBedTooltip() {
    const t = document.getElementById('bed-tooltip');
    if (t) t.style.display = 'none';
}

// ─── Live update helpers (called from app.js) ───
function updateBedStatus(deviceId, status) {
    const el = document.querySelector(`.bed-unit[data-device-id="${deviceId}"]`);
    if (!el) return;
    // Preserve empty-bed class if needed
    const isEmpty = el.classList.contains('empty-bed');
    el.className = `bed-unit ${status}${isEmpty ? ' empty-bed' : ''}`;
    const dot = el.querySelector('.bed-status-dot');
    if (dot) dot.className = `bed-status-dot ${status}`;
}

function updateBedVitals(deviceId) {
    const device = (window._state?.devices || []).find(d => d.device_id === deviceId);
    updateBedStatus(deviceId, getBedStatus(device));
}

window._latestVitals = window._latestVitals || {};
