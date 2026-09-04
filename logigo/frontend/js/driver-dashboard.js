function statusBadgeD(status) {
  return `<span class="badge badge-${status}">${status.replace('_', ' ')}</span>`;
}

// Buttons available for the current delivery, based on its status
function currentDeliveryActions(b) {
  if (b.status === 'assigned') {
    return `
      <button class="btn btn-success btn-sm" onclick="driverRespond(${b.id}, 'accept')">Accept</button>
      <button class="btn btn-danger btn-sm" onclick="driverRespond(${b.id}, 'reject')">Reject</button>
    `;
  }
  if (b.status === 'accepted') {
    return `<button class="btn btn-primary btn-sm" onclick="driverUpdateStatus(${b.id}, 'picked_up')">Mark Picked Up</button>`;
  }
  if (b.status === 'picked_up') {
    return `<button class="btn btn-primary btn-sm" onclick="driverUpdateStatus(${b.id}, 'in_transit')">Mark In Transit</button>`;
  }
  if (b.status === 'in_transit') {
    return `<button class="btn btn-success btn-sm" onclick="driverUpdateStatus(${b.id}, 'delivered')">Mark Delivered</button>`;
  }
  return '';
}

async function loadDriverDashboard() {
  const statsGrid = document.getElementById('statsGrid');
  const currentBox = document.getElementById('currentDelivery');

  try {
    const data = await apiRequest('/driver/dashboard');

    document.getElementById('welcomeText').textContent = `Welcome back, ${data.driverName}!`;

    const s = data.stats;
    statsGrid.innerHTML = `
      <div class="card stat-card"><div class="value">${s.activeDeliveries}</div><div class="label">Active Deliveries</div></div>
      <div class="card stat-card"><div class="value">${s.pendingDeliveries}</div><div class="label">Pending Deliveries</div></div>
      <div class="card stat-card"><div class="value">${s.completedDeliveries}</div><div class="label">Completed Deliveries</div></div>
      <div class="card stat-card"><div class="value">₹${Number(s.totalEarnings).toLocaleString('en-IN')}</div><div class="label">Total Earnings</div></div>
    `;

    const b = data.currentDelivery;
    if (!b) {
      currentBox.innerHTML = `
        <div class="card empty-state">
          <div class="icon">📭</div>
          <p><strong>No deliveries assigned</strong></p>
          <p class="muted">New delivery assignments will appear here.</p>
        </div>
      `;
      return;
    }

    currentBox.innerHTML = `
      <div class="card">
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
          <h3>#${b.id} — ${b.pickup_location} → ${b.delivery_location}</h3>
          ${statusBadgeD(b.status)}
        </div>
        <p class="muted mt-16">Customer: ${b.customer_name} (${b.customer_phone || 'N/A'})</p>
        <p class="muted">Goods: ${b.goods_description} (${b.goods_weight_kg} kg)</p>
        <p class="muted">Vehicle: ${b.vehicle_type.replace('_',' ')} · Price: ₹${Number(b.estimated_price).toLocaleString('en-IN')}</p>
        <p class="muted">Booked on: ${new Date(b.created_at).toLocaleDateString('en-IN')}</p>
        <div class="mt-16">
          <a href="driver-deliveries.html" class="btn btn-outline btn-sm">View Details</a>
          ${currentDeliveryActions(b)}
        </div>
      </div>
    `;
  } catch (err) {
    currentBox.innerHTML = `<p class="error-text">${err.message}</p>`;
  }
}

async function driverRespond(id, action) {
  try {
    await apiRequest(`/driver/bookings/${id}/respond`, { method: 'PATCH', body: { action } });
    loadDriverDashboard();
  } catch (err) {
    alert(err.message);
  }
}

async function driverUpdateStatus(id, status) {
  try {
    await apiRequest(`/driver/bookings/${id}/status`, { method: 'PATCH', body: { status } });
    loadDriverDashboard();
  } catch (err) {
    alert(err.message);
  }
}

if (document.getElementById('statsGrid')) {
  requireAuth('driver');
  document.getElementById('logoutLink').addEventListener('click', logout);
  loadDriverDashboard();
}
