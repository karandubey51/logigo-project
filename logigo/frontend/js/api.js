// Shared API helper for all frontend pages.
// Assumes the backend runs on the same host at port 5000.
const API_BASE = 'https://logigo-project.onrender.com/api';

function getToken() {
  return localStorage.getItem('logigo_token');
}

function getUser() {
  const raw = localStorage.getItem('logigo_user');
  return raw ? JSON.parse(raw) : null;
}

function saveSession(token, user) {
  localStorage.setItem('logigo_token', token);
  localStorage.setItem('logigo_user', JSON.stringify(user));
}

function clearSession() {
  localStorage.removeItem('logigo_token');
  localStorage.removeItem('logigo_user');
}

function logout() {
  clearSession();
  window.location.href = 'login.html';
}

// Redirects to login if not authenticated, or if role doesn't match
function requireAuth(role) {
  const user = getUser();
  if (!getToken() || !user || (role && user.role !== role)) {
    window.location.href = 'login.html';
    return null;
  }
  return user;
}

// Generic fetch wrapper that attaches the JWT and handles JSON
async function apiRequest(path, { method = 'GET', body } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.message || 'Something went wrong');
  }
  return data;
}
