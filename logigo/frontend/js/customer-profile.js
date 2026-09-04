function initials(name) {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

async function loadCustomerProfile() {
  const box = document.getElementById('profileView');
  try {
    const data = await apiRequest('/customer/profile');
    const p = data.profile;

    box.innerHTML = `
      <div class="card" style="max-width:560px;">
        <div style="display:flex; align-items:center; gap:16px;">
          <div style="width:64px; height:64px; border-radius:50%; background:var(--primary); color:#fff; display:flex; align-items:center; justify-content:center; font-size:22px; font-weight:700;">
            ${initials(p.name)}
          </div>
          <div>
            <h3>${p.name}</h3>
            <p class="muted">Customer since ${new Date(p.created_at).toLocaleDateString('en-IN', { year: 'numeric', month: 'long' })}</p>
          </div>
        </div>

        <div class="grid grid-2 mt-24">
          <div><p class="muted" style="font-size:12px;">Email</p><p>${p.email}</p></div>
          <div><p class="muted" style="font-size:12px;">Phone</p><p>${p.phone || '—'}</p></div>
          <div style="grid-column: 1 / -1;"><p class="muted" style="font-size:12px;">Address</p><p>${p.address || '—'}</p></div>
          <div><p class="muted" style="font-size:12px;">Total Bookings</p><p>${data.totalBookings}</p></div>
        </div>

        <button class="btn btn-primary mt-24" onclick="showEditForm()">Edit Profile</button>
      </div>

      <form id="editForm" class="card mt-24" style="max-width:560px; display:none;">
        <h3>Edit Profile</h3>
        <div class="form-group mt-16">
          <label>Full Name</label>
          <input type="text" id="editName" value="${p.name}" required>
        </div>
        <div class="form-group">
          <label>Phone</label>
          <input type="text" id="editPhone" value="${p.phone || ''}">
        </div>
        <div class="form-group">
          <label>Address</label>
          <input type="text" id="editAddress" value="${p.address || ''}">
        </div>
        <p class="muted" style="font-size:12px;">Email cannot be changed here.</p>
        <div class="mt-16">
          <button type="submit" class="btn btn-primary">Save Changes</button>
          <button type="button" class="btn btn-outline" onclick="cancelEdit()">Cancel</button>
        </div>
        <p id="profileMsg" class="mt-16"></p>
      </form>
    `;

    document.getElementById('editForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const msg = document.getElementById('profileMsg');
      msg.textContent = '';
      try {
        await apiRequest('/customer/profile', {
          method: 'PUT',
          body: {
            name: document.getElementById('editName').value,
            phone: document.getElementById('editPhone').value,
            address: document.getElementById('editAddress').value
          }
        });
        msg.textContent = 'Profile updated successfully!';
        msg.className = 'success-text';
        loadCustomerProfile();
      } catch (err) {
        msg.textContent = err.message;
        msg.className = 'error-text';
      }
    });
  } catch (err) {
    box.innerHTML = `<p class="error-text">${err.message}</p>`;
  }
}

function showEditForm() {
  document.getElementById('editForm').style.display = 'block';
  document.getElementById('editForm').scrollIntoView({ behavior: 'smooth' });
}

function cancelEdit() {
  document.getElementById('editForm').style.display = 'none';
}

if (document.getElementById('profileView')) {
  requireAuth('customer');
  document.getElementById('logoutLink').addEventListener('click', logout);
  loadCustomerProfile();
}
