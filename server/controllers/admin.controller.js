const {
  findStations, createStation, findRoutes, createRoute,
  findBuses, createBus, findUsers,
} = require('../models');

const STATIONS_LIST = [
  { name: 'المحطة الطرقية', lat: 33.8870, lng: -5.5460 },
  { name: 'ساحة لهديم', lat: 33.8930, lng: -5.5630 },
  { name: 'باب المنصور', lat: 33.8932, lng: -5.5645 },
  { name: 'حي حمرية', lat: 33.9010, lng: -5.5560 },
  { name: 'طريق الخميسات', lat: 33.9100, lng: -5.5480 },
  { name: 'حي الروا', lat: 33.9180, lng: -5.5400 },
  { name: 'حي تولال', lat: 33.9260, lng: -5.5330 },
  { name: 'جامعة مكناس', lat: 33.8970, lng: -5.5350 },
];

const BUS_NAMES = ['BUS-20', 'BUS-21', 'BUS-22'];

function interpolatePath(stations, steps = 5) {
  const path = [];
  for (let i = 0; i < stations.length - 1; i++) {
    const s1 = stations[i], s2 = stations[i + 1];
    for (let j = 0; j < steps; j++) {
      const t = j / steps;
      path.push({
        lat: s1.lat + (s2.lat - s1.lat) * t,
        lng: s1.lng + (s2.lng - s1.lng) * t,
      });
    }
  }
  path.push({ lat: stations[stations.length - 1].lat, lng: stations[stations.length - 1].lng });
  return path;
}

