const { findUser, updateUser, findBus, createBus, updateBus, findBuses, findRoutes, findStations } = require('../models');

async function getDashboard(req, res) {
  try {
    const driverId = req.userId;
    const driver = await findUser({ _id: driverId });
    if (!driver) {
      return res.status(404).json({ message: 'Driver not found' });
    }

    let bus = await findBus({ driverId });
    let route = null;
    let stations = [];
    if (bus && bus.routeId) {
      route = await findRoutes({ _id: bus.routeId });
      route = route.length > 0 ? route[0] : null;
      if (route) {
        const allStations = await findStations();
        stations = allStations.filter(s => route.stations.includes(s._id))
          .sort((a, b) => a.order - b.order);
      }
    }

    res.json({
      driver: {
        name: driver.name,
        email: driver.email,
        isOnline: driver.isOnline,
        busNumber: driver.busNumber || (bus ? bus.busNumber : ''),
        currentLocation: driver.currentLocation,
        currentPassengers: driver.currentPassengers,
      },
      bus: bus || null,
      route,
      stations,
    });
  } catch (error) {
    console.error('Driver dashboard error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
}

async function toggleOnlineStatus(req, res) {
  try {
    const driverId = req.userId;
    const { isOnline } = req.body;

    const driver = await findUser({ _id: driverId });
    if (!driver) {
      return res.status(404).json({ message: 'Driver not found' });
    }

    await updateUser({ _id: driverId }, { $set: { isOnline } });

    let bus = await findBus({ driverId });
    if (bus) {
      await updateBus({ _id: bus._id }, { $set: { isActive: isOnline, status: isOnline ? 'online' : 'offline' } });
    } else if (isOnline && driver.busNumber) {
      bus = await createBus({
        busNumber: driver.busNumber,
        driverId,
        isActive: true,
        status: 'online',
        currentLocation: driver.currentLocation,
      });
    }

    const routes = await findRoutes({ isActive: true });

    res.json({
      message: isOnline ? 'You are now online' : 'You are now offline',
      isOnline,
      bus: bus || null,
      routes,
    });
  } catch (error) {
    console.error('Toggle status error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
}

async function updateLocation(req, res) {
  try {
    const driverId = req.userId;
    const { lat, lng } = req.body;

    if (!lat || !lng) {
      return res.status(400).json({ message: 'Latitude and longitude are required' });
    }

    await updateUser({ _id: driverId }, { $set: { currentLocation: { lat, lng } } });

    let bus = await findBus({ driverId });
    if (bus) {
      await updateBus({ _id: bus._id }, { $set: { currentLocation: { lat, lng } } });
    }

    const io = req.app.get('io');
    if (io) {
      io.to(`bus-${bus ? bus._id : driverId}`).emit('bus-location-update', {
        busId: bus ? bus._id : driverId,
        driverId,
        lat,
        lng,
        timestamp: new Date().toISOString(),
      });

      io.emit('bus-location-broadcast', {
        busId: bus ? bus._id : driverId,
        driverId,
        busNumber: bus ? bus.busNumber : '',
        lat,
        lng,
        timestamp: new Date().toISOString(),
      });
    }

    res.json({ message: 'Location updated', lat, lng });
  } catch (error) {
    console.error('Update location error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
}

async function updatePassengerCount(req, res) {
  try {
    const driverId = req.userId;
    const { count } = req.body;

    if (count === undefined || count < 0) {
      return res.status(400).json({ message: 'Valid passenger count is required' });
    }

    await updateUser({ _id: driverId }, { $set: { currentPassengers: count } });

    let bus = await findBus({ driverId });
    if (bus) {
      await updateBus({ _id: bus._id }, { $set: { currentPassengers: count } });
    }

    res.json({ message: 'Passenger count updated', currentPassengers: count });
  } catch (error) {
    console.error('Update passenger count error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
}

async function getRoutes(req, res) {
  try {
    const routes = await findRoutes({ isActive: true });
    res.json({ routes });
  } catch (error) {
    console.error('Get routes error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
}

module.exports = { getDashboard, toggleOnlineStatus, updateLocation, updatePassengerCount, getRoutes };
