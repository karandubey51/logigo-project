// ---------------- Login page ----------------
const loginForm = document.getElementById('loginForm');
if (loginForm) {
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const role = document.getElementById('role').value;
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const errorMsg = document.getElementById('errorMsg');
    errorMsg.textContent = '';

    try {
      const data = await apiRequest('/auth/login', {
        method: 'POST',
        body: { role, email, password }
      });
      saveSession(data.token, data.user);

      if (role === 'customer') window.location.href = 'customer-dashboard.html';
      else if (role === 'driver') window.location.href = 'driver-dashboard.html';
      else window.location.href = 'admin-dashboard.html';
    } catch (err) {
      errorMsg.textContent = err.message;
    }
  });
}

// ---------------- Register page ----------------
const registerForm = document.getElementById('registerForm');
if (registerForm) {
  const roleSelect = document.getElementById('role');
  const customerFields = document.getElementById('customerFields');
  const driverFields = document.getElementById('driverFields');

  roleSelect.addEventListener('change', () => {
    const isDriver = roleSelect.value === 'driver';
    driverFields.style.display = isDriver ? 'block' : 'none';
    customerFields.style.display = isDriver ? 'none' : 'block';
  });

  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const errorMsg = document.getElementById('errorMsg');
    errorMsg.textContent = '';

    const role = roleSelect.value;
    const payload = {
      role,
      name: document.getElementById('name').value,
      email: document.getElementById('email').value,
      password: document.getElementById('password').value,
      phone: document.getElementById('phone').value
    };

    if (role === 'customer') {
      payload.address = document.getElementById('address').value;
    } else {
      payload.license_number = document.getElementById('license_number').value;
      payload.vehicle_type = document.getElementById('vehicle_type').value;
      payload.vehicle_number = document.getElementById('vehicle_number').value;
    }

    try {
      const data = await apiRequest('/auth/register', { method: 'POST', body: payload });
      saveSession(data.token, data.user);
      window.location.href = role === 'customer' ? 'customer-dashboard.html' : 'driver-dashboard.html';
    } catch (err) {
      errorMsg.textContent = err.message;
    }
  });
}
