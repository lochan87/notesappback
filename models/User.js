const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  isAuthenticated: {
    type: Boolean,
    default: false
  },
  sessionId: {
    type: String,
    unique: true,
    sparse: true
  },
  lastLogin: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('User', userSchema);
