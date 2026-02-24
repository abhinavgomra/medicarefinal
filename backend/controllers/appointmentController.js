const Appointment = require('../models/Appointment');
const User = require('../models/User');
const Doctor = require('../models/Doctor');
const Transaction = require('../models/Transaction');
const emailService = require('../services/emailService');
const { sendSms } = require('../services/smsService');
const COMMISSION_RATE = 0.2;

const ALLOWED_UPDATE_FIELDS = new Set(['date', 'reason', 'status']);

function buildAccessFilter(user) {
  if (user.role === 'admin') return {};
  if (user.role === 'doctor' && user.doctorId) return { doctorId: Number(user.doctorId) };
  return { createdBy: user.email };
}

function canAccessAppointment(user, appointment) {
  if (!user || !appointment) return false;
  if (user.role === 'admin') return true;
  if (user.role === 'doctor') return Number(user.doctorId) === Number(appointment.doctorId);
  return user.email === appointment.createdBy;
}

function transactionStatusForAppointment(status) {
  if (status === 'completed') return 'paid';
  if (status === 'cancelled') return 'refunded';
  return 'pending';
}

function toPositiveInt(value, fallback, max = 100) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.min(Math.floor(parsed), max);
}

exports.getAppointments = async (req, res) => {
  try {
    const filter = buildAccessFilter(req.user);
    if (req.query.status) filter.status = req.query.status;

    if (req.query.doctorId && req.user.role === 'admin') {
      filter.doctorId = Number(req.query.doctorId);
    }

    const hasPaginationParams =
      typeof req.query.page !== 'undefined' ||
      typeof req.query.limit !== 'undefined' ||
      String(req.query.meta || '').toLowerCase() === 'true';

    if (!hasPaginationParams) {
      const list = await Appointment.find(filter).sort({ appointmentDate: -1, createdAt: -1 }).lean();
      return res.json(list);
    }

    const page = toPositiveInt(req.query.page, 1, 100000);
    const limit = toPositiveInt(req.query.limit, 20, 100);
    const skip = (page - 1) * limit;

    const [total, items] = await Promise.all([
      Appointment.countDocuments(filter),
      Appointment.find(filter)
        .sort({ appointmentDate: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean()
    ]);

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
    res.status(500).json({ error: 'failed to fetch appointments' });
  }
};

exports.createAppointment = async (req, res) => {
  const { doctorId, date, reason } = req.body || {};
  if (!doctorId || !date) return res.status(400).json({ error: 'doctorId and date required' });
  try {
    const doctor = await Doctor.findOne({ id: Number(doctorId) }).lean();
    if (!doctor) return res.status(404).json({ error: 'doctor not found' });
    const parsedDate = new Date(date);
    if (Number.isNaN(parsedDate.getTime())) return res.status(400).json({ error: 'invalid date format' });

    const consultationFee = Number(doctor.fees || 500);
    const platformCommission = Number((consultationFee * COMMISSION_RATE).toFixed(2));
    const doctorEarning = Number((consultationFee - platformCommission).toFixed(2));

    const appt = await Appointment.create({
      doctorId: Number(doctorId),
      date,
      appointmentDate: parsedDate,
      reason: String(reason || '').trim(),
      createdBy: req.user.email,
      consultationFee,
      platformCommission,
      doctorEarning
    });

    try {
      await Transaction.create({
        appointmentId: appt._id,
        doctorId: Number(doctorId),
        patientEmail: req.user.email,
        grossAmount: consultationFee,
        commissionRate: COMMISSION_RATE,
        platformCommission,
        doctorEarning,
        status: 'pending'
      });
    } catch (txErr) {
      await Appointment.findByIdAndDelete(appt._id);
      throw txErr;
    }

    res.status(201).json(appt);

    // Notifications
    const fresh = await User.findOne({ email: req.user.email }).lean();
    if (fresh && fresh.phone) {
      await sendSms(fresh.phone, `Appointment booked by ${req.user.email} for doctor ${doctorId} on ${date}${reason ? ` (${reason})` : ''}.`);
    }
    try {
      await emailService.sendAppointmentEmail({ doctorId, date, reason, userEmail: req.user.email });
    } catch (_) { }
  } catch (err) {
    res.status(400).json({ error: 'invalid appointment payload' });
  }
};

exports.updateAppointment = async (req, res) => {
  try {
    const appt = await Appointment.findById(req.params.id);
    if (!appt) return res.status(404).json({ error: 'not found' });
    if (!canAccessAppointment(req.user, appt)) return res.status(403).json({ error: 'forbidden' });

    const payload = req.body || {};
    const entries = Object.entries(payload).filter(([k]) => ALLOWED_UPDATE_FIELDS.has(k));
    if (entries.length === 0) return res.status(400).json({ error: 'no supported fields to update' });

    for (const [key, value] of entries) {
      if (key === 'status') {
        if (req.user.role === 'user') return res.status(403).json({ error: 'patients cannot change status' });
        appt.status = value;
        continue;
      }

      if (key === 'date') {
        const parsedDate = new Date(value);
        if (Number.isNaN(parsedDate.getTime())) return res.status(400).json({ error: 'invalid date format' });
        appt.date = value;
        appt.appointmentDate = parsedDate;
        continue;
      }

      if (key === 'reason') {
        appt.reason = String(value || '').trim();
      }
    }

    const updated = await appt.save();
    await Transaction.findOneAndUpdate(
      { appointmentId: appt._id },
      {
        status: transactionStatusForAppointment(updated.status),
        paidAt: updated.status === 'completed' ? new Date() : null
      }
    );

    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: 'invalid appointment id/payload' });
  }
};

exports.deleteAppointment = async (req, res) => {
  try {
    const appt = await Appointment.findById(req.params.id);
    if (!appt) return res.status(404).json({ error: 'not found' });
    if (!canAccessAppointment(req.user, appt)) return res.status(403).json({ error: 'forbidden' });

    await Appointment.findByIdAndDelete(req.params.id);
    await Transaction.findOneAndDelete({ appointmentId: req.params.id });

    res.json({ ok: true });
  } catch (err) {
    res.status(400).json({ error: 'invalid appointment id' });
  }
};
