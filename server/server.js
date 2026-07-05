require('dotenv').config();
const express = require('express');
const http = require('http');
const path = require('path');
const cors = require('cors');
const { Server } = require('socket.io');
const connectDB = require('./config/db');
const { initModels } = require('./models');

const authRoutes = require('./routes/auth.routes');
const driverRoutes = require('./routes/driver.routes');
const passengerRoutes = require('./routes/passenger.routes');
const adminRoutes = require('./routes/admin.routes');

const app = express();
const server = http.createServer(app);

const isProduction = process.env.NODE_ENV === 'production';

const io = new Server(server, {
  cors: {
    origin: isProduction ? true : ['http://localhost:5173', 'http://localhost:4173', 'http://127.0.0.1:5173'],
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

app.use(cors({
  origin: isProduction ? true : ['http://localhost:5173', 'http://localhost:4173', 'http://127.0.0.1:5173'],
  credentials: true,
}));
app.use(express.json());

app.set('io', io);
app.set('socketIo', io);

app.use('/api/auth', authRoutes);
app.use('/api/driver', driverRoutes);
app.use('/api/passenger', passengerRoutes);
app.use('/api/admin', adminRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api/config', (req, res) => {
  res.json({
    useJsonDb: process.env.USE_JSON_DB === 'true',
    port: process.env.PORT || 5000,
  });
});

// Serve static files in production (only if client build exists)
if (isProduction) {
  const clientBuild = path.join(__dirname, '..', 'client', 'dist');
  const fs = require('fs');
  if (fs.existsSync(clientBuild)) {
    app.use(express.static(clientBuild));
    app.get('*', (req, res) => {
      res.sendFile(path.join(clientBuild, 'index.html'));
    });
  }
}

const driverSockets = new Map();
const passengerSockets = new Map();

io.on('connection', (socket) => {
  console.log(`Client connected: ${socket.id}`);

  socket.on('register-driver', (data) => {
    const { userId, driverId } = data;
    const id = userId || driverId;
    if (id) {
      driverSockets.set(id, socket.id);
      socket.join(`driver-${id}`);
      console.log(`Driver registered: ${id} (socket: ${socket.id})`);
    }
  });

  socket.on('register-passenger', (data) => {
    const { userId, passengerId } = data;
    const id = userId || passengerId;
    if (id) {
      passengerSockets.set(id, socket.id);
      socket.join(`passenger-${id}`);
      console.log(`Passenger registered: ${id} (socket: ${socket.id})`);
    }
  });

  socket.on('track-bus', (data) => {
    const { busId } = data;
    if (busId) {
      socket.join(`bus-${busId}`);
      console.log(`Socket ${socket.id} tracking bus ${busId}`);
    }
  });

  socket.on('untrack-bus', (data) => {
    const { busId } = data;
    if (busId) {
      socket.leave(`bus-${busId}`);
    }
  });

  socket.on('driver-update-location', (data) => {
    const { driverId, lat, lng, busId, busNumber } = data;

    io.emit('bus-location-broadcast', {
      busId,
      driverId,
      busNumber,
      lat,
      lng,
      timestamp: new Date().toISOString(),
    });

    if (busId) {
      io.to(`bus-${busId}`).emit('bus-location-update', {
        busId,
        driverId,
        lat,
        lng,
        timestamp: new Date().toISOString(),
      });
    }
  });

  socket.on('disconnect', () => {
    console.log(`Client disconnected: ${socket.id}`);

    for (const [driverId, sockId] of driverSockets.entries()) {
      if (sockId === socket.id) {
        driverSockets.delete(driverId);
        break;
      }
    }
    for (const [passengerId, sockId] of passengerSockets.entries()) {
      if (sockId === socket.id) {
        passengerSockets.delete(passengerId);
        break;
      }
    }
  });
});

const PORT = process.env.PORT || 5000;

async function startServer() {
  let mongoConnected = false;

  if (process.env.USE_JSON_DB !== 'true') {
    mongoConnected = await connectDB();
  } else {
    console.log('Using JSON file-based storage');
  }

  initModels(mongoConnected);

  if (process.env.USE_JSON_DB === 'true') {
    const fs = require('fs');
    const seedPath = path.join(__dirname, 'data', 'users.json');
    const seedContent = fs.readFileSync(seedPath, 'utf8');
    if (seedContent === '[]') {
      require('./config/seed');
    } else {
      console.log('Data already seeded, skipping...');
    }
  }

  server.listen(PORT, () => {
    console.log(`\n🚍 Bus Tracking Server running on port ${PORT}`);
    console.log(`📡 WebSocket server ready`);
    console.log(`🌐 API: http://localhost:${PORT}/api`);
    console.log(`💚 Health: http://localhost:${PORT}/api/health`);
    console.log(`📝 Auth: http://localhost:${PORT}/api/auth`);
    console.log(`🚌 Driver: http://localhost:${PORT}/api/driver`);
    console.log(`🧑 Passenger: http://localhost:${PORT}/api/passenger`);
    console.log('');
  });
}

startServer().catch(console.error);
