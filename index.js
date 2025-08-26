import mongoose from 'mongoose';
import User from './schemas/userSchema.js';
import UserMedRecord from './schemas/userMedRecord.js';
import passport from 'passport';
import cors from 'cors';
import express from 'express';
import { upload } from './middleware/multerMiddleware.js';
import dotenv from 'dotenv';
import session from 'express-session';
import MongoStore from 'connect-mongo';
import { v2 as cloudinary } from 'cloudinary';

dotenv.config();

const app = express();

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Helper function for Cloudinary upload
const uploadToCloudinary = async (filePath) => {
  try {
    const result = await cloudinary.uploader.upload(filePath, {
      folder: "mediband/prescriptions",
      resource_type: "auto",
    });
    return result.secure_url;
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    throw error;
  }
};

const allowedOrigins = [
  'http://localhost:3000',                      // dev
  'https://mediband.vercel.app',
  'https://mediband.netlify.app'                // prod
];

app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));

app.use(express.json());

// Improved session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || "yourSecret",
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: process.env.MONGO_URL,
    touchAfter: 24 * 3600 // lazy session update
  }),
  cookie: {
    secure: process.env.NODE_ENV === 'production', // Dynamic based on environment
    httpOnly: true,
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax', // 'none' for production cross-origin
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

app.use(passport.initialize());
app.use(passport.session());
passport.use(User.createStrategy());

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

const PORT = process.env.PORT || 5000;
const url = process.env.MONGO_URL;

// Authentication middleware with better debugging
function isAuthenticated(req, res, next) {
  console.log("=== Authentication Debug ===");
  console.log("req.isAuthenticated():", req.isAuthenticated());
  console.log("req.user:", req.user ? req.user._id : null);
  console.log("req.session:", req.session);
  console.log("req.sessionID:", req.sessionID);
  console.log("Headers:", req.headers.cookie);
  console.log("===============================");
  
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ message: 'User not authenticated' });
}

// Connect to MongoDB first, then start server
mongoose.connect(url)
  .then(() => {
    console.log("Connected to MongoDB");
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  })
  .catch(err => console.log("Error connecting to MongoDB", err));

// Routes
app.get('/', (req, res) => {
  res.send('Hello World');
});

// Test route for authentication status
app.get('/auth/status', (req, res) => {
  res.json({
    isAuthenticated: req.isAuthenticated(),
    user: req.user || null,
    sessionID: req.sessionID
  });
});

app.post('/register', async (req, res) => {
  const { fullname, email, password } = req.body;

  if (!fullname || !email || !password) {
    return res.status(400).json({ message: 'Please fill all the fields' });
  }

  try {
    // Check if user exists
    const isExisting = await User.findOne({ email });
    if (isExisting) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Register new user
    const newUser = new User({ fullname, email });
    const registeredUser = await User.register(newUser, password);

    // Login immediately after registration
    req.login(registeredUser, (err) => {
      if (err) return res.status(500).json({ message: 'Login failed' });
      console.log("User registered and logged in:", registeredUser._id);
      res.status(200).json({ message: 'User registered and logged in!', user: registeredUser });
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

app.post('/login', (req, res, next) => {
  passport.authenticate('local', (err, user, info) => {
    if (err) return next(err);
    if (!user) {
      return res.status(401).json({ message: info.message || 'Invalid credentials' });
    }

    req.login(user, (err) => {   // establishes session + req.user
      if (err) return next(err);
      console.log("Logged in user:", user._id);
      console.log("Session after login:", req.session);
      res.status(200).json({ message: 'Login successful', user});
    });
  })(req, res, next);
});

app.post('/logout', (req, res) => {
  req.logout((err) => {
    if (err) return res.status(500).json({ message: 'Logout failed' });
    req.session.destroy((err) => {
      if (err) return res.status(500).json({ message: 'Session destroy failed' });
      res.clearCookie('connect.sid'); // Clear session cookie
      res.status(200).json({ message: 'Logout successful' });
    });
  });
});

app.post('/medform', isAuthenticated, upload.array('prescriptions', 10), async (req, res) => {
  try {
    console.log("req.body:", req.body);
    console.log("req.files:", req.files);

    // Upload files to Cloudinary if any
    let prescriptionUrls = [];
    if (req.files && req.files.length > 0) {
      prescriptionUrls = await Promise.all(
        req.files.map(file => uploadToCloudinary(file.path))
      );
    }

    // Parse nested objects
    const medRecordData = {
      user: req.user._id,
      age: req.body.age,
      height: req.body.height,
      weight: req.body.weight,
      gender: req.body.gender,
      bloodGroup: req.body.bloodGroup,
      emergencyContact: req.body.emergencyContact,
      allergies: req.body.allergies,
      medication: req.body.medication,
      medicationlist: req.body.medicationlist,
      prescriptions: prescriptionUrls,
      surgeries: req.body.surgeries,
      familyHistory: JSON.parse(req.body.familyHistory || "{}"),
      currentlyExperiencing: JSON.parse(req.body.currentlyExperiencing || "{}"),
      immunizations: JSON.parse(req.body.immunizations || "{}"),
      lifestyle: JSON.parse(req.body.lifestyle || "{}")
    };

    const medRecord = new UserMedRecord(medRecordData);
    await medRecord.save();
    res.status(201).json({ message: 'Medical record saved successfully', medRecord });

  } catch (err) {
    console.error("Error in /medform:", err);
    res.status(500).json({ message: 'Error saving medical record', error: err.message });
  }
});

app.get('/dashboard/medform', isAuthenticated, async (req, res) => {
  console.log("Fetching medical form for user:", req.user._id);
  try {
    const medRecord = await UserMedRecord.findOne({ user: req.user._id }).populate('user');
    if (!medRecord) {
      return res.status(404).json({ message: 'Medical record not found' });
    }
    res.status(200).json({ medRecord });
  } catch (err) {
    console.error("Error fetching medical record:", err);
    res.status(500).json({ message: 'Server error' });
  }
});

app.get('/dashboard/medform/:userId', async (req, res) => {
  const { userId } = req.params;
  console.log("Fetching medical form for userId:", userId);
  try {
    const medRecord = await UserMedRecord.findOne({ user: userId }).populate('user');
    if (!medRecord) {
      return res.status(404).json({ message: 'Medical record not found' });
    }
    res.status(200).json({ medRecord });
  } catch (err) {
    console.error("Error fetching medical record:", err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Cloudinary file upload route
app.post("/upload", upload.array("files", 10), async (req, res) => {
  try {
    const uploadPromises = req.files.map(file =>
      cloudinary.uploader.upload(file.path, {
        folder: "mediband/files",
        resource_type: "auto",
      })
    );

    const results = await Promise.all(uploadPromises);
    res.json({ urls: results.map(r => r.secure_url) });
  } catch (err) {
    console.error("Upload error:", err);
    res.status(500).json({ error: err.message });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("Global error handler:", err);
  res.status(500).json({ message: 'Internal server error', error: err.message });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ message: 'Route not found' });
});