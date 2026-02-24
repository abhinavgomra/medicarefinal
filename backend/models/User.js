const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    email: { type: String, required: true, lowercase: true, trim: true, unique: true, index: true },
    hashedPassword: { type: String, required: true },
    role: { type: String, enum: ['user', 'admin', 'doctor'], default: 'user' },
    doctorId: { type: Number, default: null },
    phone: { type: String, default: '' },
    phoneVerified: { type: Boolean, default: false },
    fullName: { type: String, default: '', trim: true, maxlength: 120 },
    age: { type: Number, default: null, min: 0, max: 130 },
    gender: { type: String, default: '', trim: true, maxlength: 20 },
    bloodGroup: { type: String, default: '', trim: true, maxlength: 10 },
    allergies: { type: String, default: '', trim: true, maxlength: 500 },
    medicalHistory: { type: String, default: '', trim: true, maxlength: 2000 }
}, { timestamps: true });

userSchema.pre('validate', function enforceDoctorId(next) {
    if (this.role === 'doctor' && !this.doctorId) {
        return next(new Error('doctorId is required for doctor role'));
    }
    return next();
});

userSchema.set('toJSON', {
    virtuals: true,
    versionKey: false,
    transform: function (_doc, ret) {
        ret.id = String(ret._id);
        delete ret._id;
        return ret;
    }
});

module.exports = mongoose.model('User', userSchema);
