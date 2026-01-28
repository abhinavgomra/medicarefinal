const twilio = require('twilio');
const env = require('../config/env');

let nextAmbulanceRequestId = 1;
const ambulanceRequests = [];
const clientLocations = new Map(); // clientId -> { lat, lng, updatedAt }

exports.requestAmbulance = async (req, res) => {
    try {
        const { location } = req.body;
        if (!location || typeof location.lat !== 'number' || typeof location.lng !== 'number') {
            return res.status(400).json({ error: 'location with lat and lng required' });
        }
        // Simulate ambulance dispatch failure for demonstration
        const canSendAmbulance = false;

        if (!canSendAmbulance) {
            // Send SMS to user's phone number
            const userPhone = req.headers['x-user-phone'] || env.NOTIFY_TO_NUMBER;
            if (userPhone && env.TWILIO_ACCOUNT_SID && env.TWILIO_AUTH_TOKEN && env.TWILIO_FROM_NUMBER) {
                try {
                    const client = twilio(env.TWILIO_ACCOUNT_SID, env.TWILIO_AUTH_TOKEN);
                    await client.messages.create({
                        body: "We can't send an ambulance right now. Please stay safe and try again later.",
                        from: env.TWILIO_FROM_NUMBER,
                        to: userPhone
                    });
                } catch (error) {
                    console.error('Failed to send SMS:', error.message);
                }
            }
            return res.status(503).json({ error: "We can't send it right now. A message has been sent to your number." });
        }

        // If ambulance can be sent, create request (simplified)
        const newRequest = {
            id: nextAmbulanceRequestId++,
            createdAt: new Date().toISOString(),
            location,
            status: 'requested',
            updates: [{ at: new Date().toISOString(), status: 'requested' }]
        };
        ambulanceRequests.push(newRequest);
        return res.status(201).json({ requestId: newRequest.id, status: newRequest.status });
    } catch (err) {
        console.error('Ambulance request error:', err);
        return res.status(500).json({ error: 'internal server error' });
    }
};

exports.getRequest = (req, res) => {
    const id = Number(req.params.id);
    const request = ambulanceRequests.find(r => r.id === id);
    if (!request) return res.status(404).json({ error: 'not found' });
    return res.json(request);
};

exports.cancelRequest = (req, res) => {
    const id = Number(req.params.id);
    const request = ambulanceRequests.find(r => r.id === id);
    if (!request) return res.status(404).json({ error: 'not found' });
    if (request.status === 'arrived') return res.status(400).json({ error: 'cannot cancel after arrival' });
    request.status = 'cancelled';
    request.updates.push({ at: new Date().toISOString(), status: request.status });
    return res.json({ id: request.id, status: request.status });
};

exports.assignRequest = (req, res) => {
    const id = Number(req.params.id);
    const { ambulanceId } = req.body || {};
    const request = ambulanceRequests.find(r => r.id === id);
    if (!request) return res.status(404).json({ error: 'not found' });
    request.status = 'assigned';
    request.ambulanceId = ambulanceId || 'AMB-' + id;
    request.updates.push({ at: new Date().toISOString(), status: request.status });
    return res.json({ id: request.id, status: request.status, ambulanceId: request.ambulanceId });
};

exports.enRoute = (req, res) => {
    const id = Number(req.params.id);
    const request = ambulanceRequests.find(r => r.id === id);
    if (!request) return res.status(404).json({ error: 'not found' });
    request.status = 'en_route';
    request.updates.push({ at: new Date().toISOString(), status: request.status });
    return res.json({ id: request.id, status: request.status });
};

exports.arrived = (req, res) => {
    const id = Number(req.params.id);
    const request = ambulanceRequests.find(r => r.id === id);
    if (!request) return res.status(404).json({ error: 'not found' });
    request.status = 'arrived';
    request.updates.push({ at: new Date().toISOString(), status: request.status });
    return res.json({ id: request.id, status: request.status });
};

exports.updateLocation = (req, res) => {
    const { clientId, lat, lng } = req.body || {};
    if (!clientId || typeof lat !== 'number' || typeof lng !== 'number') {
        return res.status(400).json({ error: 'clientId, lat, lng required' });
    }
    const value = { lat, lng, updatedAt: new Date().toISOString() };
    clientLocations.set(clientId, value);
    return res.json({ clientId, ...value });
};

exports.getLocation = (req, res) => {
    const { clientId } = req.params;
    if (!clientLocations.has(clientId)) return res.status(404).json({ error: 'not found' });
    return res.json({ clientId, ...clientLocations.get(clientId) });
};
