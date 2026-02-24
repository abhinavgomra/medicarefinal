const jwt = require('jsonwebtoken');
const { Server } = require('socket.io');
const env = require('../config/env');
const Appointment = require('../models/Appointment');
const TelemedicineEvent = require('../models/TelemedicineEvent');
const TelemedicineMessage = require('../models/TelemedicineMessage');

function normalizeRoomId(roomId) {
  return String(roomId || '').trim().toLowerCase().slice(0, 64);
}

function normalizeAppointmentId(value) {
  const id = String(value || '').trim();
  return /^[a-fA-F0-9]{24}$/.test(id) ? id : '';
}

function appointmentRoomId(appointmentId) {
  return `appointment:${appointmentId}`;
}

function normalizeMessageType(value) {
  const type = String(value || 'chat').trim().toLowerCase();
  return type === 'care-point' ? 'care-point' : 'chat';
}

function sanitizeMessageText(value) {
  const text = String(value || '').trim();
  if (!text) return '';
  return text.slice(0, 1000);
}

function canJoinAppointment(user, appointment) {
  if (!user || !appointment) return false;
  if (user.role === 'admin') return true;
  if (user.role === 'doctor') return Number(user.doctorId || 0) === Number(appointment.doctorId || -1);
  return String(user.email || '').toLowerCase() === String(appointment.createdBy || '').toLowerCase();
}

function logEvent(payload) {
  TelemedicineEvent.create(payload).catch(() => {});
}

function toPublicAppointment(appointment) {
  return {
    id: String(appointment._id),
    doctorId: Number(appointment.doctorId),
    date: appointment.date,
    appointmentDate: appointment.appointmentDate || null,
    status: appointment.status || 'booked',
    reason: appointment.reason || ''
  };
}

async function authorizeAppointmentJoin(user, appointmentId) {
  const appointment = await Appointment.findById(appointmentId).lean();
  if (!appointment) {
    return { ok: false, error: 'appointment_not_found' };
  }
  if (appointment.status !== 'booked') {
    return { ok: false, error: 'appointment_not_joinable' };
  }
  if (!canJoinAppointment(user, appointment)) {
    return { ok: false, error: 'appointment_access_denied' };
  }
  return { ok: true, appointment };
}

function authSocket(socket, next) {
  try {
    const authToken = socket.handshake?.auth?.token;
    const header = String(socket.handshake?.headers?.authorization || '');
    const bearerToken = header.startsWith('Bearer ') ? header.slice(7) : '';
    const token = authToken || bearerToken;

    if (!token) return next(new Error('unauthorized:missing_token'));

    const decoded = jwt.verify(token, env.JWT_SECRET);
    socket.user = {
      email: decoded.email || '',
      role: decoded.role || 'user',
      doctorId: decoded.doctorId || null
    };
    return next();
  } catch (_err) {
    return next(new Error('unauthorized:invalid_token'));
  }
}

