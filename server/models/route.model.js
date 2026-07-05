const mongoose = require('mongoose');

const routeSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String, default: '' },
  stations: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Station' }],
  path: [{
    lat: Number,
    lng: Number,
  }],
  totalDistance: { type: Number, default: 0 },
  estimatedDuration: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

module.exports = mongoose.model('Route', routeSchema);
