const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const router = express.Router();

// The special password for authentication
const SPECIAL_PASSWORD = process.env.SPECIAL_PASSWORD || 'notesapp2024';

// Login route
router.post('/login', async (req, res) => {
  try {
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({ message: 'Password is required' });
    }

    if (password !== SPECIAL_PASSWORD) {
      return res.status(401).json({ message: 'Invalid password' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { authenticated: true, timestamp: Date.now() },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

    // Create or update user session
    let user = await User.findOne({});
    if (!user) {
      user = new User({
        isAuthenticated: true,
        sessionId: token,
        lastLogin: new Date()
      });
    } else {
      user.isAuthenticated = true;
      user.sessionId = token;
      user.lastLogin = new Date();
    }
    
    await user.save();

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        lastLogin: user.lastLogin
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error during login' });
  }
});

// Logout route
router.post('/logout', async (req, res) => {
  try {
    // Clear user session
    await User.updateMany({}, { 
      isAuthenticated: false, 
      sessionId: null 
    });

    res.json({ message: 'Logout successful' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ message: 'Server error during logout' });
  }
});

// Verify token route
router.get('/verify', async (req, res) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ valid: false, message: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    
    // Check if user session is valid
    const user = await User.findOne({ sessionId: token });
    
    if (!user || !user.isAuthenticated) {
      return res.status(401).json({ valid: false, message: 'Invalid session' });
    }

    res.json({ 
      valid: true, 
      user: {
        id: user._id,
        lastLogin: user.lastLogin
      }
    });

  } catch (error) {
    res.status(401).json({ valid: false, message: 'Invalid token' });
  }
});

module.exports = router;
