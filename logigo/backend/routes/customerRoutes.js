const express = require('express');
const router = express.Router();
const { verifyToken, requireRole } = require('../middleware/auth');
const {
  getDashboard,
  getProfile,
  updateProfile,
  getNotifications,
  estimateFare,
  createBooking,
  getMyBookings,
  getBookingById
} = require('../controllers/customerController');
const { changePassword } = require('../controllers/authController');

router.use(verifyToken, requireRole('customer'));

router.get('/dashboard', getDashboard);
router.get('/profile', getProfile);
router.put('/profile', updateProfile);
router.put('/change-password', changePassword);
router.get('/notifications', getNotifications);
router.post('/estimate', estimateFare);
router.post('/bookings', createBooking);
router.get('/bookings', getMyBookings);
router.get('/bookings/:id', getBookingById);

module.exports = router;
