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
    images: { type: [String], default: [] },
    degree: { type: String, default: '', trim: true },
    qualifications: { type: [String], default: [] },
    hospital: { type: String, default: '', trim: true },
    about: { type: String, default: '', trim: true, maxlength: 2000 }
}, { timestamps: true });

doctorSchema.set('toJSON', {
    virtuals: true,
    versionKey: false,
    transform: function (_doc, ret) {
        ret.mongoId = String(ret._id);
        delete ret._id;
        return ret;
    }
});

module.exports = mongoose.model('Doctor', doctorSchema);
