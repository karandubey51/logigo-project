function statusBadge(status) {
  return `<span class="badge badge-${status}">${status.replace('_', ' ')}</span>`;
}

// ---------------- Book Transport page ----------------
const bookingForm = document.getElementById('bookingForm');
if (bookingForm) {
  requireAuth('customer');
  document.getElementById('logoutLink').addEventListener('click', logout);

  function getFormValues() {
    return {
      pickup_location: document.getElementById('pickup_location').value,
      delivery_location: document.getElementById('delivery_location').value,
      distance_km: document.getElementById('distance_km').value,
      vehicle_type: document.getElementById('vehicle_type').value,
      goods_description: document.getElementById('goods_description').value,
      goods_weight_kg: document.getElementById('goods_weight_kg').value
    };
  }

  document.getElementById('estimateBtn').addEventListener('click', async () => {
    const errorMsg = document.getElementById('errorMsg');
    errorMsg.textContent = '';
    const { vehicle_type, distance_km, goods_weight_kg } = getFormValues();

    if (!distance_km || !goods_weight_kg) {
      errorMsg.textContent = 'Enter distance and weight first.';
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
      `;
    } catch (err) {
      detailsBody.innerHTML = `<p class="error-text">${err.message}</p>`;
    }
  })();
}
