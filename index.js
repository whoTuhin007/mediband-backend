import mongoose from 'mongoose';
import User from './schemas/userSchema.js';
import passport from 'passport';
import cors from 'cors';
import express from 'express';
import { upload } from './middleware/multerMiddleware.js';
import dotenv from 'dotenv';
dotenv.config();

const app = express();

const allowedOrigins = [
  'http://localhost:3000',                      // dev
  'https://mediband.vercel.app'  // prod
];

app.use(cors({
  origin: function(origin, callback){
    if(!origin) return callback(null, true); // allow Postman or mobile apps
    if(allowedOrigins.indexOf(origin) === -1){
      const msg = `CORS policy does not allow access from this origin: ${origin}`;
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  },
  credentials: true
}));

app.use(express.json());
import session from 'express-session';

app.use(session({
  secret: "yourSecret",
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: true ,     // true only in HTTPS
    httpOnly: true,
    sameSite: "none"    // important for localhost cross-origin
  }
}));




app.use(passport.initialize());
app.use(passport.session());
passport.use(User.createStrategy());

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

// Passport config
// passport.use(new LocalStrategy({ usernameField: 'email' }, User.authenticate()));
// passport.serializeUser((user, done) => {
//     console.log("Serializing user:", user);
//   done(null, user._id);  // store only user.id in session
// });

// passport.deserializeUser(async (id, done) => {
//   try {
//     const user = await User.findById(id);
//       // fetch full user details from DB
//     console.log("Deserialized user:", user);
//     done(null, user);
//   } catch (err) {
//     done(err);
//   }
// });

const PORT = process.env.PORT || 5000;
const url = process.env.MONGO_URL;

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
      res.status(200).json({ message: 'Login successful', user});
    });
  })(req, res, next);
});


import UserMedRecord from './schemas/userMedRecord.js';
function isAuthenticated(req, res, next) {
    console.log("isAuthenticated check, req.user:", req.user);
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ message: 'User not authenticated' });
}





app.post('/medform', isAuthenticated, upload.array('prescriptions', 10), async (req, res) => {
  try {
    console.log("req.body:", req.body);
    console.log("req.files:", req.files);

    // Parse nested objects
    const medRecordData =  {
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
      prescriptions: await Promise.all(req.files.map(file => uploadToCloudinary(file.path))),
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
    console.error("Error uploading files to Cloudinary:", err);
    res.status(500).json({ message: 'Error uploading files', err });
  }
});




app.get('/dashboard/medform',isAuthenticated, async (req, res) => {
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
}
);


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
}
);

{/*cloudinary  */}

app.post("/upload", upload.array("files", 10), async (req, res) => {
  try {
    const uploadPromises = req.files.map(file =>
      cloudinary.uploader.upload(file.path, {
        folder: "mediband/files", // custom folder
        resource_type: "auto",   // auto handles pdf, image, etc.
      })
    );

    const results = await Promise.all(uploadPromises);
    res.json({ urls: results.map(r => r.secure_url) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(5000, () => console.log("Server running..."));