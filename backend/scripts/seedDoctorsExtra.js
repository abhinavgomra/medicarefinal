require('dotenv').config();
const mongoose = require('mongoose');
const path = require('path');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/medicare';

const doctorSchema = new mongoose.Schema({
  id: { type: Number, unique: true, index: true },
  name: { type: String, required: true },
  specialty: { type: String, required: true },
  rating: { type: Number, default: 0 },
  experience: { type: Number, default: 0 },
  location: { type: String, default: '' },
  languages: { type: [String], default: [] },
  acceptingNew: { type: Boolean, default: true },
  fees: { type: Number, default: 0 },
  clinicHours: { type: String, default: '' },
  images: { type: [String], default: [] }
});

const Doctor = mongoose.model('Doctor', doctorSchema);

async function main() {
  const dataPath = path.join(__dirname, '..', 'data', 'doctors_extra.json');
  const doctors = require(dataPath);

  await mongoose.connect(MONGODB_URI);
  console.log('Connected to MongoDB');

  for (const d of doctors) {
    await Doctor.findOneAndUpdate({ id: d.id }, d, { upsert: true, new: true });
  }
  console.log(`Seeded/Updated ${doctors.length} doctors.`);
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});


