const pool = require('../config/db');

// GET /api/admin/dashboard -- summary counts
async function getDashboard(req, res) {
  try {
    const [[{ totalCustomers }]] = await pool.query('SELECT COUNT(*) AS totalCustomers FROM customers');
    const [[{ totalDrivers }]] = await pool.query(
      `SELECT COUNT(*) AS totalDrivers FROM drivers WHERE approval_status = 'approved'`
    );
    const [[{ pendingDrivers }]] = await pool.query(
      `SELECT COUNT(*) AS pendingDrivers FROM drivers WHERE approval_status = 'pending'`
    );
    const [[{ totalBookings }]] = await pool.query('SELECT COUNT(*) AS totalBookings FROM bookings');
    const [[{ pendingBookings }]] = await pool.query(
      `SELECT COUNT(*) AS pendingBookings FROM bookings WHERE status = 'pending'`
    );
    const [[{ activeDeliveries }]] = await pool.query(
      `SELECT COUNT(*) AS activeDeliveries FROM bookings WHERE status IN ('assigned','accepted','picked_up','in_transit')`
    );
    const [[{ deliveredBookings }]] = await pool.query(
      `SELECT COUNT(*) AS deliveredBookings FROM bookings WHERE status = 'delivered'`
    );

    res.json({
      totalCustomers,
      totalDrivers,
      pendingDrivers,
      totalBookings,
      pendingBookings,
      activeDeliveries,
      deliveredBookings
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error fetching dashboard' });
  }
}

async function getCustomers(req, res) {
  try {
    const [rows] = await pool.query(
      'SELECT id, name, email, phone, address, created_at FROM customers ORDER BY created_at DESC'
    );
    res.json({ customers: rows });
  } catch (err) {
    res.status(500).json({ message: 'Server error fetching customers' });
  }
}

// DELETE /api/admin/customers/:id -- also deletes their bookings (ON DELETE CASCADE)
async function deleteCustomer(req, res) {
  try {
    const [rows] = await pool.query('SELECT id FROM customers WHERE id = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ message: 'Customer not found' });

    await pool.query('DELETE FROM customers WHERE id = ?', [req.params.id]);
    res.json({ message: 'Customer deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error deleting customer' });
  }
}

async function getDrivers(req, res) {
  try {
    const [rows] = await pool.query(
      'SELECT id, name, email, phone, license_number, vehicle_type, vehicle_number, status, approval_status, created_at FROM drivers ORDER BY created_at DESC'
    );
    res.json({ drivers: rows });
  } catch (err) {
    res.status(500).json({ message: 'Server error fetching drivers' });
  }
}

// GET /api/admin/drivers/pending -- drivers waiting for approval
async function getPendingDrivers(req, res) {
  try {
    const [rows] = await pool.query(
      `SELECT id, name, email, phone, license_number, vehicle_type, vehicle_number, created_at
       FROM drivers WHERE approval_status = 'pending' ORDER BY created_at DESC`
    );
    res.json({ drivers: rows });
  } catch (err) {
    res.status(500).json({ message: 'Server error fetching pending drivers' });
  }
}

// PATCH /api/admin/drivers/:id/approve -- approve or reject a driver
async function approveDriver(req, res) {
  try {
    const { decision } = req.body; // 'approved' or 'rejected'
    if (!['approved', 'rejected'].includes(decision)) {
      return res.status(400).json({ message: "decision must be 'approved' or 'rejected'" });
    }

    const [rows] = await pool.query('SELECT id FROM drivers WHERE id = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ message: 'Driver not found' });

    await pool.query('UPDATE drivers SET approval_status = ? WHERE id = ?', [decision, req.params.id]);
    res.json({ message: `Driver ${decision} successfully` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error updating driver approval' });
  }
}

async function getAllBookings(req, res) {
  try {
    const [rows] = await pool.query(
      `SELECT b.*, c.name AS customer_name, d.name AS driver_name
       FROM bookings b
       JOIN customers c ON b.customer_id = c.id
       LEFT JOIN drivers d ON b.driver_id = d.id
       ORDER BY b.created_at DESC`
    );
    res.json({ bookings: rows });
  } catch (err) {
    res.status(500).json({ message: 'Server error fetching bookings' });
  }
}

// PATCH /api/admin/bookings/:id/assign -- assign an available driver to a booking
async function assignDriver(req, res) {
  try {
    const { driver_id } = req.body;
    if (!driver_id) return res.status(400).json({ message: 'driver_id is required' });

    const [bookingRows] = await pool.query('SELECT * FROM bookings WHERE id = ?', [req.params.id]);
    if (bookingRows.length === 0) return res.status(404).json({ message: 'Booking not found' });

    const [driverRows] = await pool.query(
      `SELECT * FROM drivers WHERE id = ? AND status = 'available'`,
      [driver_id]
    );
    if (driverRows.length === 0) {
      return res.status(400).json({ message: 'Driver not found or not available' });
    }

    await pool.query('UPDATE bookings SET driver_id = ?, status = "assigned" WHERE id = ?', [
      driver_id,
      req.params.id
    ]);
    await pool.query('UPDATE drivers SET status = "busy" WHERE id = ?', [driver_id]);

    await pool.query(
      `INSERT INTO booking_status_history (booking_id, status, changed_by) VALUES (?, 'assigned', 'admin')`,
      [req.params.id]
    );

    res.json({ message: 'Driver assigned successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error assigning driver' });
  }
}

// PATCH /api/admin/bookings/:id/status -- admin override of booking status
async function changeBookingStatus(req, res) {
  try {
    const { status } = req.body;
    const allowed = [
      'pending', 'assigned', 'accepted', 'rejected',
      'picked_up', 'in_transit', 'delivered', 'cancelled'
    ];
    if (!allowed.includes(status)) {
      return res.status(400).json({ message: 'Invalid status value' });
    }

    const [rows] = await pool.query('SELECT * FROM bookings WHERE id = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ message: 'Booking not found' });

    await pool.query('UPDATE bookings SET status = ? WHERE id = ?', [status, req.params.id]);
    await pool.query(
      `INSERT INTO booking_status_history (booking_id, status, changed_by) VALUES (?, ?, 'admin')`,
      [req.params.id, status]
    );

    res.json({ message: `Booking status changed to ${status}` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error changing booking status' });
  }
}

module.exports = {
  getDashboard,
  getCustomers,
  deleteCustomer,
  getDrivers,
  getPendingDrivers,
  approveDriver,
  getAllBookings,
  assignDriver,
  changeBookingStatus
};
