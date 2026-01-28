const Doctor = require('../models/Doctor');

exports.getDoctors = async (req, res) => {
    const { q, specialty, accepting } = req.query;
    const filter = {};
    if (q) filter.name = { $regex: String(q), $options: 'i' };
    if (specialty) filter.specialty = { $regex: String(specialty), $options: 'i' };
    if (typeof accepting !== 'undefined') filter.acceptingNew = accepting === 'true';
    try {
        const docs = await Doctor.find(filter).sort({ rating: -1, name: 1 });
        res.json(docs);
    } catch (err) {
        res.status(500).json({ error: 'failed to fetch doctors' });
    }
};

exports.createDoctor = async (req, res) => {
    try {
        const created = await Doctor.create(req.body || {});
        res.status(201).json(created);
    } catch (err) {
        res.status(400).json({ error: 'invalid doctor payload' });
    }
};

exports.updateDoctor = async (req, res) => {
    try {
        const updated = await Doctor.findOneAndUpdate({ id: Number(req.params.id) }, req.body || {}, { new: true });
        if (!updated) return res.status(404).json({ error: 'not found' });
        res.json(updated);
    } catch (err) {
        res.status(400).json({ error: 'invalid doctor id/payload' });
    }
};

exports.deleteDoctor = async (req, res) => {
    try {
        const deleted = await Doctor.findOneAndDelete({ id: Number(req.params.id) });
        if (!deleted) return res.status(404).json({ error: 'not found' });
        res.json(deleted);
    } catch (err) {
        res.status(400).json({ error: 'invalid doctor id' });
    }
};
