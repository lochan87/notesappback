const mongoose = require('mongoose');

const folderSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxLength: 100
  },
  description: {
    type: String,
    maxLength: 500,
    default: ''
  },
  color: {
    type: String,
    default: '#007bff' // Bootstrap primary color
  },
  notesCount: {
    type: Number,
    default: 0
  },
  customCreatedDates: [{
    date: { type: Date, default: Date.now },
    modifiedAt: { type: Date, default: Date.now }
  }]
}, {
  timestamps: true
});

// Virtual field for main created date (last item in customCreatedDates array)
folderSchema.virtual('mainCreatedAt').get(function() {
  if (this.customCreatedDates && this.customCreatedDates.length > 0) {
    return this.customCreatedDates[this.customCreatedDates.length - 1].date;
  }
  return this.createdAt;
});

// Ensure virtual fields are serialized
folderSchema.set('toJSON', { virtuals: true });
folderSchema.set('toObject', { virtuals: true });

// Initialize custom date arrays if they don't exist
folderSchema.pre('save', function(next) {
  if (!this.customCreatedDates || this.customCreatedDates.length === 0) {
    this.customCreatedDates = [{ date: this.createdAt || new Date(), modifiedAt: new Date() }];
  }
  next();
});

// Update notes count when folder is queried
folderSchema.virtual('notes', {
  ref: 'Note',
  localField: '_id',
  foreignField: 'folderId'
});

module.exports = mongoose.model('Folder', folderSchema);
