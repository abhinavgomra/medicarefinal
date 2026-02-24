const env = require('../config/env');
const Appointment = require('../models/Appointment');
const Doctor = require('../models/Doctor');
const TelemedicineMessage = require('../models/TelemedicineMessage');

function toPositiveInt(value, fallback, max = 100) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
    return Math.min(Math.floor(parsed), max);
}

function buildAccessFilter(user) {
    if (user.role === 'admin') return {};
    if (user.role === 'doctor' && user.doctorId) return { doctorId: Number(user.doctorId) };
    return { createdBy: user.email };
}

function normalizeAppointmentId(value) {
    const id = String(value || '').trim();
    return /^[a-fA-F0-9]{24}$/.test(id) ? id : '';
}

function canAccessAppointment(user, appointment) {
    if (!user || !appointment) return false;
    if (user.role === 'admin') return true;
    if (user.role === 'doctor') return Number(user.doctorId || 0) === Number(appointment.doctorId || -1);
    return String(user.email || '').toLowerCase() === String(appointment.createdBy || '').toLowerCase();
}

async function getAuthorizedAppointment(req, res) {
    const appointmentId = normalizeAppointmentId(req.params.appointmentId);
    if (!appointmentId) {
        res.status(400).json({ error: 'invalid_appointment_id' });
        return null;
    }

    const appointment = await Appointment.findById(appointmentId).lean();
    if (!appointment) {
        res.status(404).json({ error: 'appointment_not_found' });
        return null;
    }
    if (!canAccessAppointment(req.user, appointment)) {
        res.status(403).json({ error: 'appointment_access_denied' });
        return null;
    }

    return { appointmentId, appointment };
}

function buildIceServers() {
    const iceServers = [];

    if (Array.isArray(env.TELEMEDICINE_STUN_SERVERS) && env.TELEMEDICINE_STUN_SERVERS.length) {
        iceServers.push({ urls: env.TELEMEDICINE_STUN_SERVERS });
    }

    const hasTurnConfig =
        Array.isArray(env.TELEMEDICINE_TURN_SERVERS) &&
        env.TELEMEDICINE_TURN_SERVERS.length > 0 &&
        Boolean(env.TELEMEDICINE_TURN_USERNAME) &&
        Boolean(env.TELEMEDICINE_TURN_CREDENTIAL);

    if (hasTurnConfig) {
        iceServers.push({
            urls: env.TELEMEDICINE_TURN_SERVERS,
            username: env.TELEMEDICINE_TURN_USERNAME,
            credential: env.TELEMEDICINE_TURN_CREDENTIAL
        });
    }

    return {
        iceServers: iceServers.length ? iceServers : [{ urls: ['stun:stun.l.google.com:19302'] }],
        hasTurn: hasTurnConfig
    };
}

exports.getIceServers = async (_req, res) => {
    try {
        const payload = buildIceServers();
        return res.json(payload);
    } catch (_err) {
        return res.status(500).json({ error: 'failed_to_fetch_ice_servers' });
    }
};

exports.getTelemedicineAppointments = async (req, res) => {
    try {
        const page = toPositiveInt(req.query.page, 1, 100000);
        const limit = toPositiveInt(req.query.limit, 20, 100);
        const skip = (page - 1) * limit;

        const filter = buildAccessFilter(req.user);
        if (req.query.status) {
            filter.status = String(req.query.status).trim();
        } else {
            filter.status = { $ne: 'cancelled' };
        }

        const [total, itemsRaw] = await Promise.all([
            Appointment.countDocuments(filter),
            Appointment.find(filter)
                .sort({ appointmentDate: -1, createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean()
        ]);

        const doctorIds = [...new Set(itemsRaw.map((a) => Number(a.doctorId)).filter(Boolean))];
        const doctors = await Doctor.find({ id: { $in: doctorIds } }).lean();
        const doctorById = new Map(doctors.map((d) => [Number(d.id), d]));

        const items = itemsRaw.map((a) => {
            const doctor = doctorById.get(Number(a.doctorId));
            return {
                id: String(a._id),
                doctorId: Number(a.doctorId),
                doctorName: doctor ? doctor.name : `Doctor #${a.doctorId}`,
                doctorSpecialty: doctor ? doctor.specialty : '',
                patientEmail: a.createdBy,
                date: a.date,
                appointmentDate: a.appointmentDate || null,
                reason: a.reason || '',
                status: a.status || 'booked',
                roomId: `appointment:${String(a._id)}`,
                canJoin: String(a.status || '') === 'booked'
            };
        });

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
    } catch (_err) {
        return res.status(500).json({ error: 'failed_to_fetch_telemedicine_appointments' });
    }
};

exports.getTelemedicineMessages = async (req, res) => {
    try {
        const authorized = await getAuthorizedAppointment(req, res);
        if (!authorized) return;

        const limit = toPositiveInt(req.query.limit, 100, 500);
        const items = await TelemedicineMessage.find({ appointmentId: authorized.appointmentId })
            .sort({ createdAt: 1 })
            .limit(limit)
            .lean();

        return res.json({
            items: items.map((m) => ({
                id: String(m._id),
                appointmentId: String(m.appointmentId),
                roomId: m.roomId,
                senderEmail: m.senderEmail,
                senderRole: m.senderRole,
                messageType: m.messageType,
                text: m.text,
                createdAt: m.createdAt
            }))
        });
    } catch (_err) {
        return res.status(500).json({ error: 'failed_to_fetch_telemedicine_messages' });
    }
};

exports.createTelemedicineMessage = async (req, res) => {
    try {
        const authorized = await getAuthorizedAppointment(req, res);
        if (!authorized) return;

        const text = String(req.body?.text || '').trim();
        if (!text) return res.status(400).json({ error: 'message_text_required' });
        if (text.length > 1000) return res.status(400).json({ error: 'message_too_long' });

        const requestedType = String(req.body?.type || 'chat').trim().toLowerCase();
        const messageType = requestedType === 'care-point' ? 'care-point' : 'chat';
        if (messageType === 'care-point' && !['doctor', 'admin'].includes(req.user.role)) {
            return res.status(403).json({ error: 'care_point_doctor_only' });
        }

        const roomId = String(req.body?.roomId || `appointment:${authorized.appointmentId}`).trim().slice(0, 128);

        const created = await TelemedicineMessage.create({
            appointmentId: authorized.appointmentId,
            roomId,
            senderEmail: req.user.email,
            senderRole: req.user.role,
            messageType,
            text
        });

        return res.status(201).json({
            id: String(created._id),
            appointmentId: String(created.appointmentId),
            roomId: created.roomId,
            senderEmail: created.senderEmail,
            senderRole: created.senderRole,
            messageType: created.messageType,
            text: created.text,
            createdAt: created.createdAt
        });
    } catch (_err) {
        return res.status(500).json({ error: 'failed_to_create_telemedicine_message' });
    }
};