async function getAllStations(req, res) {
  try {
    const stations = await findStations();
    res.json({ stations });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}

async function addStation(req, res) {
  try {
    const { name, lat, lng, routeId, order } = req.body;
    if (!name || !lat || !lng) {
      return res.status(400).json({ message: 'Name, lat, and lng are required' });
    }
    const station = await createStation({
      name,
      location: { lat: parseFloat(lat), lng: parseFloat(lng) },
      order: order || 0,
      routeId: routeId || null,
    });
    res.status(201).json({ message: 'Station created', station });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}

async function deleteStation(req, res) {
  try {
    const { id } = req.params;
    const { getCollection } = require('../services/jsonDb');
    const col = getCollection('stations');
    await col.deleteOne({ _id: id });
    res.json({ message: 'Station deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}

async function updateStation(req, res) {
  try {
    const { id } = req.params;
    const { name, lat, lng } = req.body;
    const { getCollection } = require('../services/jsonDb');
    const col = getCollection('stations');
    const updates = {};
    if (name !== undefined) updates.name = name;
    if (lat !== undefined && lng !== undefined) updates.location = { lat: parseFloat(lat), lng: parseFloat(lng) };
    updates.updatedAt = new Date().toISOString();
    await col.updateOne({ _id: id }, { $set: updates });
    const updated = await col.findOne({ _id: id });
    res.json({ message: 'Station updated', station: updated });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}

async function getAllRoutes(req, res) {
  try {
    const routes = await findRoutes();
    const stations = await findStations();
    const routesWithStations = routes.map(route => {
      const routeStations = stations.filter(s => {
        const id = s.routeId;
        if (typeof id === 'string') return id === route._id;
        if (id && typeof id === 'object') return String(id) === String(route._id);
        return false;
      }).sort((a, b) => a.order - b.order);
      return { ...route, stationDetails: routeStations };
    });
    res.json({ routes: routesWithStations });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}

async function createNewRoute(req, res) {
  try {
    const { name, description, stationIds } = req.body;
    if (!name || !stationIds || !Array.isArray(stationIds) || stationIds.length < 2) {
      return res.status(400).json({ message: 'Name and at least 2 station IDs are required' });
    }

    const stations = await findStations();
    const orderedStations = stationIds.map((id, idx) => {
      const s = stations.find(st => st._id === id);
      return s ? { ...s.location, order: idx } : null;
    }).filter(Boolean);

    if (orderedStations.length < 2) {
      return res.status(400).json({ message: 'Could not find valid stations' });
    }

    const path = interpolatePath(orderedStations, 4);
    let totalDistance = 0;
    for (let i = 0; i < path.length - 1; i++) {
      const { haversineDistance } = require('../services/distance');
      totalDistance += haversineDistance(path[i], path[i + 1]);
    }

    const route = await createRoute({
      name,
      description: description || '',
      stations: stationIds,
      path,
      totalDistance: Math.round(totalDistance),
      estimatedDuration: Math.round(totalDistance / 1000 / 30 * 60),
      isActive: true,
    });

    for (let i = 0; i < stationIds.length; i++) {
      const { getCollection } = require('../services/jsonDb');
      const col = getCollection('stations');
      await col.updateOne({ _id: stationIds[i] }, { $set: { routeId: route._id, order: i } });
    }

    res.status(201).json({ message: 'Route created', route });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}

async function deleteRoute(req, res) {
  try {
    const { id } = req.params;
    const { getCollection } = require('../services/jsonDb');
    const col = getCollection('routes');
    await col.deleteOne({ _id: id });
    res.json({ message: 'Route deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}

async function getAllBuses(req, res) {
  try {
    const buses = await findBuses();
    const drivers = await findUsers({ role: 'driver' });
    const routes = await findRoutes();
    const enriched = buses.map(b => ({
      ...b,
      driverName: drivers.find(d => {
        const did = typeof d._id === 'string' ? d._id : String(d._id);
        const bid = typeof b.driverId === 'string' ? b.driverId : String(b.driverId);
        return did === bid;
      })?.name || '',
      routeName: routes.find(r => {
        const rid = typeof r._id === 'string' ? r._id : String(r._id);
        const brid = typeof b.routeId === 'string' ? b.routeId : String(b.routeId);
        return rid === brid;
      })?.name || '',
    }));
    res.json({ buses: enriched });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}

async function getAllDrivers(req, res) {
  try {
    const drivers = await findUsers({ role: 'driver' });
    res.json({ drivers });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}

async function createNewBus(req, res) {
  try {
    const { busNumber, routeId, driverId, capacity } = req.body;
    if (!busNumber) {
      return res.status(400).json({ message: 'Bus number is required' });
    }
    const bus = await createBus({
      busNumber,
      routeId: routeId || null,
      driverId: driverId || null,
      capacity: capacity || 50,
      currentLocation: { lat: 0, lng: 0 },
      currentPassengers: 0,
      isActive: true,
      status: 'online',
    });
    res.status(201).json({ message: 'Bus created', bus });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}

async function quickSetup(req, res) {
  try {
    const { getCollection } = require('../services/jsonDb');
    const usersCol = getCollection('users');
    const stationsCol = getCollection('stations');
    const routesCol = getCollection('routes');
    const busesCol = getCollection('buses');

    const existing = await stationsCol.find({});
    if (existing.length > 0) {
      return res.json({ message: 'Data already exists', count: existing.length });
    }

    const stations = STATIONS_LIST.map((s, i) => ({
      _id: require('uuid').v4(),
      name: s.name,
      location: { lat: s.lat, lng: s.lng },
      order: i,
      routeId: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }));

    for (const s of stations) await stationsCol.insertOne(s);

    const stationIds = stations.map(s => s._id);
    const path = interpolatePath(STATIONS_LIST, 5);
    let totalDistance = 0;
    for (let i = 0; i < path.length - 1; i++) {
      const { haversineDistance } = require('../services/distance');
      totalDistance += haversineDistance(path[i], path[i + 1]);
    }

    const route = await routesCol.insertOne({
      name: 'المحطة الطرقية → جامعة مكناس',
      description: 'خط الباص رقم 20 من المحطة الطرقية إلى جامعة مكناس',
      stations: stationIds,
      path,
      totalDistance: Math.round(totalDistance),
      estimatedDuration: Math.round(totalDistance / 1000 / 30 * 60),
      isActive: true,
    });

    for (const s of stations) {
      await stationsCol.updateOne({ _id: s._id }, { $set: { routeId: route._id } });
    }

    const driver = await usersCol.findOne({ role: 'driver' });
    const bus20 = await createBus({
      busNumber: 'BUS-20',
      routeId: route._id,
      driverId: driver ? driver._id : null,
      capacity: 50,
      currentLocation: { lat: STATIONS_LIST[0].lat, lng: STATIONS_LIST[0].lng },
      currentPassengers: 0,
      isActive: true,
      status: 'online',
    });

    res.status(201).json({
      message: 'Quick setup complete!',
      stations: stations.length,
      route: route.name,
      bus: bus20.busNumber,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}

module.exports = {
  getAllStations, addStation, deleteStation, updateStation,
  getAllRoutes, createNewRoute, deleteRoute,
  getAllBuses, getAllDrivers, createNewBus, quickSetup,
};
