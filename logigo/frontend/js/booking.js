function statusBadge(status) {
  return `<span class="badge badge-${status}">${status.replace('_', ' ')}</span>`;
}

// Draws a simple static map with pickup + delivery pins and a line between
// them (Leaflet + free OpenStreetMap tiles, no API key needed). This is a
// route preview, not live GPS tracking of the driver's movement.
function renderRouteMap(elementId, pLat, pLng, dLat, dLng) {
  const map = L.map(elementId).setView([(Number(pLat) + Number(dLat)) / 2, (Number(pLng) + Number(dLng)) / 2], 11);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
  }).addTo(map);

  const pickupMarker = L.marker([pLat, pLng]).addTo(map).bindPopup('Pickup');
  const deliveryMarker = L.marker([dLat, dLng]).addTo(map).bindPopup('Delivery');
  L.polyline([[pLat, pLng], [dLat, dLng]], { color: '#2563eb', dashArray: '6 6' }).addTo(map);

  map.fitBounds([[pLat, pLng], [dLat, dLng]], { padding: [30, 30] });
}

// ---------------- Book Transport page ----------------
const bookingForm = document.getElementById('bookingForm');
if (bookingForm) {
  requireAuth('customer');
  document.getElementById('logoutLink').addEventListener('click', logout);

  function buildAddress(prefix) {
    const street = document.getElementById(`${prefix}_street`).value.trim();
    const landmark = document.getElementById(`${prefix}_landmark`).value.trim();
    const area = document.getElementById(`${prefix}_area`).value.trim();
    const city = document.getElementById(`${prefix}_city`).value.trim();
    const district = document.getElementById(`${prefix}_district`).value.trim();
    const state = document.getElementById(`${prefix}_state`).value.trim();
    return [street, landmark, area, city, district, state].filter(Boolean).join(', ');
  }

  function getFormValues() {
    return {
      pickup_location: buildAddress('pickup'),
      delivery_location: buildAddress('delivery'),
      distance_km: document.getElementById('distance_km').value,
      pickup_lat: document.getElementById('pickup_lat').value || null,
      pickup_lng: document.getElementById('pickup_lng').value || null,
      delivery_lat: document.getElementById('delivery_lat').value || null,
      delivery_lng: document.getElementById('delivery_lng').value || null,
      vehicle_type: document.getElementById('vehicle_type').value,
      goods_description: document.getElementById('goods_description').value,
      goods_weight_kg: document.getElementById('goods_weight_kg').value
    };
  }

  // "Use My Current Location" -- fills the pickup fields via GPS + free reverse geocoding
  document.getElementById('gpsBtn').addEventListener('click', async () => {
    const status = document.getElementById('gpsStatus');
    status.textContent = 'Detecting your location...';
    try {
      const { lat, lng } = await getCurrentPosition();
      document.getElementById('pickup_lat').value = lat;
      document.getElementById('pickup_lng').value = lng;

      const addr = await reverseGeocode(lat, lng);
      document.getElementById('pickup_street').value = addr.road || addr.house_number || '';
      document.getElementById('pickup_area').value = addr.suburb || addr.neighbourhood || addr.village || '';
      document.getElementById('pickup_city').value = addr.city || addr.town || '';
      document.getElementById('pickup_district').value = addr.state_district || addr.county || '';
      document.getElementById('pickup_state').value = addr.state || '';
      status.textContent = 'Location detected — please check and adjust the fields if needed.';
    } catch (err) {
      status.textContent = err.message;
    }
  });

  // Geocodes both full addresses and computes straight-line distance automatically
  document.getElementById('calcDistanceBtn').addEventListener('click', async () => {
    const errorMsg = document.getElementById('errorMsg');
    const btn = document.getElementById('calcDistanceBtn');
    errorMsg.textContent = '';
    btn.textContent = 'Calculating...';
    btn.disabled = true;

    try {
      let pickupLat = document.getElementById('pickup_lat').value;
      let pickupLng = document.getElementById('pickup_lng').value;

      // If pickup wasn't set via GPS, geocode the typed address instead
      if (!pickupLat || !pickupLng) {
        const pickupCoords = await forwardGeocode(buildAddress('pickup'));
        if (!pickupCoords) throw new Error('Could not find the pickup address. Please check it.');
        pickupLat = pickupCoords.lat;
        pickupLng = pickupCoords.lng;
        document.getElementById('pickup_lat').value = pickupLat;
        document.getElementById('pickup_lng').value = pickupLng;
      }

      const deliveryCoords = await forwardGeocode(buildAddress('delivery'));
      if (!deliveryCoords) throw new Error('Could not find the delivery address. Please check it.');
      document.getElementById('delivery_lat').value = deliveryCoords.lat;
      document.getElementById('delivery_lng').value = deliveryCoords.lng;

      const distance = haversineDistanceKm(
        parseFloat(pickupLat), parseFloat(pickupLng),
        deliveryCoords.lat, deliveryCoords.lng
      );
      const rounded = Math.max(1, Math.round(distance * 10) / 10);
      document.getElementById('distance_km').value = rounded;
      document.getElementById('distanceValue').textContent = rounded;
      document.getElementById('distanceResult').style.display = 'block';

      const estimateBtn = document.getElementById('estimateBtn');
      estimateBtn.disabled = false;
      estimateBtn.textContent = 'Get Estimated Price';
    } catch (err) {
      errorMsg.textContent = err.message;
    } finally {
      btn.textContent = '📏 Calculate Distance';
      btn.disabled = false;
    }
  });

  document.getElementById('estimateBtn').addEventListener('click', async () => {
    const errorMsg = document.getElementById('errorMsg');
    errorMsg.textContent = '';
    const { vehicle_type, distance_km, goods_weight_kg } = getFormValues();

    if (!distance_km || !goods_weight_kg) {
      errorMsg.textContent = 'Calculate the distance and enter weight first.';
      return;
    }

    try {
      const data = await apiRequest('/customer/estimate', {
        method: 'POST',
        body: { vehicle_type, distance_km, goods_weight_kg }
      });
      document.getElementById('estimatedPrice').textContent = `₹${data.estimated_price}`;
      document.getElementById('estimateResult').style.display = 'block';
    } catch (err) {
      errorMsg.textContent = err.message;
    }
  });

  bookingForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const errorMsg = document.getElementById('errorMsg');
    errorMsg.textContent = '';

    if (!document.getElementById('distance_km').value) {
      errorMsg.textContent = 'Please calculate the distance before confirming.';
      return;
    }

    try {
      const data = await apiRequest('/customer/bookings', {
        method: 'POST',
        body: getFormValues()
      });
      sessionStorage.setItem('lastBooking', JSON.stringify(data.booking));
      window.location.href = 'booking-confirmation.html';
    } catch (err) {
      errorMsg.textContent = err.message;
    }
  });
}

