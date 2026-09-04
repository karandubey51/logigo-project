function statusBadgeDH(status) {
  return `<span class="badge badge-${status}">${status.replace('_', ' ')}</span>`;
}

let allDeliveries = [];

function renderDeliveryHistory() {
  const list = document.getElementById('historyList');
  const search = document.getElementById('searchInput').value.trim().toLowerCase();
  const status = document.getElementById('statusFilter').value;

  let filtered = allDeliveries.filter(b => {
    const matchesSearch = !search ||
      String(b.id).includes(search) ||
      b.customer_name.toLowerCase().includes(search) ||
      b.pickup_location.toLowerCase().includes(search) ||
      b.delivery_location.toLowerCase().includes(search);
    const matchesStatus = status === 'all' || b.status === status;
    return matchesSearch && matchesStatus;
  });

  if (filtered.length === 0) {
    list.innerHTML = `<p class="muted card">No deliveries match your filters.</p>`;
    return;
  }

  list.innerHTML = `
    <div class="card" style="overflow-x:auto;">
      <table>
        <thead>
          <tr>
            <th>ID</th><th>Customer</th><th>Pickup</th><th>Destination</th><th>Date</th>
            <th>Vehicle</th><th>Earnings</th><th>Status</th>
          </tr>
        </thead>
        <tbody>
          ${filtered.map(b => `
            <tr>
              <td>#${b.id}</td>
              <td>${b.customer_name}</td>
              <td>${b.pickup_location}</td>
              <td>${b.delivery_location}</td>
              <td>${new Date(b.created_at).toLocaleDateString('en-IN')}</td>
              <td>${b.vehicle_type.replace('_',' ')}</td>
              <td>${b.status === 'delivered' ? '₹' + Number(b.estimated_price).toLocaleString('en-IN') : '—'}</td>
              <td>${statusBadgeDH(b.status)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

function resetDriverFilters() {
  document.getElementById('searchInput').value = '';
  document.getElementById('statusFilter').value = 'all';
  renderDeliveryHistory();
}

async function loadDeliveryHistory() {
  const list = document.getElementById('historyList');
  try {
    const data = await apiRequest('/driver/bookings');
    allDeliveries = data.bookings;
    renderDeliveryHistory();
  } catch (err) {
    list.innerHTML = `<p class="error-text">${err.message}</p>`;
  }
}

if (document.getElementById('historyList')) {
  requireAuth('driver');
  document.getElementById('logoutLink').addEventListener('click', logout);
  document.getElementById('searchInput').addEventListener('input', renderDeliveryHistory);
  document.getElementById('statusFilter').addEventListener('change', renderDeliveryHistory);
  loadDeliveryHistory();
}
