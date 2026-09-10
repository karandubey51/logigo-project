const pool = require('../config/db');
const { calculateFare } = require('../utils/fareCalculator');

// GET /api/customer/profile -- full profile + booking stats, no password
async function getProfile(req, res) {
  try {
    const customerId = req.user.id;

    const [[customer]] = await pool.query(
      'SELECT id, name, email, phone, address, profile_photo, created_at FROM customers WHERE id = ?',
      [customerId]
    );
    if (!customer) return res.status(404).json({ message: 'Customer not found' });

    const [[{ totalBookings }]] = await pool.query(
      'SELECT COUNT(*) AS totalBookings FROM bookings WHERE customer_id = ?',
      [customerId]
    );

    res.json({ profile: customer, totalBookings });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error fetching profile' });
  }
}

// PUT /api/customer/profile -- edit name, phone, address, profile photo (not email/password here)
async function updateProfile(req, res) {
  try {
    const { name, phone, address, profile_photo } = req.body;
    if (!name) return res.status(400).json({ message: 'Name is required' });

    if (profile_photo !== undefined) {
      await pool.query(
        'UPDATE customers SET name = ?, phone = ?, address = ?, profile_photo = ? WHERE id = ?',
        [name, phone || null, address || null, profile_photo, req.user.id]
      );
    } else {
      await pool.query(
        'UPDATE customers SET name = ?, phone = ?, address = ? WHERE id = ?',
        [name, phone || null, address || null, req.user.id]
      );
    }

    const [[customer]] = await pool.query(
      'SELECT id, name, email, phone, address, profile_photo, created_at FROM customers WHERE id = ?',
      [req.user.id]
    );
    res.json({ message: 'Profile updated successfully', profile: customer });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error updating profile' });
  }
}

const NOTIF_MESSAGES_CUSTOMER = {
  pending: { icon: '📝', text: 'Your booking was created and is awaiting confirmation.' },
  assigned: { icon: '🚚', text: 'A driver has been assigned to your booking.' },
  accepted: { icon: '✅', text: 'The driver accepted your booking.' },
  rejected: { icon: '❌', text: 'The driver rejected this booking. Admin will reassign.' },
  picked_up: { icon: '📦', text: 'Your goods have been picked up.' },
  in_transit: { icon: '🛣️', text: 'Your delivery is in transit.' },
  delivered: { icon: '🎉', text: 'Your delivery was completed successfully.' },
  cancelled: { icon: '🚫', text: 'This booking was cancelled.' }
};

// GET /api/customer/notifications -- derived from real booking_status_history
async function getNotifications(req, res) {
  try {
    const [rows] = await pool.query(
      `SELECT h.id, h.booking_id, h.status, h.changed_at, b.pickup_location, b.delivery_location
       FROM booking_status_history h
       JOIN bookings b ON h.booking_id = b.id
       WHERE b.customer_id = ?
       ORDER BY h.changed_at DESC
       LIMIT 30`,
      [req.user.id]
    );

    const notifications = rows.map(r => {
      const meta = NOTIF_MESSAGES_CUSTOMER[r.status] || { icon: '🔔', text: `Status updated to ${r.status}.` };
      return {
        id: r.id,
        icon: meta.icon,
        title: `Booking #${r.booking_id} — ${meta.text}`,
        route: `${r.pickup_location} → ${r.delivery_location}`,
        time: r.changed_at,
        bookingId: r.booking_id
      };
    });

    res.json({ notifications });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error fetching notifications' });
  }
}