// ---------------- My Bookings page ----------------
const bookingsList = document.getElementById('bookingsList');
if (bookingsList) {
  requireAuth('customer');
  document.getElementById('logoutLink').addEventListener('click', logout);

  (async () => {
    try {
      const data = await apiRequest('/customer/bookings');
      if (data.bookings.length === 0) {
        bookingsList.innerHTML = `<p class="muted">No bookings yet. <a href="book-transport.html">Book one now.</a></p>`;
        return;
      }

      bookingsList.innerHTML = data.bookings.map(b => `
        <div class="card">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <h3>#${b.id} — ${b.pickup_location} → ${b.delivery_location}</h3>
            ${statusBadge(b.status)}
          </div>
          <p class="muted mt-16">Vehicle: ${b.vehicle_type.replace('_',' ')} | Goods: ${b.goods_description} (${b.goods_weight_kg} kg)</p>
          <p class="muted">Estimated Price: ₹${b.estimated_price}</p>
          ${b.driver_name ? `<p class="muted">Driver: ${b.driver_name} (${b.driver_phone || 'N/A'})</p>` : ''}
          <a href="booking-details.html?id=${b.id}" class="btn btn-outline btn-sm mt-16">View Details</a>
        </div>
      `).join('');
    } catch (err) {
      bookingsList.innerHTML = `<p class="error-text">${err.message}</p>`;
    }
  })();
}

// ---------------- Booking Details page ----------------
const detailsBody = document.getElementById('detailsBody');
if (detailsBody) {
  requireAuth('customer');
  document.getElementById('logoutLink').addEventListener('click', logout);

  const params = new URLSearchParams(window.location.search);
  const id = params.get('id');

  (async () => {
    try {
      const data = await apiRequest(`/customer/bookings/${id}`);
      const b = data.booking;
      detailsBody.innerHTML = `
        <p><strong>Status:</strong> ${statusBadge(b.status)}</p>
        <p class="mt-16"><strong>Pickup:</strong> ${b.pickup_location}</p>
        <p><strong>Delivery:</strong> ${b.delivery_location}</p>
        <p><strong>Distance:</strong> ${b.distance_km || 'N/A'} km</p>
        <p><strong>Vehicle:</strong> ${b.vehicle_type.replace('_',' ')}</p>
        <p><strong>Goods:</strong> ${b.goods_description} (${b.goods_weight_kg} kg)</p>
        <p><strong>Estimated Price:</strong> ₹${b.estimated_price}</p>
        <p><strong>Driver:</strong> ${b.driver_name || 'Not yet assigned'}</p>
        <p><strong>Placed on:</strong> ${new Date(b.created_at).toLocaleString()}</p>
        ${b.pickup_lat && b.delivery_lat ? '<div id="routeMap" style="height:300px; border-radius:8px; margin-top:16px;"></div>' : ''}
      `;
      if (b.pickup_lat && b.delivery_lat) {
        renderRouteMap('routeMap', b.pickup_lat, b.pickup_lng, b.delivery_lat, b.delivery_lng);
      }
    } catch (err) {
      detailsBody.innerHTML = `<p class="error-text">${err.message}</p>`;
    }
  })();
}
