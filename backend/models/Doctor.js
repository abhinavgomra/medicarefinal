const mongoose = require('mongoose');

// Keep a numeric id for doctors to match frontend expectations
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
}, { timestamps: true });

module.exports = mongoose.model('Doctor', doctorSchema);
