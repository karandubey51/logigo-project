// Free geocoding helpers using OpenStreetMap's Nominatim service (no API key,
// no cost). Nominatim asks for max ~1 request/second, which is fine for a
// single person booking a delivery.

// Turns lat/lng (from the browser's GPS) into a readable address.
async function reverseGeocode(lat, lng) {
  const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Could not look up that location');
  const data = await res.json();
  return data.address || {};
}

// Turns a typed address into lat/lng coordinates.
async function forwardGeocode(addressText) {
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(addressText)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Could not find that address');
  const data = await res.json();
  if (data.length === 0) return null;
  return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
}

// Straight-line distance between two GPS points, in kilometers.
function haversineDistanceKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Gets the browser's current GPS position as a Promise.
function getCurrentPosition() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Your browser does not support location detection'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => reject(new Error('Could not get your location: ' + err.message)),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  });
}
