const http = require('http');
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
const doctorPortalRoutes = require('./routes/doctorPortalRoutes');
const pharmacyRoutes = require('./routes/pharmacyRoutes');
const telemedicineRoutes = require('./routes/telemedicineRoutes');
const PharmacyProduct = require('./models/PharmacyProduct');
const { createCallSignaling } = require('./realtime/callSignaling');

const app = express();
const httpServer = http.createServer(app);

// Middleware
app.enable('trust proxy');
if (env.FORCE_HTTPS) {
  app.use((req, res, next) => {
    const host = String(req.hostname || '').toLowerCase();
    const isLocalHost = host === 'localhost' || host === '127.0.0.1';
    if (req.secure || isLocalHost) return next();
    return res.redirect(301, `https://${req.headers.host}${req.originalUrl}`);
  });
}
app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(morgan('dev'));
// Health
app.get('/health', (req, res) => res.json({ status: 'ok' }));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/doctors', doctorRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/doctor', doctorPortalRoutes);
app.use('/api/pharmacy', pharmacyRoutes);
app.use('/api/telemedicine', telemedicineRoutes);
app.use('/api', serviceRoutes); // OCR, Voice, Verify, AI are mounted directly on /api
app.use('/api', ambulanceRoutes);
app.use('/api', devRoutes);

// Error Handler
app.use(errorHandler);

// Real-time signaling for WebRTC calls
createCallSignaling(httpServer);

async function seedDoctorsIfNeeded() {
  const count = await Doctor.countDocuments();
  if (count === 0) {
    const seedData = require('./data/doctors.json');
    await Doctor.insertMany(seedData);
    console.log(`Seeded ${seedData.length} doctors`);
  }

  const extras = require('./data/doctors_extra.json');
  if (Array.isArray(extras) && extras.length) {
    let upserts = 0;
    for (const d of extras) {
      await Doctor.findOneAndUpdate({ id: d.id }, d, { upsert: true, new: true });
      upserts += 1;
    }
    console.log(`Upserted extra doctors: ${upserts}`);
  }
}

async function seedPharmacyProductsIfNeeded() {
  const products = require('./data/pharmacy_products.json');
  if (!Array.isArray(products) || products.length === 0) return;
  let upserts = 0;
  for (const p of products) {
    await PharmacyProduct.findOneAndUpdate({ id: p.id }, p, { upsert: true, new: true });
    upserts += 1;
  }
  console.log(`Upserted pharmacy products: ${upserts}`);
}

// Start server
connectDatabase()
  .then(async () => {
    try {
      await seedDoctorsIfNeeded();
      await seedPharmacyProductsIfNeeded();
    } catch (e) {
      console.warn('Seeding skipped or failed:', e.message);
    }

    httpServer.listen(env.PORT, () => {
      console.log(`API running on port ${env.PORT}`);
    });
  })
  .catch((err) => {
    console.error('Failed to connect to DB:', err);
    process.exit(1);
  });
