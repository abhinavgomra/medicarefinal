const Appointment = require('../models/Appointment');
const Doctor = require('../models/Doctor');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const TelemedicineMessage = require('../models/TelemedicineMessage');

function toPositiveInt(value, fallback, max = 100) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.min(Math.floor(parsed), max);
}

function toSafeString(value, max = 2000) {
  return String(value || '').trim().slice(0, max);
}

function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

function normalizeStringArray(value, maxItems = 20, maxLen = 120) {
  const raw = Array.isArray(value) ? value : String(value || '').split(',');
  return raw
    .map((v) => String(v || '').trim())
    .filter(Boolean)
    .slice(0, maxItems)
    .map((v) => v.slice(0, maxLen));
}

function getTodayRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  return { start, end };
}

function toDoctorResponse(doctor) {
  return {
    id: doctor.id,
    name: doctor.name,
    specialty: doctor.specialty,
    fees: Number(doctor.fees || 500),
    experience: Number(doctor.experience || 0),
    location: doctor.location || '',
    languages: Array.isArray(doctor.languages) ? doctor.languages : [],
    clinicHours: doctor.clinicHours || '',
    degree: doctor.degree || '',
    qualifications: Array.isArray(doctor.qualifications) ? doctor.qualifications : [],
    hospital: doctor.hospital || '',
    about: doctor.about || ''
  };
}

function toAppointmentSummary(a) {
  return {
    id: String(a._id),
    doctorId: a.doctorId,
    date: a.date,
    appointmentDate: a.appointmentDate || null,
    reason: a.reason || '',
    patientEmail: a.createdBy,
    createdAt: a.createdAt,
    status: a.status || 'booked'
  };
}

exports.getDashboard = async (req, res) => {
  try {
    const doctorId = Number(req.user && req.user.doctorId);
    if (!doctorId) return res.status(400).json({ error: 'doctorId missing on account' });

    const appointmentsPage = toPositiveInt(req.query.appointmentsPage, 1, 100000);
    const appointmentsLimit = toPositiveInt(req.query.appointmentsLimit, 20, 100);
    const txPage = toPositiveInt(req.query.txPage, 1, 100000);
    const txLimit = toPositiveInt(req.query.txLimit, 20, 100);

    const appointmentsSkip = (appointmentsPage - 1) * appointmentsLimit;
    const txSkip = (txPage - 1) * txLimit;
    const { start: todayStart, end: todayEnd } = getTodayRange();

    const doctor = await Doctor.findOne({ id: doctorId }).lean();
    if (!doctor) return res.status(404).json({ error: 'doctor profile not found' });

    const [
      appointmentsTotal,
      appointmentsRaw,
      patientAggDocs,
      txTotal,
      txDocs,
      totalsAgg,
      todayAppointmentsRaw
    ] = await Promise.all([
      Appointment.countDocuments({ doctorId }),
      Appointment.find({ doctorId })
        .sort({ appointmentDate: -1, createdAt: -1 })
        .skip(appointmentsSkip)
        .limit(appointmentsLimit)
        .lean(),
      Appointment.aggregate([
        { $match: { doctorId } },
        { $sort: { appointmentDate: -1, createdAt: -1 } },
        {
          $group: {
            _id: '$createdBy',
            totalVisits: { $sum: 1 },
            lastVisitDate: { $first: '$date' },
            lastReason: { $first: '$reason' }
          }
        },
        { $sort: { totalVisits: -1 } }
      ]),
      Transaction.countDocuments({ doctorId }),
      Transaction.find({ doctorId })
        .sort({ createdAt: -1 })
        .skip(txSkip)
        .limit(txLimit)
        .lean(),
      Transaction.aggregate([
        { $match: { doctorId } },
        {
          $group: {
            _id: null,
            totalGross: { $sum: '$grossAmount' },
            totalCommission: { $sum: '$platformCommission' },
            totalEarnings: { $sum: '$doctorEarning' }
          }
        }
      ]),
      Appointment.find({
        doctorId,
        appointmentDate: { $gte: todayStart, $lte: todayEnd },
        status: { $ne: 'cancelled' }
      })
        .sort({ appointmentDate: 1, createdAt: 1 })
        .lean()
    ]);

    const appointments = appointmentsRaw.map(toAppointmentSummary);
    const todayAppointments = todayAppointmentsRaw.map(toAppointmentSummary);

    const uniquePatientEmails = patientAggDocs.map((d) => d._id);
    const aggByEmail = new Map(patientAggDocs.map((d) => [d._id, d]));
    const users = await User.find({ email: { $in: uniquePatientEmails } }).lean();
    const usersByEmail = new Map(users.map((u) => [u.email, u]));

    const patientHistory = uniquePatientEmails
      .map((email) => {
        const base = aggByEmail.get(email);
        const patient = usersByEmail.get(email);
        return {
          patientEmail: email,
          patientName: patient && patient.fullName ? patient.fullName : '',
          patientPhone: patient && patient.phone ? patient.phone : '',
          totalVisits: base ? base.totalVisits : 0,
          lastVisitDate: base ? base.lastVisitDate : '',
          lastReason: base ? base.lastReason : ''
        };
      })
      .sort((a, b) => b.totalVisits - a.totalVisits);

    const transactions = txDocs.map((t) => ({
      id: String(t._id),
      appointmentId: String(t.appointmentId),
      patientEmail: t.patientEmail,
      date: t.createdAt,
      grossAmount: t.grossAmount,
      commissionRate: t.commissionRate,
      platformCommission: t.platformCommission,
      doctorEarning: t.doctorEarning,
      status: t.status
    }));

    const totals = totalsAgg[0] || { totalGross: 0, totalCommission: 0, totalEarnings: 0 };

    const appointmentsTotalPages = Math.max(1, Math.ceil(appointmentsTotal / appointmentsLimit));
    const txTotalPages = Math.max(1, Math.ceil(txTotal / txLimit));

    return res.json({
      doctor: toDoctorResponse(doctor),
      stats: {
        totalAppointments: appointmentsTotal,
        totalPatients: patientHistory.length,
        todayAppointments: todayAppointments.length,
        ...totals
      },
      todayAppointments,
      appointments,
      patientHistory,
      transactions,
      pagination: {
        appointments: {
          page: appointmentsPage,
          limit: appointmentsLimit,
          total: appointmentsTotal,
          totalPages: appointmentsTotalPages,
          hasNext: appointmentsPage < appointmentsTotalPages,
          hasPrev: appointmentsPage > 1
        },
        transactions: {
          page: txPage,
          limit: txLimit,
          total: txTotal,
          totalPages: txTotalPages,
          hasNext: txPage < txTotalPages,
          hasPrev: txPage > 1
        }
      }
    });
  } catch (err) {
    console.error('Doctor dashboard error:', err);
    return res.status(500).json({ error: 'failed_to_load_doctor_dashboard' });
  }
};

