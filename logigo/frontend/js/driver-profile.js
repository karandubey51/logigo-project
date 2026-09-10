function initialsD(name) {
  return name.trim().split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

function resizeImageToBase64D(file, maxSize = 200) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;
        if (width > height) { height = height * (maxSize / width); width = maxSize; }
        else { width = width * (maxSize / height); height = maxSize; }
        canvas.width = width;
        canvas.height = height;
        canvas.getContext('2d').drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.7));
      };
      img.onerror = reject;
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function avatarHtmlD(name, photo) {
  if (photo) {
    return `<img src="${photo}" style="width:64px; height:64px; border-radius:50%; object-fit:cover;">`;
  }
  return `<div style="width:64px; height:64px; border-radius:50%; background:var(--primary); color:#fff; display:flex; align-items:center; justify-content:center; font-size:22px; font-weight:700;">${initialsD(name)}</div>`;
}

async function loadDriverProfile() {
  const box = document.getElementById('profileView');
  try {
    const data = await apiRequest('/driver/profile');
    const p = data.profile;
    const s = data.stats;

    box.innerHTML = `
      <div class="card" style="max-width:560px;">
        <div style="display:flex; align-items:center; gap:16px;">
          ${avatarHtmlD(p.name, p.profile_photo)}
          <div>
            <h3>${p.name}</h3>
            <p class="muted">Driver since ${new Date(p.created_at).toLocaleDateString('en-IN', { year: 'numeric', month: 'long' })}</p>
          </div>
        </div>

        <div class="mt-16">
          <label class="btn btn-outline btn-sm" style="cursor:pointer;">
            📷 Change Photo
            <input type="file" id="photoInput" accept="image/*" style="display:none;">
          </label>
          <p id="photoMsg" style="font-size:12px;"></p>
        </div>

        <div class="grid grid-2 mt-24">
          <div><p class="muted" style="font-size:12px;">Email</p><p>${p.email}</p></div>
          <div><p class="muted" style="font-size:12px;">Phone</p><p>${p.phone || '—'}</p></div>
          <div><p class="muted" style="font-size:12px;">License Number</p><p>${p.license_number || '—'}</p></div>
          <div><p class="muted" style="font-size:12px;">Vehicle Type</p><p>${p.vehicle_type.replace('_',' ')}</p></div>
          <div><p class="muted" style="font-size:12px;">Vehicle Number</p><p>${p.vehicle_number || '—'}</p></div>
          <div><p class="muted" style="font-size:12px;">Approval Status</p><p>${p.approval_status}</p></div>
        </div>
      </div>

      <div class="grid grid-3 mt-24" style="max-width:560px;">
        <div class="card stat-card"><div class="value">${s.totalDeliveries}</div><div class="label">Total Deliveries</div></div>
        <div class="card stat-card"><div class="value">${s.completedDeliveries}</div><div class="label">Completed</div></div>
        <div class="card stat-card"><div class="value">${s.activeDeliveries}</div><div class="label">Active</div></div>
      </div>
      <div class="card stat-card mt-24" style="max-width:560px;">
        <div class="value">₹${Number(s.totalEarnings).toLocaleString('en-IN')}</div>
        <div class="label">Total Earnings</div>
      </div>

      <button class="btn btn-primary mt-24" onclick="showDriverEditForm()">Edit Profile</button>

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
          <label>Vehicle Number</label>
          <input type="text" id="editVehicleNumber" value="${p.vehicle_number || ''}">
        </div>
        <p class="muted" style="font-size:12px;">Email, license number and vehicle type cannot be changed here. Contact admin if needed.</p>
        <div class="mt-16">
          <button type="submit" class="btn btn-primary">Save Changes</button>
          <button type="button" class="btn btn-outline" onclick="cancelDriverEdit()">Cancel</button>
        </div>
        <p id="profileMsg" class="mt-16"></p>
      </form>
    `;

    document.getElementById('photoInput').addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const photoMsg = document.getElementById('photoMsg');
      photoMsg.textContent = 'Uploading...';
      try {
        const base64 = await resizeImageToBase64D(file);
        await apiRequest('/driver/profile', {
          method: 'PUT',
          body: { name: p.name, phone: p.phone, vehicle_number: p.vehicle_number, profile_photo: base64 }
        });
        photoMsg.textContent = 'Photo updated!';
        loadDriverProfile();
      } catch (err) {
        photoMsg.textContent = 'Could not update photo: ' + err.message;
      }
    });

    document.getElementById('editForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const msg = document.getElementById('profileMsg');
      msg.textContent = '';
      try {
        await apiRequest('/driver/profile', {
          method: 'PUT',
          body: {
            name: document.getElementById('editName').value,
            phone: document.getElementById('editPhone').value,
            vehicle_number: document.getElementById('editVehicleNumber').value
          }
        });
        msg.textContent = 'Profile updated successfully!';
        msg.className = 'success-text';
        loadDriverProfile();
      } catch (err) {
        msg.textContent = err.message;
        msg.className = 'error-text';
      }
    });
  } catch (err) {
    box.innerHTML = `<p class="error-text">${err.message}</p>`;
  }
}

function showDriverEditForm() {
  document.getElementById('editForm').style.display = 'block';
  document.getElementById('editForm').scrollIntoView({ behavior: 'smooth' });
}

function cancelDriverEdit() {
  document.getElementById('editForm').style.display = 'none';
}

if (document.getElementById('profileView')) {
  requireAuth('driver');
  document.getElementById('logoutLink').addEventListener('click', logout);
  loadDriverProfile();
}
