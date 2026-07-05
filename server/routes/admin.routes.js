const express = require('express');
const router = express.Router();
const {
  getAllStations, addStation, deleteStation, updateStation,
  getAllRoutes, createNewRoute, deleteRoute,
  getAllBuses, getAllDrivers, createNewBus, quickSetup,
} = require('../controllers/admin.controller');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate, authorize('admin'));

router.get('/stations', getAllStations);
router.post('/stations', addStation);
router.delete('/stations/:id', deleteStation);
router.put('/stations/:id', updateStation);

router.get('/routes', getAllRoutes);
router.post('/routes', createNewRoute);
router.delete('/routes/:id', deleteRoute);

router.get('/buses', getAllBuses);
router.post('/buses', createNewBus);
router.get('/drivers', getAllDrivers);

router.post('/quick-setup', quickSetup);

module.exports = router;
