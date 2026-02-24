const PharmacyProduct = require('../models/PharmacyProduct');
const PharmacyOrder = require('../models/PharmacyOrder');

function toPositiveInt(value, fallback, max = 100) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
    return Math.min(Math.floor(parsed), max);
}

function normalizeCartItems(items) {
    if (!Array.isArray(items)) return [];
    const merged = new Map();
    for (const raw of items) {
        const productId = Number(raw && raw.productId);
        const qty = Math.floor(Number(raw && raw.qty));
        if (!productId || qty <= 0) continue;
        merged.set(productId, (merged.get(productId) || 0) + qty);
    }
    return [...merged.entries()].map(([productId, qty]) => ({ productId, qty }));
}

function toBoolean(value) {
    if (typeof value === 'boolean') return value;
    const normalized = String(value || '').trim().toLowerCase();
    if (['true', '1', 'yes'].includes(normalized)) return true;
    if (['false', '0', 'no'].includes(normalized)) return false;
    return undefined;
}

function shouldPaginate(query) {
    return (
        typeof query.page !== 'undefined' ||
        typeof query.limit !== 'undefined' ||
        String(query.meta || '').toLowerCase() === 'true'
    );
}

function buildProductFilter(query, { includeInactive = false } = {}) {
    const filter = {};
    if (!includeInactive) {
        filter.active = true;
    }

    if (query.q) {
        filter.$or = [
            { name: { $regex: String(query.q), $options: 'i' } },
            { category: { $regex: String(query.q), $options: 'i' } },
            { description: { $regex: String(query.q), $options: 'i' } }
        ];
    }
    if (query.category) {
        filter.category = { $regex: String(query.category), $options: 'i' };
    }

    const inStock = toBoolean(query.inStock);
    if (inStock === true) filter.stock = { $gt: 0 };
    if (inStock === false) filter.stock = { $lte: 0 };

    const prescription = toBoolean(query.prescription);
    if (typeof prescription === 'boolean') filter.prescriptionRequired = prescription;

    if (includeInactive) {
        const active = toBoolean(query.active);
        if (typeof active === 'boolean') filter.active = active;
    }

    return filter;
}

function sanitizeProductPayload(payload, { forCreate = false } = {}) {
    const body = payload || {};
    const clean = {};

    if (Object.prototype.hasOwnProperty.call(body, 'id')) {
        const parsedId = Number(body.id);
        if (!Number.isInteger(parsedId) || parsedId <= 0) throw new Error('invalid_product_id');
        clean.id = parsedId;
    }

    if (Object.prototype.hasOwnProperty.call(body, 'name')) {
        const name = String(body.name || '').trim();
        if (!name) throw new Error('invalid_product_name');
        clean.name = name;
    }

    if (Object.prototype.hasOwnProperty.call(body, 'description')) {
        clean.description = String(body.description || '').trim();
    }

    if (Object.prototype.hasOwnProperty.call(body, 'category')) {
        clean.category = String(body.category || '').trim() || 'General';
    }

    if (Object.prototype.hasOwnProperty.call(body, 'price')) {
        const price = Number(body.price);
        if (!Number.isFinite(price) || price < 0) throw new Error('invalid_product_price');
        clean.price = Number(price.toFixed(2));
    }

    if (Object.prototype.hasOwnProperty.call(body, 'image')) {
        clean.image = String(body.image || '').trim();
    }

    if (Object.prototype.hasOwnProperty.call(body, 'stock')) {
        const stock = Number(body.stock);
        if (!Number.isFinite(stock) || stock < 0) throw new Error('invalid_product_stock');
        clean.stock = Math.floor(stock);
    }

    if (Object.prototype.hasOwnProperty.call(body, 'prescriptionRequired')) {
        clean.prescriptionRequired = Boolean(body.prescriptionRequired);
    }

    if (Object.prototype.hasOwnProperty.call(body, 'active')) {
        clean.active = Boolean(body.active);
    }

    if (forCreate) {
        if (!clean.name) throw new Error('invalid_product_name');
        if (!Object.prototype.hasOwnProperty.call(clean, 'price')) throw new Error('invalid_product_price');
        if (!Object.prototype.hasOwnProperty.call(clean, 'stock')) clean.stock = 0;
    }

    return clean;
}

