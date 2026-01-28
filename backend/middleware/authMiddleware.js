const jwt = require('jsonwebtoken');
const env = require('../config/env');

function authMiddleware(req, res, next) {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!token) return res.status(401).json({ error: 'missing token' });
    try {
        const decoded = jwt.verify(token, env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        return res.status(401).json({ error: 'invalid token' });
    }
}

function adminOnly(req, res, next) {
    if (!req.user) return res.status(401).json({ error: 'unauthorized' });
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'forbidden' });
    next();
}

module.exports = { authMiddleware, adminOnly };
