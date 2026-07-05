const mongoose = require('mongoose');

const busSchema = new mongoose.Schema({
  busNumber: { type: String, required: true, unique: true },
  driverId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  routeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Route' },
  capacity: { type: Number, default: 50 },
  currentLocation: {
    lat: { type: Number, default: 0 },
    lng: { type: Number, default: 0 },
  },
  currentPassengers: { type: Number, default: 0 },
  isActive: { type: Boolean, default: false },
  status: { type: String, enum: ['offline', 'online', 'on_trip'], default: 'offline' },
}, { timestamps: true });

module.exports = mongoose.model('Bus', busSchema);
