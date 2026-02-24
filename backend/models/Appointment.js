const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema({
    doctorId: { type: Number, required: true },
    date: { type: String, required: true },
    appointmentDate: { type: Date, index: true },
    reason: { type: String, default: '', trim: true, maxlength: 500 },
    createdBy: { type: String, required: true, lowercase: true, trim: true, index: true },
    status: { type: String, enum: ['booked', 'completed', 'cancelled'], default: 'booked', index: true },
    consultationFee: { type: Number, default: 0 },
    platformCommission: { type: Number, default: 0 },
    doctorEarning: { type: Number, default: 0 }
}, { timestamps: true });

appointmentSchema.index({ doctorId: 1, appointmentDate: -1 });

appointmentSchema.set('toJSON', {
    virtuals: true,
    versionKey: false,
    transform: function (_doc, ret) {
        ret.id = String(ret._id);
        delete ret._id;
        return ret;
    }
});

module.exports = mongoose.model('Appointment', appointmentSchema);
