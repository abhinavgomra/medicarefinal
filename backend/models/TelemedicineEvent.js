const mongoose = require('mongoose');

const telemedicineEventSchema = new mongoose.Schema({
    appointmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment', required: true, index: true },
    roomId: { type: String, required: true, index: true },
    eventType: {
        type: String,
        enum: ['join', 'leave', 'disconnect', 'offer', 'answer', 'end'],
        required: true,
        index: true
    },
    actorEmail: { type: String, default: '', lowercase: true, trim: true, index: true },
    actorRole: { type: String, default: '' },
    targetSocketId: { type: String, default: '' },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} }
}, { timestamps: true });

module.exports = mongoose.model('TelemedicineEvent', telemedicineEventSchema);
