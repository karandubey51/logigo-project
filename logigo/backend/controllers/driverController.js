const pool = require('../config/db');

// GET /api/driver/profile -- full profile + delivery stats, no password
async function getProfile(req, res) {
  try {
    const driverId = req.user.id;

    const [[driver]] = await pool.query(
      `SELECT id, name, email, phone, license_number, vehicle_type, vehicle_number, status, approval_status, created_at
       FROM drivers WHERE id = ?`,
      [driverId]
    );
    if (!driver) return res.status(404).json({ message: 'Driver not found' });

    const [[{ totalDeliveries }]] = await pool.query(
      'SELECT COUNT(*) AS totalDeliveries FROM bookings WHERE driver_id = ?',
      [driverId]
    );
    const [[{ completedDeliveries }]] = await pool.query(
      `SELECT COUNT(*) AS completedDeliveries FROM bookings WHERE driver_id = ? AND status = 'delivered'`,
      [driverId]
    );
    const [[{ activeDeliveries }]] = await pool.query(
      `SELECT COUNT(*) AS activeDeliveries FROM bookings
       WHERE driver_id = ? AND status IN ('accepted','picked_up','in_transit')`,
      [driverId]
    );
    const [[{ totalEarnings }]] = await pool.query(
      `SELECT COALESCE(SUM(estimated_price), 0) AS totalEarnings FROM bookings
       WHERE driver_id = ? AND status = 'delivered'`,
      [driverId]
    );

    res.json({
      profile: driver,
      stats: { totalDeliveries, completedDeliveries, activeDeliveries, totalEarnings }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error fetching profile' });
  }
}

// PUT /api/driver/profile -- edit name, phone, vehicle_number (not email/password/license here)
async function updateProfile(req, res) {
  try {
    const { name, phone, vehicle_number } = req.body;
    if (!name) return res.status(400).json({ message: 'Name is required' });

    await pool.query(
      'UPDATE drivers SET name = ?, phone = ?, vehicle_number = ? WHERE id = ?',
      [name, phone || null, vehicle_number || null, req.user.id]
    );

    const [[driver]] = await pool.query(
      `SELECT id, name, email, phone, license_number, vehicle_type, vehicle_number, status, approval_status, created_at
       FROM drivers WHERE id = ?`,
      [req.user.id]
    );
    res.json({ message: 'Profile updated successfully', profile: driver });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error updating profile' });
  }
}

const NOTIF_MESSAGES_DRIVER = {
  assigned: { icon: '🚚', text: 'A new delivery has been assigned to you.' },
  accepted: { icon: '✅', text: 'You accepted this delivery.' },
  rejected: { icon: '❌', text: 'You rejected this delivery.' },
  picked_up: { icon: '📦', text: 'You marked this delivery as picked up.' },
  in_transit: { icon: '🛣️', text: 'You marked this delivery as in transit.' },
  delivered: { icon: '🎉', text: 'You completed this delivery.' },
  cancelled: { icon: '🚫', text: 'This delivery was cancelled.' }
};

// GET /api/driver/notifications -- derived from real booking_status_history
async function getNotifications(req, res) {
  try {
    const [rows] = await pool.query(
      `SELECT h.id, h.booking_id, h.status, h.changed_at, b.pickup_location, b.delivery_location
       FROM booking_status_history h
       JOIN bookings b ON h.booking_id = b.id
       WHERE b.driver_id = ?
       ORDER BY h.changed_at DESC
       LIMIT 30`,
      [req.user.id]
    );

    const notifications = rows.map(r => {
      const meta = NOTIF_MESSAGES_DRIVER[r.status] || { icon: '🔔', text: `Status updated to ${r.status}.` };
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

// GET /api/driver/earnings -- real earnings summary + history from delivered bookings
async function getEarnings(req, res) {
  try {
    const driverId = req.user.id;

    const [[{ totalEarnings }]] = await pool.query(
      `SELECT COALESCE(SUM(estimated_price), 0) AS totalEarnings FROM bookings
       WHERE driver_id = ? AND status = 'delivered'`,
      [driverId]
    );
    const [[{ completedDeliveries }]] = await pool.query(
      `SELECT COUNT(*) AS completedDeliveries FROM bookings WHERE driver_id = ? AND status = 'delivered'`,
      [driverId]
    );
    const [[{ thisMonthEarnings }]] = await pool.query(
      `SELECT COALESCE(SUM(estimated_price), 0) AS thisMonthEarnings FROM bookings
       WHERE driver_id = ? AND status = 'delivered'
       AND MONTH(updated_at) = MONTH(CURRENT_DATE()) AND YEAR(updated_at) = YEAR(CURRENT_DATE())`,
      [driverId]
    );

    const [history] = await pool.query(
      `SELECT b.id, b.updated_at, b.estimated_price, b.status, c.name AS customer_name
       FROM bookings b
       JOIN customers c ON b.customer_id = c.id
       WHERE b.driver_id = ? AND b.status = 'delivered'
       ORDER BY b.updated_at DESC`,
      [driverId]
    );

    res.json({
      totalEarnings,
      completedDeliveries,
      thisMonthEarnings,
      history
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error fetching earnings' });
  }
}

// GET /api/driver/dashboard -- stats + current active delivery for this driver
async function getDashboard(req, res) {
  try {
    const driverId = req.user.id;

    const [[driverRow]] = await pool.query(
      'SELECT id, name, email FROM drivers WHERE id = ?',
      [driverId]
    );

    const [[{ activeDeliveries }]] = await pool.query(
      `SELECT COUNT(*) AS activeDeliveries FROM bookings
       WHERE driver_id = ? AND status IN ('accepted','picked_up','in_transit')`,
      [driverId]
    );

    const [[{ pendingDeliveries }]] = await pool.query(
      `SELECT COUNT(*) AS pendingDeliveries FROM bookings
       WHERE driver_id = ? AND status = 'assigned'`,
      [driverId]
    );

    const [[{ completedDeliveries }]] = await pool.query(
      `SELECT COUNT(*) AS completedDeliveries FROM bookings
       WHERE driver_id = ? AND status = 'delivered'`,
      [driverId]
    );

    const [[{ totalEarnings }]] = await pool.query(
      `SELECT COALESCE(SUM(estimated_price), 0) AS totalEarnings FROM bookings
       WHERE driver_id = ? AND status = 'delivered'`,
      [driverId]
    );

    // Most relevant "current" delivery: prefer in-progress over a fresh assignment
    const [currentRows] = await pool.query(
      `SELECT b.*, c.name AS customer_name, c.phone AS customer_phone
       FROM bookings b
       JOIN customers c ON b.customer_id = c.id
       WHERE b.driver_id = ? AND b.status IN ('assigned','accepted','picked_up','in_transit')
       ORDER BY FIELD(b.status, 'in_transit','picked_up','accepted','assigned'), b.created_at DESC
       LIMIT 1`,
      [driverId]
    );

    res.json({
      driverName: driverRow ? driverRow.name : '',
      stats: {
        activeDeliveries,
        pendingDeliveries,
        completedDeliveries,
        totalEarnings
      },
      currentDelivery: currentRows[0] || null
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error fetching driver dashboard' });
  }
}

// GET /api/driver/bookings -- deliveries assigned to this driver
async function getAssignedBookings(req, res) {
  try {
    const [rows] = await pool.query(
      `SELECT b.*, c.name AS customer_name, c.phone AS customer_phone
       FROM bookings b
       JOIN customers c ON b.customer_id = c.id
       WHERE b.driver_id = ?
       ORDER BY b.created_at DESC`,
      [req.user.id]
    );
    res.json({ bookings: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error fetching assigned bookings' });
  }
}

// PATCH /api/driver/bookings/:id/respond -- accept or reject an assignment
async function respondToBooking(req, res) {
  try {
    const { action } = req.body; // 'accept' | 'reject'
    if (!['accept', 'reject'].includes(action)) {
      return res.status(400).json({ message: "action must be 'accept' or 'reject'" });
    }

    const [rows] = await pool.query(
      'SELECT * FROM bookings WHERE id = ? AND driver_id = ?',
      [req.params.id, req.user.id]
    );
    if (rows.length === 0) return res.status(404).json({ message: 'Booking not found' });
    if (rows[0].status !== 'assigned') {
      return res.status(400).json({ message: 'Only bookings in "assigned" status can be responded to' });
    }

    const newStatus = action === 'accept' ? 'accepted' : 'rejected';
    await pool.query('UPDATE bookings SET status = ? WHERE id = ?', [newStatus, req.params.id]);

    // If rejected, free the driver and unassign so admin can reassign
    if (action === 'reject') {
      await pool.query('UPDATE bookings SET driver_id = NULL WHERE id = ?', [req.params.id]);
      await pool.query('UPDATE drivers SET status = "available" WHERE id = ?', [req.user.id]);
    }

    await pool.query(
      `INSERT INTO booking_status_history (booking_id, status, changed_by) VALUES (?, ?, 'driver')`,
      [req.params.id, newStatus]
    );

    res.json({ message: `Booking ${newStatus}` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error responding to booking' });
  }
}

// PATCH /api/driver/bookings/:id/status -- move a booking through the delivery lifecycle
async function updateDeliveryStatus(req, res) {
  try {
    const { status } = req.body;
    const allowed = ['picked_up', 'in_transit', 'delivered'];
    if (!allowed.includes(status)) {
      return res.status(400).json({ message: `status must be one of: ${allowed.join(', ')}` });
    }

    const [rows] = await pool.query(
      'SELECT * FROM bookings WHERE id = ? AND driver_id = ?',
      [req.params.id, req.user.id]
    );
    if (rows.length === 0) return res.status(404).json({ message: 'Booking not found' });

    // Enforce a sane forward-only sequence
    const sequence = ['accepted', 'picked_up', 'in_transit', 'delivered'];
    const currentIdx = sequence.indexOf(rows[0].status);
    const nextIdx = sequence.indexOf(status);
    if (nextIdx === -1 || nextIdx !== currentIdx + 1) {
      return res.status(400).json({ message: `Cannot move from '${rows[0].status}' to '${status}'` });
    }

    await pool.query('UPDATE bookings SET status = ? WHERE id = ?', [status, req.params.id]);

    if (status === 'delivered') {
      await pool.query('UPDATE drivers SET status = "available" WHERE id = ?', [req.user.id]);
    }

    await pool.query(
      `INSERT INTO booking_status_history (booking_id, status, changed_by) VALUES (?, ?, 'driver')`,
      [req.params.id, status]
    );

    res.json({ message: `Status updated to ${status}` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error updating status' });
  }
}

module.exports = { getDashboard, getProfile, updateProfile, getNotifications, getEarnings, getAssignedBookings, respondToBooking, updateDeliveryStatus };
