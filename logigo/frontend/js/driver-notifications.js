function timeAgoD(dateStr) {
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (diff < 60) return 'Just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

async function loadDriverNotifications() {
  const box = document.getElementById('notificationsList');
  try {
    const data = await apiRequest('/driver/notifications');

    if (data.notifications.length === 0) {
      box.innerHTML = `
        <div class="card empty-state">
          <div class="icon">🔔</div>
          <p><strong>No notifications yet</strong></p>
          <p class="muted">Updates about your deliveries will appear here.</p>
        </div>
      `;
      return;
    }

    box.innerHTML = data.notifications.map(n => `
      <div class="card" style="display:flex; gap:14px; align-items:flex-start; margin-bottom:12px;">
        <div style="font-size:22px;">${n.icon}</div>
        <div style="flex:1;">
          <p>${n.title}</p>
          <p class="muted" style="font-size:12px;">${n.route}</p>
        </div>
        <div class="muted" style="font-size:12px; white-space:nowrap;">${timeAgoD(n.time)}</div>
      </div>
    `).join('');
  } catch (err) {
    box.innerHTML = `<p class="error-text">${err.message}</p>`;
  }
}

if (document.getElementById('notificationsList')) {
  requireAuth('driver');
  document.getElementById('logoutLink').addEventListener('click', logout);
  loadDriverNotifications();
}
