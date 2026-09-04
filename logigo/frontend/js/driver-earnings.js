async function loadDriverEarnings() {
  const statsBox = document.getElementById('earningsStats');
  const historyBox = document.getElementById('earningsHistory');

  try {
    const data = await apiRequest('/driver/earnings');

    statsBox.innerHTML = `
      <div class="card stat-card"><div class="value">₹${Number(data.totalEarnings).toLocaleString('en-IN')}</div><div class="label">Total Earnings</div></div>
      <div class="card stat-card"><div class="value">${data.completedDeliveries}</div><div class="label">Completed Deliveries</div></div>
      <div class="card stat-card"><div class="value">₹${Number(data.thisMonthEarnings).toLocaleString('en-IN')}</div><div class="label">This Month's Earnings</div></div>
    `;

    if (data.history.length === 0) {
      historyBox.innerHTML = `<p class="muted card">No completed deliveries yet. Earnings will appear here once a delivery is marked completed.</p>`;
      return;
    }

    historyBox.innerHTML = `
      <div class="card" style="overflow-x:auto;">
        <table>
          <thead><tr><th>Booking ID</th><th>Date</th><th>Customer</th><th>Amount</th><th>Status</th></tr></thead>
          <tbody>
            ${data.history.map(h => `
              <tr>
                <td>#${h.id}</td>
                <td>${new Date(h.updated_at).toLocaleDateString('en-IN')}</td>
                <td>${h.customer_name}</td>
                <td>₹${Number(h.estimated_price).toLocaleString('en-IN')}</td>
                <td><span class="badge badge-delivered">completed</span></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  } catch (err) {
    statsBox.innerHTML = `<p class="error-text">${err.message}</p>`;
  }
}

if (document.getElementById('earningsStats')) {
  requireAuth('driver');
  document.getElementById('logoutLink').addEventListener('click', logout);
  loadDriverEarnings();
}
