function initials(name) {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

// Shrinks a chosen photo down before turning it into base64, so it stays
// small enough to store/send reliably (no external file storage needed).
function resizeImageToBase64(file, maxSize = 200) {
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

function avatarHtml(name, photo) {
  if (photo) {
    return `<img src="${photo}" style="width:64px; height:64px; border-radius:50%; object-fit:cover;">`;
  }
  return `<div style="width:64px; height:64px; border-radius:50%; background:var(--primary); color:#fff; display:flex; align-items:center; justify-content:center; font-size:22px; font-weight:700;">${initials(name)}</div>`;
}

async function loadCustomerProfile() {
  const box = document.getElementById('profileView');
  try {
    const data = await apiRequest('/customer/profile');
    const p = data.profile;

    box.innerHTML = `
      <div class="card" style="max-width:560px;">
        <div style="display:flex; align-items:center; gap:16px;">
          ${avatarHtml(p.name, p.profile_photo)}
          <div>
            <h3>${p.name}</h3>
            <p class="muted">Customer since ${new Date(p.created_at).toLocaleDateString('en-IN', { year: 'numeric', month: 'long' })}</p>
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

    document.getElementById('photoInput').addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const photoMsg = document.getElementById('photoMsg');
      photoMsg.textContent = 'Uploading...';
      try {
        const base64 = await resizeImageToBase64(file);
        await apiRequest('/customer/profile', {
          method: 'PUT',
          body: { name: p.name, phone: p.phone, address: p.address, profile_photo: base64 }
        });
        photoMsg.textContent = 'Photo updated!';
        loadCustomerProfile();
      } catch (err) {
        photoMsg.textContent = 'Could not update photo: ' + err.message;
      }
    });

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
