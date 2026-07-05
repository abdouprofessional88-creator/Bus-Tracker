const express = require('express');
const router = express.Router();
const {
  getNearbyBuses, getNearestStation, getRouteSuggestions,
  getAllRoutes, trackBus,
} = require('../controllers/passenger.controller');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate, authorize('passenger'));

router.get('/nearby-buses', getNearbyBuses);
router.get('/nearest-station', getNearestStation);
router.get('/route-suggestions', getRouteSuggestions);
router.get('/routes', getAllRoutes);
router.get('/track-bus/:busId', trackBus);

module.exports = router;
