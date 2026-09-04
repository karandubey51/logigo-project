const express = require('express');
const router = express.Router();
const { verifyToken, requireRole } = require('../middleware/auth');
const {
  getDashboard,
  getProfile,
  updateProfile,
  getNotifications,
  getEarnings,
  getAssignedBookings,
  respondToBooking,
  updateDeliveryStatus
} = require('../controllers/driverController');
const { changePassword } = require('../controllers/authController');

router.use(verifyToken, requireRole('driver'));

router.get('/dashboard', getDashboard);
router.get('/profile', getProfile);
router.put('/profile', updateProfile);
router.put('/change-password', changePassword);
router.get('/notifications', getNotifications);
router.get('/earnings', getEarnings);
router.get('/bookings', getAssignedBookings);
router.patch('/bookings/:id/respond', respondToBooking);
router.patch('/bookings/:id/status', updateDeliveryStatus);

module.exports = router;
