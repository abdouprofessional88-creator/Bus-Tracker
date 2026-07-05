const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['driver', 'passenger'], required: true },
  phone: { type: String, default: '' },
  isOnline: { type: Boolean, default: false },
  currentLocation: {
    lat: { type: Number, default: 0 },
    lng: { type: Number, default: 0 },
  },
  busNumber: { type: String, default: '' },
  currentPassengers: { type: Number, default: 0 },
  savedLocations: [{
    name: String,
    lat: Number,
    lng: Number,
  }],
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
