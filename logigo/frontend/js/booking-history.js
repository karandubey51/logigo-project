function statusBadgeH(status) {
  return `<span class="badge badge-${status}">${status.replace('_', ' ')}</span>`;
}

let allBookings = [];

function renderHistory() {
  const list = document.getElementById('historyList');
  const search = document.getElementById('searchInput').value.trim().toLowerCase();
  const status = document.getElementById('statusFilter').value;
  const date = document.getElementById('dateFilter').value;

  let filtered = allBookings.filter(b => {
    const matchesSearch = !search ||
      String(b.id).includes(search) ||
      b.pickup_location.toLowerCase().includes(search) ||
      b.delivery_location.toLowerCase().includes(search);
    const matchesStatus = status === 'all' || b.status === status;
    const matchesDate = !date || b.created_at.startsWith(date);
    return matchesSearch && matchesStatus && matchesDate;
  });

  if (filtered.length === 0) {
    list.innerHTML = `<p class="muted card">No bookings match your filters.</p>`;
    return;
  }

  list.innerHTML = `
    <div class="card" style="overflow-x:auto;">
      <table>
        <thead>
          <tr>
            <th>ID</th><th>Date</th><th>Pickup</th><th>Destination</th><th>Vehicle</th>
            <th>Goods</th><th>Weight</th><th>Driver</th><th>Price</th><th>Status</th><th></th>
          </tr>
        </thead>
        <tbody>
          ${filtered.map(b => `
            <tr>
              <td>#${b.id}</td>
              <td>${new Date(b.created_at).toLocaleDateString('en-IN')}</td>
              <td>${b.pickup_location}</td>
              <td>${b.delivery_location}</td>
              <td>${b.vehicle_type.replace('_',' ')}</td>
              <td>${b.goods_description}</td>
              <td>${b.goods_weight_kg} kg</td>
              <td>${b.driver_name || '—'}</td>
              <td>₹${Number(b.estimated_price).toLocaleString('en-IN')}</td>
              <td>${statusBadgeH(b.status)}</td>
              <td><a href="booking-details.html?id=${b.id}" class="btn btn-outline btn-sm">View Details</a></td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

function resetFilters() {
  document.getElementById('searchInput').value = '';
  document.getElementById('statusFilter').value = 'all';
  document.getElementById('dateFilter').value = '';
  renderHistory();
}

async function loadHistory() {
  const list = document.getElementById('historyList');
  try {
    const data = await apiRequest('/customer/bookings');
    allBookings = data.bookings;
    renderHistory();
  } catch (err) {
    list.innerHTML = `<p class="error-text">${err.message}</p>`;
  }
}

if (document.getElementById('historyList')) {
  requireAuth('customer');
  document.getElementById('logoutLink').addEventListener('click', logout);
  document.getElementById('searchInput').addEventListener('input', renderHistory);
  document.getElementById('statusFilter').addEventListener('change', renderHistory);
  document.getElementById('dateFilter').addEventListener('change', renderHistory);
  loadHistory();
}
