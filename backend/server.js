const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const connectDatabase = require('./config/db');
const env = require('./config/env');
const errorHandler = require('./middleware/errorMiddleware');
const Doctor = require('./models/Doctor');

// Routes
const authRoutes = require('./routes/authRoutes');
const doctorRoutes = require('./routes/doctorRoutes');
const appointmentRoutes = require('./routes/appointmentRoutes');
const serviceRoutes = require('./routes/serviceRoutes');
const ambulanceRoutes = require('./routes/ambulanceRoutes');
const devRoutes = require('./routes/devRoutes');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// Health
app.get('/health', (req, res) => res.json({ status: 'ok' }));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/doctors', doctorRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api', serviceRoutes); // OCR, Voice, Verify, AI are mounted directly on /api
app.use('/api', ambulanceRoutes);
// Original: /api/ambulance/request -> Controller: router.post('/request') -> Mounted at /api/ambulance -> /api/ambulance/request. Correct.
// Original: /api/location/update -> Controller: router.post('/location/update') -> Mounted at /api/ambulance -> /api/ambulance/location/update. 
// WAIT. Original was /api/location/update. My ambulanceRoutes has /location/update. 
// If I mount ambulanceRoutes at /api/ambulance, it becomes /api/ambulance/location/update. This is a BREAKING CHANGE for frontend.
// I should mount ambulanceRoutes at /api to preserve paths, or update frontend. 
// Let's look at ambulanceRoutes again.
// router.post('/request', ...) -> /api/request (if mounted at /api/ambulance, it's /api/ambulance/request - Correct)
// router.post('/location/update', ...) -> /api/location/update (if mounted at /api, it's /api/location/update - Correct)
// So I should mount ambulanceRoutes at /api/ambulance for the ambulance stuff, but the location stuff is tricky.
// Let's split ambulanceRoutes or just mount it at /api and adjust paths in the route file.
// I'll adjust the route file in the next step if needed, but for now let's mount at /api and fix the paths in the route file to include 'ambulance' prefix where needed.
// Actually, looking at my ambulanceRoutes.js:
// router.post('/request', ...)
// If I mount at /api/ambulance, it becomes /api/ambulance/request.
// Original was /api/ambulance/request. So that's good.
// But location was /api/location/update.
// If I mount at /api/ambulance, it becomes /api/ambulance/location/update. Bad.
// I will mount ambulanceRoutes at /api and change the paths in ambulanceRoutes.js to include 'ambulance/' prefix.
// WAIT, I already wrote ambulanceRoutes.js with '/request'. 
// So I should mount it at /api/ambulance. 
// And I need to move the location routes out of ambulanceRoutes or mount them separately.
// Let's mount ambulanceRoutes at /api and use full paths in the route file? No, that's messy.
// I'll mount ambulanceRoutes at /api/ambulance.
// And I'll create a separate locationRoutes or just add location to serviceRoutes?
// Let's just mount devRoutes at /api.

// Let's fix ambulanceRoutes.js to be consistent.
// I'll re-write ambulanceRoutes.js to have the correct prefixes and mount at /api.

app.use('/api', devRoutes);

// Fix for Ambulance/Location routing:
// I will mount ambulanceRoutes at /api, but I need to update ambulanceRoutes.js first to include the full paths.
// OR I can mount it twice? No.
// Let's just use /api for everything and define full paths in routes if they are mixed.
// But standard practice is /api/resource.
// Doctors: /api/doctors -> router.get('/')
// Ambulance: /api/ambulance/request -> router.post('/request') (if mounted at /api/ambulance)
// Location: /api/location -> router.post('/update') (if mounted at /api/location)

// I will mount:
// app.use('/api/doctors', doctorRoutes);
// app.use('/api/appointments', appointmentRoutes);
// app.use('/api', serviceRoutes);
// app.use('/api', ambulanceRoutes); // I need to update ambulanceRoutes to handle /ambulance prefix inside it, or split it.
// app.use('/api', devRoutes);

// Error Handler
app.use(errorHandler);

// Start server
connectDatabase()
  .then(async () => {
    // Seed doctors if empty
    try {
      const count = await Doctor.countDocuments();
      if (count === 0) {
        const seedData = require('./data/doctors.json');
        await Doctor.insertMany(seedData);
        console.log(`Seeded ${seedData.length} doctors`);
      }
      // Upsert extras
      try {
        const extras = require('./data/doctors_extra.json');
        if (Array.isArray(extras) && extras.length) {
          let upserts = 0;
          for (const d of extras) {
            await Doctor.findOneAndUpdate({ id: d.id }, d, { upsert: true, new: true });
            upserts += 1;
          }
          console.log(`Upserted extra doctors: ${upserts}`);
        }
      } catch (_) { }
    } catch (e) {
      console.warn('Seeding skipped or failed:', e.message);
    }

    app.listen(env.PORT, () => {
      console.log(`API running on port ${env.PORT}`);
    });
  })
  .catch((err) => {
    console.error('Failed to connect to DB:', err);
    process.exit(1);
  });