async function queryProducts(filter, query) {
    const paginate = shouldPaginate(query);
    if (!paginate) {
        const list = await PharmacyProduct.find(filter).sort({ stock: -1, name: 1 }).lean();
        return list;
    }

    const page = toPositiveInt(query.page, 1, 100000);
    const limit = toPositiveInt(query.limit, 20, 100);
    const skip = (page - 1) * limit;

    const [total, items] = await Promise.all([
        PharmacyProduct.countDocuments(filter),
        PharmacyProduct.find(filter).sort({ stock: -1, name: 1 }).skip(skip).limit(limit).lean()
    ]);

    const totalPages = Math.max(1, Math.ceil(total / limit));
    return {
        items,
        pagination: {
            page,
            limit,
            total,
            totalPages,
            hasNext: page < totalPages,
            hasPrev: page > 1
        }
    };
}

async function restockOrderItems(order) {
    for (const item of order.items) {
        await PharmacyProduct.updateOne({ id: item.productId }, { $inc: { stock: item.qty } });
    }
}

exports.getProducts = async (req, res) => {
    try {
        const filter = buildProductFilter(req.query || {});
        const result = await queryProducts(filter, req.query || {});
        return res.json(result);
    } catch (_err) {
        return res.status(500).json({ error: 'failed_to_fetch_pharmacy_products' });
    }
};

exports.getAdminProducts = async (req, res) => {
    try {
        const filter = buildProductFilter(req.query || {}, { includeInactive: true });
        const result = await queryProducts(filter, req.query || {});
        return res.json(result);
    } catch (err) {
        return res.status(500).json({ error: 'failed_to_fetch_pharmacy_products' });
    }
};

exports.createProduct = async (req, res) => {
    try {
        const payload = sanitizeProductPayload(req.body, { forCreate: true });
        if (!payload.id) {
            const latest = await PharmacyProduct.findOne({ id: { $exists: true } }).sort({ id: -1 }).select({ id: 1 }).lean();
            payload.id = Number(latest?.id || 0) + 1;
        }
        const created = await PharmacyProduct.create(payload);
        return res.status(201).json(created);
    } catch (err) {
        if (err && err.code === 11000) {
            return res.status(409).json({ error: 'duplicate_product_id' });
        }
        return res.status(400).json({ error: err.message || 'invalid_pharmacy_product_payload' });
    }
};

exports.updateProduct = async (req, res) => {
    try {
        const id = Number(req.params.id);
        if (!id) return res.status(400).json({ error: 'invalid_product_id' });
        const updates = sanitizeProductPayload(req.body, { forCreate: false });
        if (Object.keys(updates).length === 0) {
            return res.status(400).json({ error: 'no_valid_fields_to_update' });
        }
        const updated = await PharmacyProduct.findOneAndUpdate(
            { id },
            { $set: updates },
            { new: true, runValidators: true }
        );
        if (!updated) return res.status(404).json({ error: 'product_not_found' });
        return res.json(updated);
    } catch (err) {
        return res.status(400).json({ error: err.message || 'invalid_update_payload' });
    }
};

exports.getOrders = async (req, res) => {
    try {
        const page = toPositiveInt(req.query.page, 1, 100000);
        const limit = toPositiveInt(req.query.limit, 20, 100);
        const skip = (page - 1) * limit;

        const filter = {};
        if (req.user.role !== 'admin') {
            filter.userEmail = req.user.email;
        } else if (req.query.userEmail) {
            filter.userEmail = String(req.query.userEmail).trim().toLowerCase();
        }
        if (req.query.status) filter.status = String(req.query.status).trim();

        const [total, rawItems] = await Promise.all([
            PharmacyOrder.countDocuments(filter),
            PharmacyOrder.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean()
        ]);
        const items = rawItems.map((order) => ({
            ...order,
            id: String(order._id)
        }));

        const totalPages = Math.max(1, Math.ceil(total / limit));
        return res.json({
            items,
            pagination: {
                page,
                limit,
                total,
                totalPages,
                hasNext: page < totalPages,
                hasPrev: page > 1
            }
        });
    } catch (err) {
        return res.status(500).json({ error: 'failed_to_fetch_pharmacy_orders' });
    }
};

