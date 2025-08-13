const express = require('express');
const Note = require('../models/Note');
const Folder = require('../models/Folder');
const auth = require('../middleware/auth');
const router = express.Router();

// Get all notes in a folder
router.get('/folder/:folderId', auth, async (req, res) => {
  try {
    const { folderId } = req.params;
    const { search, sortBy = 'createdAt', sortOrder = 'desc', page = 1, limit = 20 } = req.query;

    // Build query
    let query = { folderId };
    
    if (search) {
      query.$text = { $search: search };
    }

    // Build sort object
    const sortObj = {};
    if (sortBy === 'title') {
      sortObj.title = sortOrder === 'asc' ? 1 : -1;
    } else if (sortBy === 'lastModified') {
      sortObj.lastModified = sortOrder === 'asc' ? 1 : -1;
    } else {
      sortObj.createdAt = sortOrder === 'asc' ? 1 : -1;
    }

    // Add pinned notes priority
    sortObj.isPinned = -1;

    const skip = (page - 1) * limit;
    const notes = await Note.find(query)
      .sort(sortObj)
      .skip(skip)
      .limit(parseInt(limit))
      .populate('folderId', 'name color');

    const total = await Note.countDocuments(query);

    res.json({
      notes,
      pagination: {
        current: parseInt(page),
        total: Math.ceil(total / limit),
        count: notes.length,
        totalNotes: total
      }
    });
  } catch (error) {
    console.error('Error fetching notes:', error);
    res.status(500).json({ message: 'Error fetching notes' });
  }
});

// Get note by ID
router.get('/:id', auth, async (req, res) => {
  try {
    const note = await Note.findById(req.params.id).populate('folderId', 'name color');
    
    if (!note) {
      return res.status(404).json({ message: 'Note not found' });
    }

    res.json(note);
  } catch (error) {
    console.error('Error fetching note:', error);
    res.status(500).json({ message: 'Error fetching note' });
  }
});

// Create new note
router.post('/', auth, async (req, res) => {
  try {
    const { title, content, folderId, tags, isPinned, images } = req.body;

    if (!title || title.trim().length === 0) {
      return res.status(400).json({ message: 'Note title is required' });
    }

    if (!content || content.trim().length === 0) {
      return res.status(400).json({ message: 'Note content is required' });
    }

    if (!folderId) {
      return res.status(400).json({ message: 'Folder ID is required' });
    }

    // Verify folder exists
    const folder = await Folder.findById(folderId);
    if (!folder) {
      return res.status(404).json({ message: 'Folder not found' });
    }

    // Process uploaded images (Base64 format)
    const processedImages = [];
    if (images && Array.isArray(images)) {
      for (const image of images) {
        if (image.data && image.originalName && image.mimetype) {
          processedImages.push({
            filename: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${image.originalName.split('.').pop()}`,
            originalName: image.originalName,
            mimetype: image.mimetype,
            size: image.size || 0,
            data: image.data // Base64 string
          });
        }
      }
    }

    // Process tags
    let processedTags = [];
    if (tags) {
      if (Array.isArray(tags)) {
        processedTags = tags.filter(tag => tag.trim().length > 0);
      } else if (typeof tags === 'string') {
        processedTags = tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);
      }
    }

    const note = new Note({
      title: title.trim(),
      content: content.trim(),
      folderId,
      images: processedImages,
      tags: processedTags,
      isPinned: isPinned === 'true' || isPinned === true
    });

    await note.save();
    
    // Update folder notes count
    folder.notesCount = await Note.countDocuments({ folderId });
    await folder.save();

    const populatedNote = await Note.findById(note._id).populate('folderId', 'name color');
    
    res.status(201).json(populatedNote);
  } catch (error) {
    console.error('Error creating note:', error);
    res.status(500).json({ message: 'Error creating note' });
  }
});

// Update note
router.put('/:id', auth, async (req, res) => {
  try {
    const { title, content, tags, isPinned, removeImages, images, customCreatedAt, customLastModified } = req.body;
    const noteId = req.params.id;

    if (!title || title.trim().length === 0) {
      return res.status(400).json({ message: 'Note title is required' });
    }

    if (!content || content.trim().length === 0) {
      return res.status(400).json({ message: 'Note content is required' });
    }

    const existingNote = await Note.findById(noteId);
    if (!existingNote) {
      return res.status(404).json({ message: 'Note not found' });
    }

    // Process tags
    let processedTags = [];
    if (tags) {
      if (Array.isArray(tags)) {
        processedTags = tags.filter(tag => tag.trim().length > 0);
      } else if (typeof tags === 'string') {
        processedTags = tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);
      }
    }

    // Handle image removal
    let updatedImages = [...existingNote.images];
    if (removeImages) {
      const imagesToRemove = Array.isArray(removeImages) ? removeImages : [removeImages];
      updatedImages = updatedImages.filter(img => !imagesToRemove.includes(img.filename));
    }

    // Add new images (Base64 format)
    if (images && Array.isArray(images)) {
      for (const image of images) {
        if (image.data && image.originalName && image.mimetype) {
          updatedImages.push({
            filename: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${image.originalName.split('.').pop()}`,
            originalName: image.originalName,
            mimetype: image.mimetype,
            size: image.size || 0,
            data: image.data // Base64 string
          });
        }
      }
    }

    // Handle custom dates by adding to arrays
    let updateData = {
      title: title.trim(),
      content: content.trim(),
      images: updatedImages,
      tags: processedTags,
      isPinned: isPinned === 'true' || isPinned === true,
      lastModified: new Date()
    };

    // Add custom created date to array if provided and different from current
    if (customCreatedAt) {
      const currentCreatedAt = existingNote.mainCreatedAt || existingNote.createdAt;
      const newCreatedDate = new Date(customCreatedAt);
      
      // Only add if the date is actually different
      if (Math.abs(newCreatedDate.getTime() - new Date(currentCreatedAt).getTime()) > 60000) { // 1 minute tolerance
        const newCreatedEntry = {
          date: newCreatedDate,
          modifiedAt: new Date()
        };
        updateData.$push = updateData.$push || {};
        updateData.$push.customCreatedDates = newCreatedEntry;
      }
    }

    // If custom last modified date is provided, use it directly
    if (customLastModified) {
      // Handle datetime-local format properly (treat as local time, not UTC)
      let newModifiedDate;
      
      if (customLastModified.includes('T') && !customLastModified.includes('Z') && !customLastModified.includes('+')) {
        // This is a datetime-local format like "2025-08-13T20:11"
        // Parse it as local time by creating a Date object with individual components
        const [datePart, timePart] = customLastModified.split('T');
        const [year, month, day] = datePart.split('-').map(Number);
        const [hours, minutes] = timePart.split(':').map(Number);
        
        // Create date in local timezone
        newModifiedDate = new Date(year, month - 1, day, hours, minutes);
      } else {
        newModifiedDate = new Date(customLastModified);
      }
      
      console.log('Original datetime string:', customLastModified);
      console.log('Parsed as local time:', newModifiedDate.toISOString());
      console.log('Local display:', newModifiedDate.toLocaleString());
      
      // Always use the custom date sent by frontend
      updateData.lastModified = newModifiedDate;
      
      // Also add to custom dates array
      const newModifiedEntry = {
        date: newModifiedDate,
        modifiedAt: new Date()
      };
      updateData.$push = updateData.$push || {};
      updateData.$push.customLastModifiedDates = newModifiedEntry;
    }

    const updatedNote = await Note.findByIdAndUpdate(
      noteId,
      updateData,
      { new: true, runValidators: true }
    ).populate('folderId', 'name color');

    res.json(updatedNote);
  } catch (error) {
    console.error('Error updating note:', error);
    res.status(500).json({ message: 'Error updating note' });
  }
});

