const mongoose = require('mongoose');

const telemedicineMessageSchema = new mongoose.Schema({
    appointmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment', required: true, index: true },
    roomId: { type: String, required: true, index: true },
    senderEmail: { type: String, required: true, lowercase: true, trim: true, index: true },
    senderRole: { type: String, required: true, trim: true },
    messageType: {
        type: String,
        enum: ['chat', 'care-point'],
        default: 'chat',
        index: true
    },
    text: { type: String, required: true, trim: true, maxlength: 1000 }
}, { timestamps: true });

module.exports = mongoose.model('TelemedicineMessage', telemedicineMessageSchema);