function createCallSignaling(httpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST']
    }
  });

  io.use(authSocket);

  io.on('connection', (socket) => {
    let currentRoomId = '';
    let currentAppointmentId = '';

    const leaveCurrentRoom = (eventType = 'leave') => {
      if (!currentRoomId) return;
      const previousRoom = currentRoomId;
      const previousAppointmentId = currentAppointmentId;
      currentRoomId = '';
      currentAppointmentId = '';
      socket.leave(previousRoom);

      if (previousAppointmentId) {
        logEvent({
          appointmentId: previousAppointmentId,
          roomId: previousRoom,
          eventType,
          actorEmail: socket.user.email,
          actorRole: socket.user.role
        });
      }

      socket.to(previousRoom).emit('participant-left', {
        roomId: previousRoom,
        socketId: socket.id,
        email: socket.user.email,
        appointmentId: previousAppointmentId
      });
    };

    const targetInRoom = (targetSocketId, roomId) => {
      const room = io.sockets.adapter.rooms.get(roomId);
      return Boolean(room && room.has(targetSocketId));
    };

    socket.on('join-room', async (payload = {}, ack = () => {}) => {
      const appointmentId = normalizeAppointmentId(payload.appointmentId);
      if (!appointmentId) return ack({ ok: false, error: 'invalid_appointment_id' });

      try {
        const access = await authorizeAppointmentJoin(socket.user, appointmentId);
        if (!access.ok) return ack({ ok: false, error: access.error });

        const roomId = appointmentRoomId(appointmentId);
        leaveCurrentRoom('leave');

        const room = io.sockets.adapter.rooms.get(roomId);
        const roomSize = room ? room.size : 0;
        if (roomSize >= 2) return ack({ ok: false, error: 'room_full' });

        socket.join(roomId);
        currentRoomId = roomId;
        currentAppointmentId = appointmentId;

        const participants = [...(io.sockets.adapter.rooms.get(roomId) || [])]
          .filter((id) => id !== socket.id)
          .map((id) => {
            const peerSocket = io.sockets.sockets.get(id);
            return {
              socketId: id,
              email: peerSocket?.user?.email || '',
              role: peerSocket?.user?.role || 'user'
            };
          });

        ack({
          ok: true,
          roomId,
          appointment: toPublicAppointment(access.appointment),
          participants
        });

        socket.to(roomId).emit('participant-joined', {
          roomId,
          appointmentId,
          socketId: socket.id,
          email: socket.user.email,
          role: socket.user.role
        });

        logEvent({
          appointmentId,
          roomId,
          eventType: 'join',
          actorEmail: socket.user.email,
          actorRole: socket.user.role
        });
      } catch (_err) {
        return ack({ ok: false, error: 'join_room_failed' });
      }
    });

    socket.on('offer', (payload = {}, ack = () => {}) => {
      const roomId = normalizeRoomId(payload.roomId || currentRoomId);
      const targetSocketId = String(payload.targetSocketId || '').trim();
      if (!roomId || !targetSocketId || !payload.offer) {
        return ack({ ok: false, error: 'invalid_offer_payload' });
      }
      if (roomId !== currentRoomId) return ack({ ok: false, error: 'not_in_room' });
      if (!targetInRoom(targetSocketId, roomId)) return ack({ ok: false, error: 'target_not_in_room' });

      io.to(targetSocketId).emit('offer', {
        roomId,
        appointmentId: currentAppointmentId,
        fromSocketId: socket.id,
        offer: payload.offer
      });
      if (currentAppointmentId) {
        logEvent({
          appointmentId: currentAppointmentId,
          roomId,
          eventType: 'offer',
          actorEmail: socket.user.email,
          actorRole: socket.user.role,
          targetSocketId
        });
      }
      return ack({ ok: true });
    });

    socket.on('answer', (payload = {}, ack = () => {}) => {
      const roomId = normalizeRoomId(payload.roomId || currentRoomId);
      const targetSocketId = String(payload.targetSocketId || '').trim();
      if (!roomId || !targetSocketId || !payload.answer) {
        return ack({ ok: false, error: 'invalid_answer_payload' });
      }
      if (roomId !== currentRoomId) return ack({ ok: false, error: 'not_in_room' });
      if (!targetInRoom(targetSocketId, roomId)) return ack({ ok: false, error: 'target_not_in_room' });

      io.to(targetSocketId).emit('answer', {
        roomId,
        appointmentId: currentAppointmentId,
        fromSocketId: socket.id,
        answer: payload.answer
      });
      if (currentAppointmentId) {
        logEvent({
          appointmentId: currentAppointmentId,
          roomId,
          eventType: 'answer',
          actorEmail: socket.user.email,
          actorRole: socket.user.role,
          targetSocketId
        });
      }
      return ack({ ok: true });
    });

    socket.on('ice-candidate', (payload = {}, ack = () => {}) => {
      const roomId = normalizeRoomId(payload.roomId || currentRoomId);
      const targetSocketId = String(payload.targetSocketId || '').trim();
      if (!roomId || !targetSocketId || !payload.candidate) {
        return ack({ ok: false, error: 'invalid_ice_payload' });
      }
      if (roomId !== currentRoomId) return ack({ ok: false, error: 'not_in_room' });
      if (!targetInRoom(targetSocketId, roomId)) return ack({ ok: false, error: 'target_not_in_room' });

      io.to(targetSocketId).emit('ice-candidate', {
        roomId,
        fromSocketId: socket.id,
        candidate: payload.candidate
      });
      return ack({ ok: true });
    });

    socket.on('chat-message', async (payload = {}, ack = () => {}) => {
      const roomId = normalizeRoomId(payload.roomId || currentRoomId);
      if (!roomId || roomId !== currentRoomId || !currentAppointmentId) {
        return ack({ ok: false, error: 'not_in_room' });
      }

      const text = sanitizeMessageText(payload.text);
      if (!text) return ack({ ok: false, error: 'message_text_required' });
      const messageType = normalizeMessageType(payload.messageType);

      if (messageType === 'care-point' && !['doctor', 'admin'].includes(socket.user.role)) {
        return ack({ ok: false, error: 'care_point_doctor_only' });
      }

      try {
        const created = await TelemedicineMessage.create({
          appointmentId: currentAppointmentId,
          roomId,
          senderEmail: socket.user.email,
          senderRole: socket.user.role,
          messageType,
          text
        });

        const messagePayload = {
          id: String(created._id),
          appointmentId: String(created.appointmentId),
          roomId: created.roomId,
          senderEmail: created.senderEmail,
          senderRole: created.senderRole,
          messageType: created.messageType,
          text: created.text,
          createdAt: created.createdAt
        };

        io.to(roomId).emit('chat-message', messagePayload);
        return ack({ ok: true, message: messagePayload });
      } catch (_err) {
        return ack({ ok: false, error: 'chat_message_failed' });
      }
    });

    socket.on('end-call', (payload = {}, ack = () => {}) => {
      const roomId = normalizeRoomId(payload.roomId || currentRoomId);
      if (!roomId || roomId !== currentRoomId) return ack({ ok: false, error: 'not_in_room' });
      socket.to(roomId).emit('call-ended', {
        roomId,
        appointmentId: currentAppointmentId,
        fromSocketId: socket.id
      });
      if (currentAppointmentId) {
        logEvent({
          appointmentId: currentAppointmentId,
          roomId,
          eventType: 'end',
          actorEmail: socket.user.email,
          actorRole: socket.user.role
        });
      }
      return ack({ ok: true });
    });

    socket.on('leave-room', (_payload = {}, ack = () => {}) => {
      leaveCurrentRoom('leave');
      return ack({ ok: true });
    });

    socket.on('disconnect', () => {
      leaveCurrentRoom('disconnect');
    });
  });

  return io;
}

module.exports = { createCallSignaling };