// Delete note
router.delete('/:id', auth, async (req, res) => {
  try {
    const note = await Note.findById(req.params.id);
    
    if (!note) {
      return res.status(404).json({ message: 'Note not found' });
    }

    await Note.findByIdAndDelete(req.params.id);

    // Update folder notes count
    const folder = await Folder.findById(note.folderId);
    if (folder) {
      folder.notesCount = await Note.countDocuments({ folderId: note.folderId });
      await folder.save();
    }

    res.json({ message: 'Note deleted successfully' });
  } catch (error) {
    console.error('Error deleting note:', error);
    res.status(500).json({ message: 'Error deleting note' });
  }
});

// Toggle pin status
router.patch('/:id/pin', auth, async (req, res) => {
  try {
    const note = await Note.findById(req.params.id);
    
    if (!note) {
      return res.status(404).json({ message: 'Note not found' });
    }

    note.isPinned = !note.isPinned;
    note.lastModified = new Date();
    await note.save();

    const updatedNote = await Note.findById(note._id).populate('folderId', 'name color');
    res.json(updatedNote);
  } catch (error) {
    console.error('Error toggling pin status:', error);
    res.status(500).json({ message: 'Error toggling pin status' });
  }
});

// Search notes across all folders
router.get('/search/global', auth, async (req, res) => {
  try {
    const { q, page = 1, limit = 20 } = req.query;

    if (!q || q.trim().length === 0) {
      return res.status(400).json({ message: 'Search query is required' });
    }

    const query = { $text: { $search: q.trim() } };
    const skip = (page - 1) * limit;

    const notes = await Note.find(query)
      .sort({ score: { $meta: 'textScore' }, createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('folderId', 'name color');

    const total = await Note.countDocuments(query);

    res.json({
      notes,
      pagination: {
        current: parseInt(page),
        total: Math.ceil(total / limit),
        count: notes.length,
        totalNotes: total
      },
      searchQuery: q.trim()
    });
  } catch (error) {
    console.error('Error searching notes:', error);
    res.status(500).json({ message: 'Error searching notes' });
  }
});

module.exports = router;
