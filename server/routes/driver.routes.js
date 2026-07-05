const express = require('express');
const router = express.Router();
const {
  getDashboard, toggleOnlineStatus, updateLocation,
  updatePassengerCount, getRoutes,
} = require('../controllers/driver.controller');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate, authorize('driver'));

router.get('/dashboard', getDashboard);
router.post('/toggle-status', toggleOnlineStatus);
router.post('/location', updateLocation);
router.post('/passenger-count', updatePassengerCount);
router.get('/routes', getRoutes);

module.exports = router;