exports.getPatientRecord = async (req, res) => {
  try {
    const doctorId = Number(req.user && req.user.doctorId);
    if (!doctorId) return res.status(400).json({ error: 'doctorId missing on account' });

    const patientEmail = normalizeEmail(req.params.patientEmail);
    if (!patientEmail) return res.status(400).json({ error: 'invalid_patient_email' });

    const [patient, visits] = await Promise.all([
      User.findOne({ email: patientEmail }).lean(),
      Appointment.find({ doctorId, createdBy: patientEmail })
        .sort({ appointmentDate: -1, createdAt: -1 })
        .lean()
    ]);

    if (!patient && visits.length === 0) {
      return res.status(404).json({ error: 'patient_not_found_for_doctor' });
    }

    const appointmentIds = visits.map((v) => v._id);
    const carePointMessages = appointmentIds.length
      ? await TelemedicineMessage.find({
        appointmentId: { $in: appointmentIds },
        messageType: 'care-point'
      })
        .sort({ createdAt: -1 })
        .lean()
      : [];

    return res.json({
      patient: {
        email: patientEmail,
        fullName: patient?.fullName || '',
        phone: patient?.phone || '',
        age: typeof patient?.age === 'number' ? patient.age : null,
        gender: patient?.gender || '',
        bloodGroup: patient?.bloodGroup || '',
        allergies: patient?.allergies || '',
        medicalHistory: patient?.medicalHistory || ''
      },
      visits: visits.map((v) => ({
        id: String(v._id),
        date: v.date,
        appointmentDate: v.appointmentDate || null,
        status: v.status || 'booked',
        reason: v.reason || '',
        consultationFee: Number(v.consultationFee || 0),
        platformCommission: Number(v.platformCommission || 0),
        doctorEarning: Number(v.doctorEarning || 0)
      })),
      carePoints: carePointMessages.map((m) => ({
        id: String(m._id),
        appointmentId: String(m.appointmentId),
        text: m.text,
        createdAt: m.createdAt,
        senderEmail: m.senderEmail
      }))
    });
  } catch (err) {
    console.error('Doctor patient record error:', err);
    return res.status(500).json({ error: 'failed_to_load_patient_record' });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const doctorId = Number(req.user && req.user.doctorId);
    if (!doctorId) return res.status(400).json({ error: 'doctorId missing on account' });

    const doctor = await Doctor.findOne({ id: doctorId });
    if (!doctor) return res.status(404).json({ error: 'doctor profile not found' });

    const payload = req.body || {};
    const allowedFields = ['name', 'specialty', 'location', 'clinicHours', 'degree', 'hospital', 'about'];
    allowedFields.forEach((field) => {
      if (Object.prototype.hasOwnProperty.call(payload, field)) {
        doctor[field] = toSafeString(payload[field], 2000);
      }
    });

    if (Object.prototype.hasOwnProperty.call(payload, 'fees')) {
      const fees = Number(payload.fees);
      if (Number.isFinite(fees) && fees >= 0) doctor.fees = fees;
    }

    if (Object.prototype.hasOwnProperty.call(payload, 'experience')) {
      const exp = Number(payload.experience);
      if (Number.isFinite(exp) && exp >= 0 && exp <= 80) doctor.experience = Math.floor(exp);
    }

    if (Object.prototype.hasOwnProperty.call(payload, 'languages')) {
      doctor.languages = normalizeStringArray(payload.languages, 20, 60);
    }

    if (Object.prototype.hasOwnProperty.call(payload, 'qualifications')) {
      doctor.qualifications = normalizeStringArray(payload.qualifications, 30, 120);
    }

    if (Object.prototype.hasOwnProperty.call(payload, 'images')) {
      doctor.images = normalizeStringArray(payload.images, 10, 300);
    }

    await doctor.save();
    return res.json({ doctor: toDoctorResponse(doctor.toObject()) });
  } catch (err) {
    console.error('Doctor update profile error:', err);
    return res.status(400).json({ error: 'failed_to_update_doctor_profile', message: err.message });
  }
};
