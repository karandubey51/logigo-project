function statusBadgeC(status) {
  return `<span class="badge badge-${status}">${status.replace('_', ' ')}</span>`;
}

async function loadCustomerDashboard() {
  const statsGrid = document.getElementById('statsGrid');
  const currentBox = document.getElementById('currentBooking');
  const recentBox = document.getElementById('recentBookings');

  try {
    const data = await apiRequest('/customer/dashboard');

    document.getElementById('welcomeText').textContent = `Welcome back, ${data.customerName}!`;

    const s = data.stats;
    statsGrid.innerHTML = `
      <div class="card stat-card"><div class="value">${s.totalBookings}</div><div class="label">Total Bookings</div></div>
      <div class="card stat-card"><div class="value">${s.pendingBookings}</div><div class="label">Pending Bookings</div></div>
      <div class="card stat-card"><div class="value">${s.activeDeliveries}</div><div class="label">Active Deliveries</div></div>
      <div class="card stat-card"><div class="value">${s.completedBookings}</div><div class="label">Completed Bookings</div></div>
    `;

    // ---------------- Active Booking ----------------
    const b = data.currentBooking;
    if (!b) {
      currentBox.innerHTML = `
        <div class="card empty-state">
          <div class="icon">📭</div>
          <p><strong>No active booking</strong></p>
          <p class="muted">Book a transport to see it here.</p>
          <a href="book-transport.html" class="btn btn-primary btn-sm mt-16">Book Transport</a>
        </div>
      `;
    } else {
      currentBox.innerHTML = `
        <div class="card">
          <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
            <h3>#${b.id} — ${b.pickup_location} → ${b.delivery_location}</h3>
            ${statusBadgeC(b.status)}
          </div>
          <p class="muted mt-16">Vehicle: ${b.vehicle_type.replace('_',' ')} · Price: ₹${Number(b.estimated_price).toLocaleString('en-IN')}</p>
          <p class="muted">Driver: ${b.driver_name || 'Not assigned yet'}</p>
          <p class="muted">Booked on: ${new Date(b.created_at).toLocaleDateString('en-IN')}</p>
          <div class="mt-16">
            <a href="booking-details.html?id=${b.id}" class="btn btn-outline btn-sm">View Details</a>
          </div>
        </div>
      `;
    }

    // ---------------- Recent Bookings ----------------
    if (data.recentBookings.length === 0) {
      recentBox.innerHTML = `<p class="muted">No bookings yet.</p>`;
      return;
    }

    recentBox.innerHTML = `
      <div class="card" style="overflow-x:auto;">
        <table>
          <thead>
            <tr><th>ID</th><th>Date</th><th>Pickup</th><th>Destination</th><th>Vehicle</th><th>Price</th><th>Status</th><th></th></tr>
          </thead>
          <tbody>
            ${data.recentBookings.map(r => `
              <tr>
                <td>#${r.id}</td>
                <td>${new Date(r.created_at).toLocaleDateString('en-IN')}</td>
                <td>${r.pickup_location}</td>
                <td>${r.delivery_location}</td>
                <td>${r.vehicle_type.replace('_',' ')}</td>
                <td>₹${Number(r.estimated_price).toLocaleString('en-IN')}</td>
                <td>${statusBadgeC(r.status)}</td>
                <td><a href="booking-details.html?id=${r.id}" class="btn btn-outline btn-sm">View Details</a></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  } catch (err) {
    currentBox.innerHTML = `<p class="error-text">${err.message}</p>`;
  }
}

if (document.getElementById('statsGrid')) {
  requireAuth('customer');
  document.getElementById('logoutLink').addEventListener('click', logout);
  loadCustomerDashboard();
}
