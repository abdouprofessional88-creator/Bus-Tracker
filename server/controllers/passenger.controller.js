const {
  findUser, findBuses, findRoutes, findStations,
} = require('../models');
const {
  findNearestStation,
  estimateArrivalTime,
  findBestBusForPassenger,
  calculateDistance,
} = require('../services/distance');

async function getNearbyBuses(req, res) {
  try {
    const { lat, lng, radius = 5000 } = req.query;
    if (!lat || !lng) {
      return res.status(400).json({ message: 'Latitude and longitude are required' });
    }

    const userLocation = { lat: parseFloat(lat), lng: parseFloat(lng) };
    const allBuses = await findBuses({ isActive: true });

    const nearbyBuses = allBuses
      .filter(bus => {
        if (!bus.currentLocation) return false;
        const dist = calculateDistance(userLocation, bus.currentLocation);
        return dist <= parseFloat(radius);
      })
      .map(bus => ({
        _id: bus._id,
        busNumber: bus.busNumber,
        currentLocation: bus.currentLocation,
        currentPassengers: bus.currentPassengers,
        distance: Math.round(calculateDistance(userLocation, bus.currentLocation)),
        status: bus.status,
      }))
      .sort((a, b) => a.distance - b.distance);

    res.json({ buses: nearbyBuses, count: nearbyBuses.length });
  } catch (error) {
    console.error('Get nearby buses error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
}

async function getNearestStation(req, res) {
  try {
    const { lat, lng } = req.query;
    if (!lat || !lng) {
      return res.status(400).json({ message: 'Latitude and longitude are required' });
    }

    const userLocation = { lat: parseFloat(lat), lng: parseFloat(lng) };
    const stations = await findStations();
    const nearest = findNearestStation(userLocation, stations);

    if (!nearest) {
      return res.status(404).json({ message: 'No stations found' });
    }

    res.json({
      station: nearest.station,
      distance: Math.round(nearest.distance),
      distanceText: nearest.distance < 1000
        ? `${Math.round(nearest.distance)} متر`
        : `${(nearest.distance / 1000).toFixed(1)} كم`,
    });
  } catch (error) {
    console.error('Get nearest station error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
}

async function getRouteSuggestions(req, res) {
  try {
    const { originLat, originLng, destLat, destLng } = req.query;
    if (!originLat || !originLng || !destLat || !destLng) {
      return res.status(400).json({ message: 'Origin and destination coordinates are required' });
    }

    const origin = { lat: parseFloat(originLat), lng: parseFloat(originLng) };
    const destination = { lat: parseFloat(destLat), lng: parseFloat(destLng) };

    const routes = await findRoutes({ isActive: true });
    const buses = await findBuses({ isActive: true });

    const suggestions = [];

    for (const route of routes) {
      if (!route.path || route.path.length < 2) continue;

      const activeBusesOnRoute = buses.filter(b => {
        return b.status === 'online' || b.status === 'on_trip';
      });

      const bestBus = await findBestBusForPassenger(origin, destination, activeBusesOnRoute, route);

      if (bestBus) {
        suggestions.push({
          route: {
            _id: route._id,
            name: route.name,
            description: route.description,
            path: route.path,
            stations: route.stations || [],
          },
          bus: bestBus.bus,
          eta: {
            minutes: bestBus.etaMinutes,
            text: bestBus.etaText,
          },
          distance: bestBus.distance,
        });
      }
    }

    suggestions.sort((a, b) => a.eta.minutes - b.eta.minutes);

    res.json({
      suggestions,
      origin,
      destination,
      count: suggestions.length,
    });
  } catch (error) {
    console.error('Get route suggestions error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
}

async function getAllRoutes(req, res) {
  try {
    const routes = await findRoutes({ isActive: true });
    const stations = await findStations();

    const routesWithStations = routes.map(route => {
      const routeStations = stations.filter(s => {
        if (typeof s.routeId === 'string') return s.routeId === route._id;
        if (s.routeId && typeof s.routeId === 'object') return String(s.routeId) === String(route._id);
        return false;
      }).sort((a, b) => a.order - b.order);

      return { ...route, stationDetails: routeStations };
    });

    res.json({ routes: routesWithStations });
  } catch (error) {
    console.error('Get all routes error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
}

async function trackBus(req, res) {
  try {
    const { busId } = req.params;
    const bus = await findBuses({ _id: busId, isActive: true });

    if (!bus || bus.length === 0) {
      return res.status(404).json({ message: 'Bus not found' });
    }

    res.json({ bus: bus[0] });
  } catch (error) {
    console.error('Track bus error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
}

module.exports = { getNearbyBuses, getNearestStation, getRouteSuggestions, getAllRoutes, trackBus };
