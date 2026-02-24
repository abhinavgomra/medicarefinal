const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
    appointmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment', required: true, unique: true, index: true },
    doctorId: { type: Number, required: true, index: true },
    patientEmail: { type: String, required: true, lowercase: true, trim: true, index: true },
    grossAmount: { type: Number, required: true, min: 0 },
    commissionRate: { type: Number, required: true, min: 0, max: 1 },
    platformCommission: { type: Number, required: true, min: 0 },
    doctorEarning: { type: Number, required: true, min: 0 },
    status: { type: String, enum: ['pending', 'paid', 'refunded'], default: 'pending', index: true },
    paidAt: { type: Date, default: null }
}, { timestamps: true });

transactionSchema.index({ doctorId: 1, createdAt: -1 });

transactionSchema.set('toJSON', {
    virtuals: true,
    versionKey: false,
    transform: function (_doc, ret) {
        ret.id = String(ret._id);
        delete ret._id;
        return ret;
    }
});

module.exports = mongoose.model('Transaction', transactionSchema);

