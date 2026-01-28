const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema({
    doctorId: { type: Number, required: true },
    date: { type: String, required: true },
    reason: { type: String, default: '' },
    createdBy: { type: String, required: true }
}, { timestamps: true });

module.exports = mongoose.model('Appointment', appointmentSchema);
