const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const DATA_DIR = path.join(__dirname, '..', 'data');

function writeJSON(filename, data) {
  fs.writeFileSync(path.join(DATA_DIR, filename), JSON.stringify(data, null, 2), 'utf8');
}

function interpolatePath(stations, steps = 5) {
  const path = [];
  for (let i = 0; i < stations.length - 1; i++) {
    const s1 = stations[i], s2 = stations[i + 1];
    for (let j = 0; j < steps; j++) {
      const t = j / steps;
      path.push({ lat: s1.lat + (s2.lat - s1.lat) * t, lng: s1.lng + (s2.lng - s1.lng) * t });
    }
  }
  path.push({ lat: stations[stations.length - 1].lat, lng: stations[stations.length - 1].lng });
  return path;
}

async function seed() {
  // نتأكد أولاً إذا فيه بيانات موجودة — لا نمسحها!
  const dataExists = fs.existsSync(path.join(DATA_DIR, 'users.json'))
    && fs.existsSync(path.join(DATA_DIR, 'stations.json'));

  if (dataExists) {
    const usersData = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'users.json'), 'utf8'));
    if (usersData.length > 0) {
      console.log('✅ البيانات موجودة مسبقاً — لم يتم المسح');
      console.log('ℹ️  لو تبي إعادة تعيين كاملة، امسح الملفات من server/data/');
      return;
    }
  }

  console.log('Seeding database...');

  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash('password123', salt);

  // 👇 غيّر البيانات هنا حسب محطاتك وباصاتك
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

  const drivers = [
    { _id: 'driver-1', name: 'أحمد', email: 'driver1@test.com', password: hashedPassword, role: 'driver', phone: '0655000001', isOnline: false, currentLocation: { lat: 33.8870, lng: -5.5460 }, busNumber: 'BUS-20', currentPassengers: 0, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    { _id: 'driver-2', name: 'خالد', email: 'driver2@test.com', password: hashedPassword, role: 'driver', phone: '0655000002', isOnline: false, currentLocation: { lat: 33.8930, lng: -5.5630 }, busNumber: 'BUS-21', currentPassengers: 0, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  ];

  const passengers = [
    { _id: 'pass-1', name: 'محمد', email: 'pass1@test.com', password: hashedPassword, role: 'passenger', phone: '0655000003', isOnline: false, currentLocation: { lat: 0, lng: 0 }, savedLocations: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  ];

  const stations = STATIONS_LIST.map((s, i) => ({
    _id: `station-${i + 1}`,
    name: s.name,
    location: { lat: s.lat, lng: s.lng },
    order: i,
    routeId: 'route-1',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }));

  const stationsPath = STATIONS_LIST.map(s => ({ lat: s.lat, lng: s.lng }));
  const routePath = interpolatePath(stationsPath, 6);

  const routes = [
    {
      _id: 'route-1',
      name: 'المحطة الطرقية → جامعة مكناس',
      description: 'خط الباص رقم 20 من المحطة الطرقية عبر وسط المدينة إلى جامعة مكناس',
      stations: stations.map(s => s._id),
      path: routePath,
      totalDistance: 12000,
      estimatedDuration: 30,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];

  const buses = [
    { _id: 'bus-1', busNumber: 'BUS-20', driverId: 'driver-1', routeId: 'route-1', capacity: 50, currentLocation: { lat: 33.8870, lng: -5.5460 }, currentPassengers: 0, isActive: true, status: 'online', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    { _id: 'bus-2', busNumber: 'BUS-21', driverId: 'driver-2', routeId: 'route-1', capacity: 50, currentLocation: { lat: 33.8930, lng: -5.5630 }, currentPassengers: 0, isActive: false, status: 'offline', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  ];

  const admin = [
    { _id: 'admin-1', name: 'المالك', email: 'admin@owner.com', password: hashedPassword, role: 'admin', phone: '0655000000', isOnline: false, currentLocation: { lat: 33.8935, lng: -5.5473 }, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  ];

  const users = [...admin, ...drivers, ...passengers];

  writeJSON('users.json', users);
  writeJSON('buses.json', buses);
  writeJSON('routes.json', routes);
  writeJSON('stations.json', stations);

  console.log('✅ Seed completed!');
  console.log('');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🚍 الباص 20: المحطة الطرقية → جامعة مكناس');
  console.log('📋 8 محطات (مكناس)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');
  console.log('🧪 Test Accounts:');
  console.log('Admin:     admin@owner.com / password123');
  console.log('Driver:    driver1@test.com / password123');
  console.log('Passenger: pass1@test.com / password123');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━');
}

seed().catch(console.error);
