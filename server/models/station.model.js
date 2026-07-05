const mongoose = require('mongoose');

const stationSchema = new mongoose.Schema({
  name: { type: String, required: true },
  location: {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
  },
  order: { type: Number, default: 0 },
  routeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Route' },
}, { timestamps: true });

module.exports = mongoose.model('Station', stationSchema);
