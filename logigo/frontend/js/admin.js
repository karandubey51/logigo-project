function statusBadge(status) {
  return `<span class="badge badge-${status}">${status.replace('_', ' ')}</span>`;
}

const STATUS_OPTIONS = [
  'pending', 'assigned', 'accepted', 'rejected',
  'picked_up', 'in_transit', 'delivered', 'cancelled'
];

async function loadDashboard() {
  const data = await apiRequest('/admin/dashboard');
  const statsGrid = document.getElementById('statsGrid');
  const items = [
    ['Total Customers', data.totalCustomers],
    ['Total Drivers', data.totalDrivers],
    ['Total Bookings', data.totalBookings],
    ['Pending Bookings', data.pendingBookings],
    ['Active Deliveries', data.activeDeliveries],
    ['Delivered', data.deliveredBookings]
  ];
  statsGrid.innerHTML = items.map(([label, value]) => `
    <div class="card stat-card">
      <div class="value">${value}</div>
      <div class="label">${label}</div>
    </div>
  `).join('');

  const badge = document.getElementById('pendingDriversBadge');
  if (badge) {
    if (data.pendingDrivers > 0) {
      badge.textContent = data.pendingDrivers;
      badge.style.display = 'inline-block';
    } else {
      badge.style.display = 'none';
    }
  }
}

let availableDrivers = [];

