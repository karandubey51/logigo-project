// Shared API helper for all frontend pages.
const API_BASE = '/api';

function getToken() {
  return localStorage.getItem('logigo_token');
}

// If logigo_user ever holds corrupted/invalid JSON (e.g. leftover from
// earlier testing), JSON.parse would throw and silently stop this whole
// script from running further down the file -- including the code that
// wires up the Login button. Treat bad data as "not logged in" instead.
function getUser() {
  const raw = localStorage.getItem('logigo_user');
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch (err) {
    localStorage.removeItem('logigo_user');
    localStorage.removeItem('logigo_token');
    return null;
  }
}

function saveSession(token, user) {
  localStorage.setItem('logigo_token', token);
  localStorage.setItem('logigo_user', JSON.stringify(user));
}

function clearSession() {
  localStorage.removeItem('logigo_token');
  localStorage.removeItem('logigo_user');
}

// replace() instead of href: this is a system-enforced redirect (not a
// click the person made), so it should not add its own entry to the
// browser's back/forward history -- otherwise every login/logout adds an
// extra invisible "step" the Back button has to click through.
function logout() {
  clearSession();
  window.location.replace('login.html');
}

// Redirects to login if not authenticated, or if role doesn't match
function requireAuth(role) {
  const user = getUser();
  if (!getToken() || !user || (role && user.role !== role)) {
    window.location.replace('login.html');
    return null;
  }
  return user;
}

// The browser's back/forward button can restore a page from its cache
// (bfcache) WITHOUT re-running any of this page's checks or re-fetching
// data -- so a logged-out or different-account page can flash briefly.
// Forcing a real reload whenever that happens guarantees requireAuth()
// and every data fetch on the page run fresh, every time.
window.addEventListener('pageshow', (event) => {
  if (event.persisted) {
    window.location.reload();
  }
});

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
