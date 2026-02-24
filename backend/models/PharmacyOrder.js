const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
    productId: { type: Number, required: true },
    name: { type: String, required: true },
    price: { type: Number, required: true, min: 0 },
    qty: { type: Number, required: true, min: 1 },
    lineTotal: { type: Number, required: true, min: 0 }
}, { _id: false });

const pharmacyOrderSchema = new mongoose.Schema({
    userEmail: { type: String, required: true, lowercase: true, trim: true, index: true },
    items: { type: [orderItemSchema], default: [] },
    subtotal: { type: Number, required: true, min: 0 },
    deliveryFee: { type: Number, default: 0, min: 0 },
    total: { type: Number, required: true, min: 0 },
    status: {
        type: String,
        enum: ['placed', 'processing', 'shipped', 'delivered', 'cancelled'],
        default: 'placed',
        index: true
    },
    notes: { type: String, default: '', trim: true, maxlength: 500 },
    deliveryAddress: { type: String, default: '', trim: true, maxlength: 500 },
    paymentMethod: { type: String, enum: ['cod'], default: 'cod' }
}, { timestamps: true });

pharmacyOrderSchema.index({ userEmail: 1, createdAt: -1 });

pharmacyOrderSchema.set('toJSON', {
    virtuals: true,
    versionKey: false,
    transform: function (_doc, ret) {
        ret.id = String(ret._id);
        delete ret._id;
        return ret;
    }
});

module.exports = mongoose.model('PharmacyOrder', pharmacyOrderSchema);