// GET /api/customer/dashboard -- stats + current active booking for this customer
async function getDashboard(req, res) {
  try {
    const customerId = req.user.id;

    const [[customerRow]] = await pool.query(
      'SELECT id, name FROM customers WHERE id = ?',
      [customerId]
    );

    const [[{ totalBookings }]] = await pool.query(
      'SELECT COUNT(*) AS totalBookings FROM bookings WHERE customer_id = ?',
      [customerId]
    );

    const [[{ pendingBookings }]] = await pool.query(
      `SELECT COUNT(*) AS pendingBookings FROM bookings WHERE customer_id = ? AND status = 'pending'`,
      [customerId]
    );

    const [[{ activeDeliveries }]] = await pool.query(
      `SELECT COUNT(*) AS activeDeliveries FROM bookings
       WHERE customer_id = ? AND status IN ('assigned','accepted','picked_up','in_transit')`,
      [customerId]
    );

    const [[{ completedBookings }]] = await pool.query(
      `SELECT COUNT(*) AS completedBookings FROM bookings WHERE customer_id = ? AND status = 'delivered'`,
      [customerId]
    );

    // Most relevant "active" booking: prefer furthest-along in-progress one
    const [currentRows] = await pool.query(
      `SELECT b.*, d.name AS driver_name, d.phone AS driver_phone
       FROM bookings b
       LEFT JOIN drivers d ON b.driver_id = d.id
       WHERE b.customer_id = ? AND b.status IN ('pending','assigned','accepted','picked_up','in_transit')
       ORDER BY FIELD(b.status, 'in_transit','picked_up','accepted','assigned','pending'), b.created_at DESC
       LIMIT 1`,
      [customerId]
    );

    const [recentRows] = await pool.query(
      `SELECT b.*, d.name AS driver_name
       FROM bookings b
       LEFT JOIN drivers d ON b.driver_id = d.id
       WHERE b.customer_id = ?
       ORDER BY b.created_at DESC
       LIMIT 5`,
      [customerId]
    );

    res.json({
      customerName: customerRow ? customerRow.name : '',
      stats: {
        totalBookings,
        pendingBookings,
        activeDeliveries,
        completedBookings
      },
      currentBooking: currentRows[0] || null,
      recentBookings: recentRows
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error fetching customer dashboard' });
  }
}

// GET /api/customer/estimate  -- quick fare preview before booking
async function estimateFare(req, res) {
  try {
    const { vehicle_type, distance_km, goods_weight_kg } = req.body;
    if (!vehicle_type || !distance_km || !goods_weight_kg) {
      return res.status(400).json({ message: 'vehicle_type, distance_km, goods_weight_kg are required' });
    }
    const price = calculateFare(vehicle_type, Number(distance_km), Number(goods_weight_kg));
    res.json({ estimated_price: price });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
}

// POST /api/customer/bookings -- place a new transport request
async function createBooking(req, res) {
  try {
    const customerId = req.user.id;
    const {
      pickup_location,
      delivery_location,
      distance_km,
      pickup_lat,
      pickup_lng,
      delivery_lat,
      delivery_lng,
      vehicle_type,
      goods_description,
      goods_weight_kg
    } = req.body;

    if (!pickup_location || !delivery_location || !vehicle_type || !goods_description || !goods_weight_kg) {
      return res.status(400).json({ message: 'Missing required booking fields' });
    }

    const estimatedPrice = calculateFare(
      vehicle_type,
      Number(distance_km) || 0,
      Number(goods_weight_kg)
    );

    const [result] = await pool.query(
      `INSERT INTO bookings
        (customer_id, pickup_location, delivery_location, distance_km, pickup_lat, pickup_lng, delivery_lat, delivery_lng, vehicle_type, goods_description, goods_weight_kg, estimated_price, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
      [customerId, pickup_location, delivery_location, distance_km || null,
       pickup_lat || null, pickup_lng || null, delivery_lat || null, delivery_lng || null,
       vehicle_type, goods_description, goods_weight_kg, estimatedPrice]
    );

    await pool.query(
      `INSERT INTO booking_status_history (booking_id, status, changed_by) VALUES (?, 'pending', 'customer')`,
      [result.insertId]
    );

    const [rows] = await pool.query('SELECT * FROM bookings WHERE id = ?', [result.insertId]);
    res.status(201).json({ booking: rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error creating booking' });
  }
}

// GET /api/customer/bookings -- all bookings for the logged-in customer
async function getMyBookings(req, res) {
  try {
    const [rows] = await pool.query(
      `SELECT b.*, d.name AS driver_name, d.phone AS driver_phone
       FROM bookings b
       LEFT JOIN drivers d ON b.driver_id = d.id
       WHERE b.customer_id = ?
       ORDER BY b.created_at DESC`,
      [req.user.id]
    );
    res.json({ bookings: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error fetching bookings' });
  }
}

// GET /api/customer/bookings/:id -- single booking detail (must belong to this customer)
async function getBookingById(req, res) {
  try {
    const [rows] = await pool.query(
      `SELECT b.*, d.name AS driver_name, d.phone AS driver_phone
       FROM bookings b
       LEFT JOIN drivers d ON b.driver_id = d.id
       WHERE b.id = ? AND b.customer_id = ?`,
      [req.params.id, req.user.id]
    );
    if (rows.length === 0) return res.status(404).json({ message: 'Booking not found' });
    res.json({ booking: rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error fetching booking' });
  }
}

module.exports = { getDashboard, getProfile, updateProfile, getNotifications, estimateFare, createBooking, getMyBookings, getBookingById };
