if (document.getElementById('passwordForm')) {
  requireAuth('driver');
  document.getElementById('logoutLink').addEventListener('click', logout);

  document.getElementById('passwordForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const msg = document.getElementById('settingsMsg');
    msg.textContent = '';

    const current_password = document.getElementById('currentPassword').value;
    const new_password = document.getElementById('newPassword').value;
    const confirm_password = document.getElementById('confirmPassword').value;

    if (new_password !== confirm_password) {
      msg.textContent = 'New password and confirm password do not match.';
      msg.className = 'error-text';
      return;
    }

    try {
      const data = await apiRequest('/driver/change-password', {
        method: 'PUT',
        body: { current_password, new_password }
      });
      msg.textContent = data.message;
      msg.className = 'success-text';
      document.getElementById('passwordForm').reset();
    } catch (err) {
      msg.textContent = err.message;
      msg.className = 'error-text';
    }
  });
}
