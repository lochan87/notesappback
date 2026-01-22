const mongoose = require('mongoose');

const noteSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    maxLength: 200
  },
  content: {
    type: String,
    required: true,
    maxLength: 10000
  },
  folderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Folder',
    required: true
  },
  images: [{
    filename: String,
    originalName: String,
    mimetype: String,
    size: Number,
    data: String // Base64 encoded image data
  }],
  tags: [{
    type: String,
    trim: true
  }],
  isPinned: {
    type: Boolean,
    default: false
  },
  customCreatedDates: [{
    date: { type: Date, default: Date.now },
    modifiedAt: { type: Date, default: Date.now }
  }],
  customLastModifiedDates: [{
    date: { type: Date, default: Date.now },
    modifiedAt: { type: Date, default: Date.now }
  }],
  lastModified: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Virtual field for main created date (last item in customCreatedDates array)
noteSchema.virtual('mainCreatedAt').get(function() {
  if (this.customCreatedDates && this.customCreatedDates.length > 0) {
    return this.customCreatedDates[this.customCreatedDates.length - 1].date;
  }
  return this.createdAt;
});

// Virtual field for main last modified date (last item in customLastModifiedDates array)
noteSchema.virtual('mainLastModified').get(function() {
  if (this.customLastModifiedDates && this.customLastModifiedDates.length > 0) {
    return this.customLastModifiedDates[this.customLastModifiedDates.length - 1].date;
  }
  return this.lastModified;
});

// Ensure virtual fields are serialized
noteSchema.set('toJSON', { virtuals: true });
noteSchema.set('toObject', { virtuals: true });

// Update lastModified on save (only if not explicitly set)
noteSchema.pre('save', function(next) {
  // Initialize custom date arrays if they don't exist
  if (!this.customCreatedDates || this.customCreatedDates.length === 0) {
    this.customCreatedDates = [{ date: this.createdAt || new Date(), modifiedAt: new Date() }];
  }
  
  if (!this.customLastModifiedDates || this.customLastModifiedDates.length === 0) {
    this.customLastModifiedDates = [{ date: new Date(), modifiedAt: new Date() }];
  }
  
  if (!this.isModified('lastModified')) {
    this.lastModified = new Date();
  }
  next();
});

// Text search index
noteSchema.index({ title: 'text', content: 'text', tags: 'text' });

// Compound indexes for efficient sorting on large datasets
noteSchema.index({ folderId: 1, isPinned: -1, createdAt: -1 });
noteSchema.index({ folderId: 1, isPinned: -1, title: 1 });
noteSchema.index({ folderId: 1, isPinned: -1, lastModified: -1 });

module.exports = mongoose.model('Note', noteSchema);
