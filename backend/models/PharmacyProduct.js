const mongoose = require('mongoose');

const pharmacyProductSchema = new mongoose.Schema({
    id: { type: Number, unique: true, index: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, default: '', trim: true },
    category: { type: String, default: 'General', trim: true, index: true },
    price: { type: Number, required: true, min: 0 },
    image: { type: String, default: '' },
    stock: { type: Number, default: 0, min: 0, index: true },
    prescriptionRequired: { type: Boolean, default: false, index: true },
    active: { type: Boolean, default: true, index: true }
}, { timestamps: true });

pharmacyProductSchema.index({ name: 'text', category: 'text', description: 'text' });

pharmacyProductSchema.set('toJSON', {
    virtuals: true,
    versionKey: false,
    transform: function (_doc, ret) {
        ret.mongoId = String(ret._id);
        delete ret._id;
        return ret;
    }
});

module.exports = mongoose.model('PharmacyProduct', pharmacyProductSchema);

