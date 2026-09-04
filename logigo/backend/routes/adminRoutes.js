const express = require('express');
const router = express.Router();
const { verifyToken, requireRole } = require('../middleware/auth');
const {
  getDashboard,
  getCustomers,
  deleteCustomer,
  getDrivers,
  getPendingDrivers,
  approveDriver,
  getAllBookings,
  assignDriver,
  changeBookingStatus
} = require('../controllers/adminController');

router.use(verifyToken, requireRole('admin'));

router.get('/dashboard', getDashboard);
router.get('/customers', getCustomers);
router.delete('/customers/:id', deleteCustomer);
router.get('/drivers', getDrivers);
router.get('/drivers/pending', getPendingDrivers);
router.patch('/drivers/:id/approve', approveDriver);
router.get('/bookings', getAllBookings);
router.patch('/bookings/:id/assign', assignDriver);
router.patch('/bookings/:id/status', changeBookingStatus);

module.exports = router;
