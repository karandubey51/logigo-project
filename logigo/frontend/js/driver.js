function statusBadge(status) {
  return `<span class="badge badge-${status}">${status.replace('_', ' ')}</span>`;
}

// Defines what the driver can do next for a given status
function nextActionHtml(b) {
  if (b.status === 'assigned') {
    return `
      <button class="btn btn-success btn-sm" onclick="respond(${b.id}, 'accept')">Accept</button>
      <button class="btn btn-danger btn-sm" onclick="respond(${b.id}, 'reject')">Reject</button>
    `;
  }
  if (b.status === 'accepted') {
    return `<button class="btn btn-primary btn-sm" onclick="updateStatus(${b.id}, 'picked_up')">Mark Picked Up</button>`;
  }
  if (b.status === 'picked_up') {
    return `<button class="btn btn-primary btn-sm" onclick="updateStatus(${b.id}, 'in_transit')">Mark In Transit</button>`;
  }
  if (b.status === 'in_transit') {
    return `<button class="btn btn-success btn-sm" onclick="updateStatus(${b.id}, 'delivered')">Mark Delivered</button>`;
  }
  return '';
}

async function loadDeliveries() {
  const list = document.getElementById('deliveriesList');
  try {
    const data = await apiRequest('/driver/bookings');
    if (data.bookings.length === 0) {
      list.innerHTML = `<p class="muted">No deliveries assigned yet.</p>`;
      return;
    }
    list.innerHTML = data.bookings.map(b => `
      <div class="card">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <h3>#${b.id} — ${b.pickup_location} → ${b.delivery_location}</h3>
          ${statusBadge(b.status)}
        </div>
        <p class="muted mt-16">Goods: ${b.goods_description} (${b.goods_weight_kg} kg)</p>
        <p class="muted">Customer: ${b.customer_name} (${b.customer_phone || 'N/A'})</p>
        <div class="mt-16">${nextActionHtml(b)}</div>
      </div>
    `).join('');
  } catch (err) {
    list.innerHTML = `<p class="error-text">${err.message}</p>`;
  }
}

async function respond(id, action) {
  try {
    await apiRequest(`/driver/bookings/${id}/respond`, { method: 'PATCH', body: { action } });
    loadDeliveries();
  } catch (err) {
    alert(err.message);
  }
}

async function updateStatus(id, status) {
  try {
    await apiRequest(`/driver/bookings/${id}/status`, { method: 'PATCH', body: { status } });
    loadDeliveries();
  } catch (err) {
    alert(err.message);
  }
}

if (document.getElementById('deliveriesList')) {
  requireAuth('driver');
  document.getElementById('logoutLink').addEventListener('click', logout);
  loadDeliveries();
}