async function loadBookings() {
  const data = await apiRequest('/admin/bookings');
  const driversData = await apiRequest('/admin/drivers');
  availableDrivers = driversData.drivers.filter(d => d.status === 'available');

  const panel = document.getElementById('bookingsTab');
  if (data.bookings.length === 0) {
    panel.innerHTML = `<p class="muted">No bookings yet.</p>`;
    return;
  }

  panel.innerHTML = `
    <table>
      <thead>
        <tr>
          <th>ID</th><th>Customer</th><th>Route</th><th>Vehicle</th>
          <th>Status</th><th>Driver</th><th>Actions</th>
        </tr>
      </thead>
      <tbody>
        ${data.bookings.map(b => `
          <tr>
            <td>#${b.id}</td>
            <td>${b.customer_name}</td>
            <td>${b.pickup_location} → ${b.delivery_location}</td>
            <td>${b.vehicle_type.replace('_',' ')}</td>
            <td>${statusBadge(b.status)}</td>
            <td>${b.driver_name || '—'}</td>
            <td>
              ${b.status === 'pending' ? `
                <select id="driverSelect-${b.id}" style="width:auto; display:inline-block;">
                  <option value="">Assign driver...</option>
                  ${availableDrivers.map(d => `<option value="${d.id}">${d.name} (${d.vehicle_type.replace('_',' ')})</option>`).join('')}
                </select>
                <button class="btn btn-primary btn-sm" onclick="assignDriver(${b.id})">Assign</button>
              ` : ''}
              <select id="statusSelect-${b.id}" style="width:auto; display:inline-block; margin-top:6px;">
                ${STATUS_OPTIONS.map(s => `<option value="${s}" ${s === b.status ? 'selected' : ''}>${s.replace('_',' ')}</option>`).join('')}
              </select>
              <button class="btn btn-outline btn-sm" onclick="changeStatus(${b.id})">Update</button>
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

async function loadCustomers() {
  const data = await apiRequest('/admin/customers');
  const panel = document.getElementById('customersTab');
  panel.innerHTML = `
    <table>
      <thead><tr><th>ID</th><th>Name</th><th>Email</th><th>Phone</th><th>Address</th><th>Actions</th></tr></thead>
      <tbody>
        ${data.customers.map(c => `
          <tr>
            <td>#${c.id}</td><td>${c.name}</td><td>${c.email}</td><td>${c.phone || '—'}</td><td>${c.address || '—'}</td>
            <td><button class="btn btn-outline btn-sm" onclick="deleteCustomerRow(${c.id})">Delete</button></td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

async function deleteCustomerRow(customerId) {
  if (!confirm('Delete this customer? This will also delete all of their bookings. This cannot be undone.')) return;
  try {
    await apiRequest(`/admin/customers/${customerId}`, { method: 'DELETE' });
    loadCustomers();
    loadDashboard();
  } catch (err) {
    alert(err.message);
  }
}

async function loadDrivers() {
  const data = await apiRequest('/admin/drivers');
  const panel = document.getElementById('driversTab');
  panel.innerHTML = `
    <table>
      <thead><tr><th>ID</th><th>Name</th><th>Email</th><th>Vehicle</th><th>Status</th><th>Approval</th></tr></thead>
      <tbody>
        ${data.drivers.map(d => `
          <tr><td>#${d.id}</td><td>${d.name}</td><td>${d.email}</td><td>${d.vehicle_type.replace('_',' ')}</td><td>${d.status}</td><td>${d.approval_status}</td></tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

async function loadPendingDrivers() {
  const data = await apiRequest('/admin/drivers/pending');
  const panel = document.getElementById('pendingDriversTab');

  if (data.drivers.length === 0) {
    panel.innerHTML = `<p class="muted">No pending driver requests.</p>`;
    return;
  }

  panel.innerHTML = `
    <table>
      <thead>
        <tr><th>ID</th><th>Name</th><th>Email</th><th>Phone</th><th>License</th><th>Vehicle</th><th>Actions</th></tr>
      </thead>
      <tbody>
        ${data.drivers.map(d => `
          <tr>
            <td>#${d.id}</td>
            <td>${d.name}</td>
            <td>${d.email}</td>
            <td>${d.phone || '—'}</td>
            <td>${d.license_number || '—'}</td>
            <td>${d.vehicle_type.replace('_',' ')} (${d.vehicle_number || '—'})</td>
            <td>
              <button class="btn btn-primary btn-sm" onclick="driverDecision(${d.id}, 'approved')">Approve</button>
              <button class="btn btn-outline btn-sm" onclick="driverDecision(${d.id}, 'rejected')">Reject</button>
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

async function driverDecision(driverId, decision) {
  if (!confirm(`Are you sure you want to ${decision === 'approved' ? 'approve' : 'reject'} this driver?`)) return;
  try {
    await apiRequest(`/admin/drivers/${driverId}/approve`, {
      method: 'PATCH',
      body: { decision }
    });
    loadPendingDrivers();
    loadDrivers();
    loadDashboard();
  } catch (err) {
    alert(err.message);
  }
}

async function assignDriver(bookingId) {
  const select = document.getElementById(`driverSelect-${bookingId}`);
  const driverId = select.value;
  if (!driverId) return alert('Select a driver first');

  try {
    await apiRequest(`/admin/bookings/${bookingId}/assign`, {
      method: 'PATCH',
      body: { driver_id: driverId }
    });
    loadBookings();
    loadDashboard();
  } catch (err) {
    alert(err.message);
  }
}

async function changeStatus(bookingId) {
  const select = document.getElementById(`statusSelect-${bookingId}`);
  try {
    await apiRequest(`/admin/bookings/${bookingId}/status`, {
      method: 'PATCH',
      body: { status: select.value }
    });
    loadBookings();
    loadDashboard();
  } catch (err) {
    alert(err.message);
  }
}

// ---------------- Tabs ----------------
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    document.querySelectorAll('.tab-panel').forEach(p => p.style.display = 'none');

    const tab = btn.dataset.tab;
    document.getElementById(`${tab}Tab`).style.display = 'block';
    if (tab === 'bookings') loadBookings();
    if (tab === 'customers') loadCustomers();
    if (tab === 'drivers') loadDrivers();
    if (tab === 'pendingDrivers') loadPendingDrivers();
  });
});

if (document.getElementById('statsGrid')) {
  requireAuth('admin');
  document.getElementById('logoutLink').addEventListener('click', logout);
  loadDashboard();
  loadBookings();
  loadPendingDrivers();
}
