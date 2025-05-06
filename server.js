const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 5000;

const allowedOrigins = [
  'https://bouncy-duck.github.io', // Your GitHub Pages
  'http://localhost:3000',         // For local development
  'http://localhost:5000'          // If testing backend directly
];

// CORS configuration
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    
    const msg = `The CORS policy for this site does not allow access from ${origin}`;
    return callback(new Error(msg), false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// MongoDB Connection
require('dotenv').config(); // Load .env file (if local)
const mongoose = require('mongoose');

mongoose.connect(process.env.MONGODB_URL) // ✅ Uses the env variable
  .then(() => console.log('Connected to MongoDB Atlas'))
  .catch(err => console.error('Connection error:', err));

// User Schema and Model
const userSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);

// Property Schema and Model
const propertySchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: { type: String, required: true },
    type: { type: String, required: true },
    bedrooms: { type: Number, default: 0 },
    bathrooms: { type: Number, default: 0 },
    area: { type: Number, required: true },
    location: { type: String, required: true },
    price: { type: Number, required: true },
    contact: { type: String, required: true },
    phone: { type: String },
    image: { type: String },
    seller: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
});

const Property = mongoose.model('Property', propertySchema);

// API Routes

// User Registration
app.post('/api/register', async (req, res) => {
    try {
        const { email, username, password } = req.body;
        
        // Check if user already exists
        const existingUser = await User.findOne({ $or: [{ email }, { username }] });
        if (existingUser) {
            return res.status(400).json({ message: 'User already exists' });
        }
        
        // Create new user
        const newUser = new User({ email, username, password });
        await newUser.save();
        
        res.status(201).json({ message: 'User registered successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// User Login
app.post('/api/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        
        // Find user
        const user = await User.findOne({ username, password });
        if (!user) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }
        
        res.json({ 
            message: 'Login successful',
            user: {
                email: user.email,
                username: user.username
            }
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Get All Properties
app.get('/api/properties', async (req, res) => {
    try {
        const properties = await Property.find().sort({ createdAt: -1 });
        res.json(properties);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Get Featured Properties (first 3)
app.get('/api/properties/featured', async (req, res) => {
    try {
        const properties = await Property.find().sort({ createdAt: -1 }).limit(3);
        res.json(properties);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Ensure all API routes set proper Content-Type
app.get('/api/properties', async (req, res) => {
  try {
    const properties = await Property.find();
    res.set('Content-Type', 'application/json');
    res.json(properties);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add New Property
app.post('/api/properties', async (req, res) => {
    try {
        const propertyData = req.body;
        
        // Create new property
        const newProperty = new Property(propertyData);
        await newProperty.save();
        
        res.status(201).json({ 
            message: 'Property added successfully',
            property: newProperty
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Delete Property
app.delete('/api/properties/:id', async (req, res) => {
    try {
        const propertyId = req.params.id;
        const property = await Property.findById(propertyId);
        
        if (!property) {
            return res.status(404).json({ message: 'Property not found' });
        }
        
        // Verify the logged-in user owns this property
        if (property.seller !== req.body.username) {
            return res.status(403).json({ message: 'Unauthorized to delete this property' });
        }
        
        await Property.findByIdAndDelete(propertyId);
        res.json({ message: 'Property deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
