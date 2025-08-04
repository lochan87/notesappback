const express = require('express');
const Folder = require('../models/Folder');
const Note = require('../models/Note');
const auth = require('../middleware/auth');
const router = express.Router();

// Get all folders
router.get('/', auth, async (req, res) => {
  try {
    const folders = await Folder.find().sort({ createdAt: -1 });
    
    // Update notes count for each folder
    for (let folder of folders) {
      const notesCount = await Note.countDocuments({ folderId: folder._id });
      folder.notesCount = notesCount;
      await folder.save();
    }

    res.json(folders);
  } catch (error) {
    console.error('Error fetching folders:', error);
    res.status(500).json({ message: 'Error fetching folders' });
  }
});

// Get folder by ID
router.get('/:id', auth, async (req, res) => {
  try {
    const folder = await Folder.findById(req.params.id);
    
    if (!folder) {
      return res.status(404).json({ message: 'Folder not found' });
    }

    // Update notes count
    const notesCount = await Note.countDocuments({ folderId: folder._id });
    folder.notesCount = notesCount;
    await folder.save();

    res.json(folder);
  } catch (error) {
    console.error('Error fetching folder:', error);
    res.status(500).json({ message: 'Error fetching folder' });
  }
});

// Create new folder
router.post('/', auth, async (req, res) => {
  try {
    const { name, description, color, customCreatedAt } = req.body;

    if (!name || name.trim().length === 0) {
      return res.status(400).json({ message: 'Folder name is required' });
    }

    // Check if folder with same name exists
    const existingFolder = await Folder.findOne({ 
      name: name.trim() 
    });

    if (existingFolder) {
      return res.status(400).json({ message: 'Folder with this name already exists' });
    }

    const folderData = {
      name: name.trim(),
      description: description?.trim() || '',
      color: color || '#007bff',
      notesCount: 0
    };

    // Add custom created date if provided
    if (customCreatedAt) {
      folderData.customCreatedDates = [{
        date: new Date(customCreatedAt),
        modifiedAt: new Date()
      }];
    }

    const folder = new Folder(folderData);
    await folder.save();
    res.status(201).json(folder);
  } catch (error) {
    console.error('Error creating folder:', error);
    res.status(500).json({ message: 'Error creating folder' });
  }
});

// Update folder
router.put('/:id', auth, async (req, res) => {
  try {
    const { name, description, color, customCreatedAt } = req.body;
    const folderId = req.params.id;

    if (!name || name.trim().length === 0) {
      return res.status(400).json({ message: 'Folder name is required' });
    }

    // Check if another folder with same name exists
    const existingFolder = await Folder.findOne({ 
      name: name.trim(),
      _id: { $ne: folderId }
    });

    if (existingFolder) {
      return res.status(400).json({ message: 'Folder with this name already exists' });
    }

    let updateData = {
      name: name.trim(),
      description: description?.trim() || '',
      color: color || '#007bff'
    };

    // Add custom created date to array if provided
    if (customCreatedAt) {
      const newCreatedEntry = {
        date: new Date(customCreatedAt),
        modifiedAt: new Date()
      };
      updateData.$push = { customCreatedDates: newCreatedEntry };
    }

    const folder = await Folder.findByIdAndUpdate(
      folderId,
      updateData,
      { new: true, runValidators: true }
    );

    if (!folder) {
      return res.status(404).json({ message: 'Folder not found' });
    }

    res.json(folder);
  } catch (error) {
    console.error('Error updating folder:', error);
    res.status(500).json({ message: 'Error updating folder' });
  }
});

// Delete folder
router.delete('/:id', auth, async (req, res) => {
  try {
    const folderId = req.params.id;

    // Check if folder has notes
    const notesCount = await Note.countDocuments({ folderId });
    
    if (notesCount > 0) {
      return res.status(400).json({ 
        message: 'Cannot delete folder that contains notes. Please move or delete all notes first.' 
      });
    }

    const folder = await Folder.findByIdAndDelete(folderId);

    if (!folder) {
      return res.status(404).json({ message: 'Folder not found' });
    }

    res.json({ message: 'Folder deleted successfully' });
  } catch (error) {
    console.error('Error deleting folder:', error);
    res.status(500).json({ message: 'Error deleting folder' });
  }
});

// Get folder statistics
router.get('/:id/stats', auth, async (req, res) => {
  try {
    const folderId = req.params.id;
    
    const folder = await Folder.findById(folderId);
    if (!folder) {
      return res.status(404).json({ message: 'Folder not found' });
    }

    const totalNotes = await Note.countDocuments({ folderId });
    const pinnedNotes = await Note.countDocuments({ folderId, isPinned: true });
    const recentNotes = await Note.countDocuments({ 
      folderId, 
      createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } 
    });

    res.json({
      totalNotes,
      pinnedNotes,
      recentNotes,
      lastModified: folder.updatedAt
    });
  } catch (error) {
    console.error('Error fetching folder stats:', error);
    res.status(500).json({ message: 'Error fetching folder statistics' });
  }
});

module.exports = router;