exports.createOrder = async (req, res) => {
    const { items, notes, deliveryAddress } = req.body || {};
    const normalizedItems = normalizeCartItems(items);
    if (!normalizedItems.length) return res.status(400).json({ error: 'cart_items_required' });

    try {
        const ids = normalizedItems.map((i) => i.productId);
        const products = await PharmacyProduct.find({ id: { $in: ids }, active: true }).lean();
        const byId = new Map(products.map((p) => [p.id, p]));

        for (const item of normalizedItems) {
            const product = byId.get(item.productId);
            if (!product) return res.status(404).json({ error: `product_not_found:${item.productId}` });
            if (product.stock < item.qty) return res.status(400).json({ error: `insufficient_stock:${product.name}` });
        }

        const updatesDone = [];
        try {
            for (const item of normalizedItems) {
                const updated = await PharmacyProduct.findOneAndUpdate(
                    { id: item.productId, stock: { $gte: item.qty }, active: true },
                    { $inc: { stock: -item.qty } },
                    { new: true }
                );
                if (!updated) throw new Error('failed_to_reserve_stock');
                updatesDone.push(item);
            }

            const orderItems = normalizedItems.map((item) => {
                const product = byId.get(item.productId);
                const price = Number(product.price || 0);
                const lineTotal = Number((price * item.qty).toFixed(2));
                return {
                    productId: item.productId,
                    name: product.name,
                    price,
                    qty: item.qty,
                    lineTotal
                };
            });

            const subtotal = Number(orderItems.reduce((sum, i) => sum + i.lineTotal, 0).toFixed(2));
            const deliveryFee = subtotal >= 20 ? 0 : 2.99;
            const total = Number((subtotal + deliveryFee).toFixed(2));

            const order = await PharmacyOrder.create({
                userEmail: req.user.email,
                items: orderItems,
                subtotal,
                deliveryFee,
                total,
                notes: String(notes || '').trim(),
                deliveryAddress: String(deliveryAddress || '').trim(),
                paymentMethod: 'cod'
            });

            return res.status(201).json(order);
        } catch (innerErr) {
            for (const item of updatesDone) {
                await PharmacyProduct.updateOne({ id: item.productId }, { $inc: { stock: item.qty } });
            }
            if (innerErr.message === 'failed_to_reserve_stock') {
                return res.status(400).json({ error: 'failed_to_reserve_stock' });
            }
            return res.status(400).json({ error: 'failed_to_create_pharmacy_order' });
        }
    } catch (err) {
        return res.status(400).json({ error: 'failed_to_create_pharmacy_order' });
    }
};

exports.cancelOrder = async (req, res) => {
    try {
        const order = await PharmacyOrder.findById(req.params.id);
        if (!order) return res.status(404).json({ error: 'order_not_found' });
        if (req.user.role !== 'admin' && order.userEmail !== req.user.email) {
            return res.status(403).json({ error: 'forbidden' });
        }
        if (!['placed', 'processing'].includes(order.status)) {
            return res.status(400).json({ error: 'order_cannot_be_cancelled' });
        }

        await restockOrderItems(order);
        order.status = 'cancelled';
        await order.save();
        return res.json(order);
    } catch (err) {
        return res.status(400).json({ error: 'failed_to_cancel_order' });
    }
};

exports.updateOrderStatus = async (req, res) => {
    try {
        const { status } = req.body || {};
        const allowed = new Set(['placed', 'processing', 'shipped', 'delivered', 'cancelled']);
        if (!allowed.has(status)) return res.status(400).json({ error: 'invalid_status' });
        const order = await PharmacyOrder.findById(req.params.id);
        if (!order) return res.status(404).json({ error: 'order_not_found' });

        if (order.status === status) {
            return res.json(order);
        }

        if (order.status === 'cancelled' && status !== 'cancelled') {
            return res.status(400).json({ error: 'cancelled_order_cannot_be_changed' });
        }

        if (status === 'cancelled') {
            if (!['placed', 'processing'].includes(order.status)) {
                return res.status(400).json({ error: 'order_cannot_be_cancelled' });
            }
            await restockOrderItems(order);
            order.status = 'cancelled';
            await order.save();
            return res.json(order);
        }

        if (order.status === 'delivered') {
            return res.status(400).json({ error: 'delivered_order_cannot_be_changed' });
        }

        const rank = {
            placed: 1,
            processing: 2,
            shipped: 3,
            delivered: 4
        };
        if (rank[status] < rank[order.status]) {
            return res.status(400).json({ error: 'invalid_status_transition' });
        }

        order.status = status;
        await order.save();
        return res.json(order);
    } catch (err) {
        return res.status(400).json({ error: 'failed_to_update_order_status' });
    }
};
