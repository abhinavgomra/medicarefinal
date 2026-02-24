import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { Card, CardContent, CardTitle } from '../components/Card';
import { Button } from '../components/Button';
import { PageTransition } from '../components/PageTransition';
import {
  createTelemedicineMessage,
  getTelemedicineAppointments,
  getTelemedicineIceServers,
  getTelemedicineMessages,
  updateAppointment
} from '../utils/api';
import { getToken, getTokenPayload } from '../utils/auth';
import {
  ArrowPathIcon,
  ChatBubbleLeftRightIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  PaperAirplaneIcon,
  PhoneXMarkIcon,
  VideoCameraIcon
} from '@heroicons/react/24/outline';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000';
const DEFAULT_ICE_SERVERS = [{ urls: ['stun:stun.l.google.com:19302'] }];
const CONNECT_TIMEOUT_MS = 20000;
const STATS_POLL_INTERVAL_MS = 5000;

function formatCallTime(seconds) {
  const total = Number(seconds || 0);
  const mins = String(Math.floor(total / 60)).padStart(2, '0');
  const secs = String(total % 60).padStart(2, '0');
  return `${mins}:${secs}`;
}

function toMessage(error, fallback) {
  if (!error) return fallback;
  if (typeof error === 'string') return error;
  if (error?.message) return error.message;
  return fallback;
}

function nowLabel() {
  return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function qualityFromStats(rttMs, lossPct) {
  if (rttMs == null || lossPct == null) return 'unknown';
  if (rttMs < 150 && lossPct < 2) return 'excellent';
  if (rttMs < 300 && lossPct < 5) return 'good';
  if (rttMs < 500 && lossPct < 10) return 'fair';
  return 'poor';
}

function formatAppointmentOption(item, role) {
  const dateLabel = item?.date || (item?.appointmentDate ? new Date(item.appointmentDate).toLocaleString() : 'No date');
  if (role === 'doctor') {
    return `${dateLabel} • ${item?.patientEmail || 'Patient'} • ${item?.status || 'booked'}`;
  }
  return `${dateLabel} • ${item?.doctorName || `Doctor #${item?.doctorId || ''}`} • ${item?.status || 'booked'}`;
}

function formatQualityLabel(label) {
  const normalized = String(label || 'unknown').toLowerCase();
  if (normalized === 'excellent') return 'Excellent';
  if (normalized === 'good') return 'Good';
  if (normalized === 'fair') return 'Fair';
  if (normalized === 'poor') return 'Poor';
  return 'Unknown';
}

const Telemedicine = () => {
  const tokenPayload = getTokenPayload() || {};
  const userRole = tokenPayload.role || 'user';
  const userEmail = String(tokenPayload.email || '').toLowerCase();

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const socketRef = useRef(null);
  const peerRef = useRef(null);
  const localStreamRef = useRef(null);
  const pendingCandidatesRef = useRef([]);
  const remoteSocketIdRef = useRef('');
  const roomIdRef = useRef('');
  const appointmentIdRef = useRef('');
  const connectTimeoutRef = useRef(null);
  const statsPollRef = useRef(null);
  const iceServersRef = useRef(DEFAULT_ICE_SERVERS);

  const [appointments, setAppointments] = useState([]);
  const [loadingAppointments, setLoadingAppointments] = useState(false);
  const [selectedAppointmentId, setSelectedAppointmentId] = useState('');

  const [joined, setJoined] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('idle');
  const [iceState, setIceState] = useState('new');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [callSeconds, setCallSeconds] = useState(0);
  const [remoteConnected, setRemoteConnected] = useState(false);
  const [hasTurn, setHasTurn] = useState(false);
  const [mediaState, setMediaState] = useState('idle');
  const [callQuality, setCallQuality] = useState({
    label: 'unknown',
    rttMs: null,
    lossPct: null,
    jitterMs: null
  });
  const [sessionEvents, setSessionEvents] = useState([]);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [carePointInput, setCarePointInput] = useState('');
  const [sendingChat, setSendingChat] = useState(false);
  const [completingAppointment, setCompletingAppointment] = useState(false);

  const selectedAppointment = useMemo(
    () => appointments.find((a) => a.id === selectedAppointmentId) || null,
    [appointments, selectedAppointmentId]
  );

  const clearConnectTimeout = useCallback(() => {
    if (!connectTimeoutRef.current) return;
    clearTimeout(connectTimeoutRef.current);
    connectTimeoutRef.current = null;
  }, []);

  const stopStatsPolling = useCallback(() => {
    if (!statsPollRef.current) return;
    clearInterval(statsPollRef.current);
    statsPollRef.current = null;
  }, []);

  const pushSessionEvent = useCallback((message) => {
    const text = String(message || '').trim();
    if (!text) return;
    setSessionEvents((prev) => [`${nowLabel()} - ${text}`, ...prev].slice(0, 6));
  }, []);

  const resetCallQuality = useCallback(() => {
    setCallQuality({
      label: 'unknown',
      rttMs: null,
      lossPct: null,
      jitterMs: null
    });
  }, []);

  const upsertChatMessage = useCallback((message) => {
    if (!message || !message.id) return;
    setChatMessages((prev) => {
      const existingIdx = prev.findIndex((m) => m.id === message.id);
      if (existingIdx >= 0) {
        const next = [...prev];
        next[existingIdx] = message;
        return next;
      }
      return [...prev, message];
    });
  }, []);

  const loadChatHistory = useCallback(async (appointmentId) => {
    const id = String(appointmentId || '').trim();
    if (!id) {
      setChatMessages([]);
      return;
    }
    try {
      const res = await getTelemedicineMessages(id, { limit: 200 });
      const items = Array.isArray(res?.items) ? res.items : [];
      setChatMessages(items);
    } catch (_) {
      setChatMessages([]);
    }
  }, []);

  const refreshCallQuality = useCallback(async () => {
    const pc = peerRef.current;
    if (!pc || typeof pc.getStats !== 'function') return;

    try {
      const stats = await pc.getStats();
      let rttMs = null;
      let jitterMs = null;
      let packetsLost = 0;
      let packetsReceived = 0;

      stats.forEach((report) => {
        if (
          report.type === 'candidate-pair' &&
          report.state === 'succeeded' &&
          (report.selected || report.nominated)
        ) {
          if (typeof report.currentRoundTripTime === 'number') {
            rttMs = Math.round(report.currentRoundTripTime * 1000);
          }
        }

        if (
          report.type === 'inbound-rtp' &&
          !report.isRemote &&
          (report.kind === 'video' || report.kind === 'audio' || report.mediaType === 'video' || report.mediaType === 'audio')
        ) {
          packetsLost += Number(report.packetsLost || 0);
          packetsReceived += Number(report.packetsReceived || 0);
          if (typeof report.jitter === 'number') {
            jitterMs = Math.round(report.jitter * 1000);
          }
        }
      });

      const totalPackets = packetsLost + packetsReceived;
      const lossPct = totalPackets > 0 ? Number(((packetsLost / totalPackets) * 100).toFixed(1)) : null;

      setCallQuality({
        label: qualityFromStats(rttMs, lossPct),
        rttMs,
        lossPct,
        jitterMs
      });
    } catch (_) {}
  }, []);

  const scheduleConnectTimeout = useCallback(() => {
    clearConnectTimeout();
    connectTimeoutRef.current = setTimeout(() => {
      const pc = peerRef.current;
      if (!pc) return;
      if (!['new', 'connecting'].includes(pc.connectionState)) return;

      setConnectionStatus('failed');
      setError(
        hasTurn
          ? 'Connection timed out. Retry the call or switch network.'
          : 'Connection timed out. TURN is not configured, so some networks will fail.'
      );
    }, CONNECT_TIMEOUT_MS);
  }, [clearConnectTimeout, hasTurn]);

  const stopPeer = useCallback(() => {
    clearConnectTimeout();
    stopStatsPolling();
    if (peerRef.current) {
      try {
        peerRef.current.onicecandidate = null;
        peerRef.current.ontrack = null;
        peerRef.current.onconnectionstatechange = null;
        peerRef.current.oniceconnectionstatechange = null;
        peerRef.current.close();
      } catch (_) {}
    }
    peerRef.current = null;
    remoteSocketIdRef.current = '';
    pendingCandidatesRef.current = [];
    setRemoteConnected(false);
    setCallSeconds(0);
    setIceState('new');
    resetCallQuality();
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
  }, [clearConnectTimeout, resetCallQuality, stopStatsPolling]);

  const stopLocalMedia = useCallback(() => {
    if (!localStreamRef.current) return;
    localStreamRef.current.getTracks().forEach((track) => {
      try {
        track.stop();
      } catch (_) {}
    });
    localStreamRef.current = null;
    setIsMuted(false);
    setIsCameraOff(false);
    setMediaState('idle');
    if (localVideoRef.current) localVideoRef.current.srcObject = null;
  }, []);

  const cleanSocket = useCallback(() => {
    if (!socketRef.current) return;
    try {
      socketRef.current.removeAllListeners();
      socketRef.current.disconnect();
    } catch (_) {}
    socketRef.current = null;
  }, []);

  const flushPendingCandidates = useCallback(async () => {
    const pc = peerRef.current;
    if (!pc || !pc.remoteDescription || pendingCandidatesRef.current.length === 0) return;
    const queue = [...pendingCandidatesRef.current];
    pendingCandidatesRef.current = [];
    for (const candidate of queue) {
      try {
        await pc.addIceCandidate(candidate);
      } catch (_) {}
    }
  }, []);

  const ensureLocalMedia = useCallback(async () => {
    if (localStreamRef.current) return localStreamRef.current;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      localStreamRef.current = stream;
      setMediaState('granted');
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;
      return stream;
    } catch (err) {
      const code = String(err?.name || '');
      if (code === 'NotAllowedError' || code === 'SecurityError') {
        setMediaState('denied');
        throw new Error('Camera or microphone access denied. Please allow permissions and retry.');
      }
      if (code === 'NotFoundError' || code === 'DevicesNotFoundError') {
        setMediaState('missing_device');
        throw new Error('Camera or microphone device not found on this system.');
      }
      setMediaState('error');
      throw err;
    }
  }, []);

  const loadAppointments = useCallback(async () => {
    setLoadingAppointments(true);
    try {
      const res = await getTelemedicineAppointments({ page: 1, limit: 50, status: 'booked' });
      const items = Array.isArray(res?.items) ? res.items : [];
      setAppointments(items);
      if (items.length > 0) {
        setSelectedAppointmentId((prev) => (items.some((a) => a.id === prev) ? prev : items[0].id));
      } else {
        setSelectedAppointmentId('');
      }
    } catch (err) {
      setError(toMessage(err, 'Failed to load appointments for telemedicine.'));
      setAppointments([]);
      setSelectedAppointmentId('');
    } finally {
      setLoadingAppointments(false);
    }
  }, []);

  const loadIceServers = useCallback(async () => {
    try {
      const res = await getTelemedicineIceServers();
      const servers = Array.isArray(res?.iceServers) && res.iceServers.length ? res.iceServers : DEFAULT_ICE_SERVERS;
      iceServersRef.current = servers;
      setHasTurn(Boolean(res?.hasTurn));
      if (!res?.hasTurn) {
        setNotice('TURN not configured yet. Local and some internet networks may fail.');
      } else {
        setNotice('TURN configured. Improved NAT traversal is active.');
      }
      return servers;
    } catch (_err) {
      iceServersRef.current = DEFAULT_ICE_SERVERS;
      setHasTurn(false);
      setNotice('Using fallback STUN only. Configure TURN for reliable internet calls.');
      return DEFAULT_ICE_SERVERS;
    }
  }, []);

  const emitWithAck = useCallback((event, payload) => {
    return new Promise((resolve, reject) => {
      if (!socketRef.current) {
        reject(new Error('socket_not_connected'));
        return;
      }
      socketRef.current.emit(event, payload, (ack) => {
        if (ack?.ok) {
          resolve(ack);
          return;
        }
        reject(new Error(ack?.error || `failed_${event}`));
      });
    });
  }, []);

  const createPeerConnection = useCallback((targetSocketId) => {
    stopPeer();
    remoteSocketIdRef.current = targetSocketId;

    const pc = new RTCPeerConnection({
      iceServers: iceServersRef.current,
      iceCandidatePoolSize: 10
    });
    peerRef.current = pc;

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => pc.addTrack(track, localStreamRef.current));
    }

    pc.ontrack = (event) => {
      const [remoteStream] = event.streams || [];
      if (remoteStream && remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = remoteStream;
      }
    };

    pc.onicecandidate = (event) => {
      if (!event.candidate || !socketRef.current || !roomIdRef.current || !remoteSocketIdRef.current) return;
      socketRef.current.emit('ice-candidate', {
        roomId: roomIdRef.current,
        targetSocketId: remoteSocketIdRef.current,
        candidate: event.candidate
      });
    };

    pc.oniceconnectionstatechange = () => {
      setIceState(pc.iceConnectionState || 'new');
    };

    pc.onconnectionstatechange = () => {
      const state = pc.connectionState;
      if (state === 'connected') {
        clearConnectTimeout();
        setConnectionStatus('connected');
        setRemoteConnected(true);
        setError('');
        pushSessionEvent('Call connected.');
      } else if (state === 'connecting') {
        setConnectionStatus('connecting');
      } else if (state === 'failed') {
        clearConnectTimeout();
        setConnectionStatus('failed');
        setError('Peer connection failed. Use Retry Connection.');
        pushSessionEvent('Connection failed.');
      } else if (state === 'disconnected' || state === 'closed') {
        clearConnectTimeout();
        setConnectionStatus('waiting');
        setRemoteConnected(false);
        setCallSeconds(0);
        pushSessionEvent('Connection dropped. Waiting for participant.');
        if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
      }
    };

    return pc;
  }, [clearConnectTimeout, pushSessionEvent, stopPeer]);

  const sendOffer = useCallback(async (targetSocketId, { iceRestart = false } = {}) => {
    if (!socketRef.current || !roomIdRef.current) throw new Error('not_ready_to_send_offer');
    let pc = peerRef.current;
    if (!pc || pc.connectionState === 'closed') {
      pc = createPeerConnection(targetSocketId);
    } else {
      remoteSocketIdRef.current = targetSocketId;
    }

    const offer = await pc.createOffer(iceRestart ? { iceRestart: true } : undefined);
    await pc.setLocalDescription(offer);
    await emitWithAck('offer', {
      roomId: roomIdRef.current,
      targetSocketId,
      offer
    });
    setConnectionStatus('connecting');
    scheduleConnectTimeout();
  }, [createPeerConnection, emitWithAck, scheduleConnectTimeout]);

  const leaveRoom = useCallback(() => {
    if (socketRef.current && roomIdRef.current) {
      socketRef.current.emit('leave-room', { roomId: roomIdRef.current });
    }
    roomIdRef.current = '';
    appointmentIdRef.current = '';
    setJoined(false);
    setConnectionStatus('idle');
    setError('');
    setNotice('');
    setMediaState('idle');
    setChatInput('');
    setCarePointInput('');
    setSendingChat(false);
    stopPeer();
    stopLocalMedia();
    cleanSocket();
  }, [cleanSocket, stopLocalMedia, stopPeer]);

  useEffect(() => {
    loadAppointments();
  }, [loadAppointments]);

  useEffect(() => {
    if (!selectedAppointmentId) {
      setChatMessages([]);
      return;
    }
    loadChatHistory(selectedAppointmentId);
  }, [loadChatHistory, selectedAppointmentId]);

  useEffect(() => {
    if (!remoteConnected) return undefined;
    const id = setInterval(() => setCallSeconds((v) => v + 1), 1000);
    return () => clearInterval(id);
  }, [remoteConnected]);

  useEffect(() => {
    if (joined) return undefined;
    const id = setInterval(() => {
      loadAppointments().catch(() => {});
    }, 30000);
    return () => clearInterval(id);
  }, [joined, loadAppointments]);

  useEffect(() => {
    if (!remoteConnected) {
      stopStatsPolling();
      resetCallQuality();
      return undefined;
    }
    refreshCallQuality();
    stopStatsPolling();
    statsPollRef.current = setInterval(() => {
      refreshCallQuality();
    }, STATS_POLL_INTERVAL_MS);
    return () => stopStatsPolling();
  }, [refreshCallQuality, remoteConnected, resetCallQuality, stopStatsPolling]);

  useEffect(() => () => {
    leaveRoom();
  }, [leaveRoom]);

  const handleJoinRoom = async () => {
    setError('');
    setNotice('');
    setSessionEvents([]);

    if (joined) {
      setError('You are already in a call session. Leave first.');
      return;
    }

    const appointmentId = String(selectedAppointmentId || '').trim();
    if (!appointmentId) {
      setError('Please select an appointment first.');
      return;
    }

    const token = getToken();
    if (!token) {
      setError('Please login first.');
      return;
    }
    if (!window.RTCPeerConnection) {
      setError('This browser does not support WebRTC.');
      return;
    }

    setIsConnecting(true);
    try {
      await ensureLocalMedia();
      await loadIceServers();

      const socket = io(API_BASE_URL, {
        auth: { token },
        reconnection: true,
        reconnectionAttempts: 8,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        timeout: 10000
      });
      socketRef.current = socket;

      socket.on('connect_error', (err) => {
        setError(`Socket connection failed: ${toMessage(err, 'unknown error')}`);
        setConnectionStatus('failed');
        pushSessionEvent('Socket connection failed.');
      });

      socket.io.on('reconnect', () => {
        if (!appointmentIdRef.current) return;
        socket.emit('join-room', { appointmentId: appointmentIdRef.current }, async (ack) => {
          if (!ack?.ok) {
            setError('Rejoin failed after reconnect.');
            setConnectionStatus('failed');
            pushSessionEvent('Rejoin after reconnect failed.');
            return;
          }
          setConnectionStatus('waiting');
          roomIdRef.current = ack.roomId;
          pushSessionEvent('Rejoined appointment room after reconnect.');
          if (Array.isArray(ack.participants) && ack.participants.length > 0) {
            try {
              await sendOffer(ack.participants[0].socketId, { iceRestart: true });
            } catch (err) {
              setError(toMessage(err, 'Failed to renegotiate after reconnect.'));
            }
          }
        });
      });

      socket.io.on('reconnect_attempt', () => {
        if (appointmentIdRef.current) {
          setConnectionStatus('reconnecting');
          pushSessionEvent('Attempting to reconnect signaling...');
        }
      });

      socket.on('participant-joined', async ({ socketId }) => {
        try {
          if (!socketId) return;
          pushSessionEvent('Participant joined room.');
          if (peerRef.current && peerRef.current.connectionState !== 'closed') return;
          await sendOffer(socketId);
        } catch (err) {
          setError(toMessage(err, 'Failed to create offer.'));
        }
      });

      socket.on('offer', async ({ fromSocketId, offer }) => {
        try {
          if (!fromSocketId || !offer) return;
          const pc = createPeerConnection(fromSocketId);
          await pc.setRemoteDescription(new RTCSessionDescription(offer));
          await flushPendingCandidates();
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          await emitWithAck('answer', {
            roomId: roomIdRef.current,
            targetSocketId: fromSocketId,
            answer
          });
          setConnectionStatus('connecting');
          scheduleConnectTimeout();
        } catch (err) {
          setError(toMessage(err, 'Failed to answer incoming call.'));
        }
      });

      socket.on('answer', async ({ fromSocketId, answer }) => {
        try {
          if (!answer || fromSocketId !== remoteSocketIdRef.current || !peerRef.current) return;
          await peerRef.current.setRemoteDescription(new RTCSessionDescription(answer));
          await flushPendingCandidates();
        } catch (err) {
          setError(toMessage(err, 'Failed to process answer.'));
        }
      });

      socket.on('ice-candidate', async ({ fromSocketId, candidate }) => {
        if (!candidate) return;
        try {
          const iceCandidate = new RTCIceCandidate(candidate);
          if (!remoteSocketIdRef.current) remoteSocketIdRef.current = fromSocketId;
          if (peerRef.current && peerRef.current.remoteDescription) {
            await peerRef.current.addIceCandidate(iceCandidate);
            return;
          }
          pendingCandidatesRef.current.push(iceCandidate);
        } catch (_) {}
      });

      socket.on('chat-message', (message) => {
        if (!message) return;
        if (String(message.appointmentId || '') !== String(appointmentIdRef.current || selectedAppointmentId || '')) return;
        upsertChatMessage(message);
        if (message.messageType === 'care-point') {
          pushSessionEvent('New care-point shared in chat.');
        }
      });

      socket.on('participant-left', ({ socketId }) => {
        if (!socketId || socketId !== remoteSocketIdRef.current) return;
        stopPeer();
        setConnectionStatus('waiting');
        pushSessionEvent('Participant left room.');
      });

      socket.on('call-ended', ({ fromSocketId }) => {
        if (!fromSocketId || fromSocketId !== remoteSocketIdRef.current) return;
        stopPeer();
        setConnectionStatus('waiting');
        pushSessionEvent('Remote participant ended the call.');
      });

      socket.on('disconnect', () => {
        if (!appointmentIdRef.current) return;
        stopPeer();
        setConnectionStatus('disconnected');
        pushSessionEvent('Socket disconnected.');
      });

      const ack = await new Promise((resolve, reject) => {
        socket.emit('join-room', { appointmentId }, (response) => {
          if (response?.ok) {
            resolve(response);
            return;
          }
          reject(new Error(response?.error || 'failed_to_join_room'));
        });
      });

      appointmentIdRef.current = appointmentId;
      roomIdRef.current = ack.roomId;
      setJoined(true);
      pushSessionEvent('Joined appointment room.');
      await loadChatHistory(appointmentId);
      if (Array.isArray(ack.participants) && ack.participants.length > 0) {
        await sendOffer(ack.participants[0].socketId);
      } else {
        setConnectionStatus('waiting');
        pushSessionEvent('Waiting for second participant.');
      }
    } catch (err) {
      setError(toMessage(err, 'Failed to initialize call session.'));
      setConnectionStatus('failed');
      stopLocalMedia();
      cleanSocket();
      pushSessionEvent('Failed to initialize call.');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleEndCall = () => {
    if (socketRef.current && roomIdRef.current) {
      socketRef.current.emit('end-call', { roomId: roomIdRef.current });
    }
    stopPeer();
    pushSessionEvent('You ended the call.');
    if (joined) setConnectionStatus('waiting');
  };

  const handleRetryConnection = async () => {
    setError('');
    if (!joined) {
      setError('Join an appointment room first.');
      return;
    }
    if (!remoteSocketIdRef.current) {
      setError('No remote participant in this appointment room yet.');
      return;
    }
    try {
      if (!localStreamRef.current) await ensureLocalMedia();
      if (!peerRef.current || peerRef.current.connectionState === 'closed') {
        createPeerConnection(remoteSocketIdRef.current);
      }
      await sendOffer(remoteSocketIdRef.current, { iceRestart: true });
      setNotice('ICE restart sent. Waiting for reconnection...');
      pushSessionEvent('ICE restart requested.');
    } catch (err) {
      setError(toMessage(err, 'Failed to retry connection.'));
    }
  };

  const toggleMute = () => {
    if (!localStreamRef.current) return;
    const nextMuted = !isMuted;
    localStreamRef.current.getAudioTracks().forEach((track) => {
      track.enabled = !nextMuted;
    });
    setIsMuted(nextMuted);
  };

  const toggleCamera = () => {
    if (!localStreamRef.current) return;
    const nextCameraOff = !isCameraOff;
    localStreamRef.current.getVideoTracks().forEach((track) => {
      track.enabled = !nextCameraOff;
    });
    setIsCameraOff(nextCameraOff);
  };

  const sendChatMessage = async (messageType = 'chat') => {
    const type = messageType === 'care-point' ? 'care-point' : 'chat';
    const inputValue = type === 'care-point' ? carePointInput : chatInput;
    const text = String(inputValue || '').trim();
    if (!text) {
      setError(type === 'care-point' ? 'Enter a care-point before sending.' : 'Enter a chat message before sending.');
      return;
    }
    if (type === 'care-point' && !['doctor', 'admin'].includes(userRole)) {
      setError('Only doctor accounts can send care-points.');
      return;
    }

    const appointmentId = appointmentIdRef.current || selectedAppointmentId;
    if (!appointmentId) {
      setError('Select an appointment first.');
      return;
    }

    setError('');
    setSendingChat(true);
    try {
      let sentMessage = null;

      if (joined && socketRef.current && roomIdRef.current) {
        sentMessage = await new Promise((resolve, reject) => {
          socketRef.current.emit(
            'chat-message',
            { roomId: roomIdRef.current, messageType: type, text },
            (ack) => {
              if (ack?.ok) {
                resolve(ack.message || null);
                return;
              }
              reject(new Error(ack?.error || 'failed_to_send_chat_message'));
            }
          );
        });
      } else {
        sentMessage = await createTelemedicineMessage(appointmentId, {
          type,
          text,
          roomId: roomIdRef.current || `appointment:${appointmentId}`
        });
      }

      if (sentMessage) upsertChatMessage(sentMessage);
      if (type === 'care-point') {
        setCarePointInput('');
        pushSessionEvent('Care-point shared.');
      } else {
        setChatInput('');
      }
    } catch (err) {
      setError(toMessage(err, 'Failed to send chat message.'));
    } finally {
      setSendingChat(false);
    }
  };

  const handleCompleteAppointment = async () => {
    if (!selectedAppointment?.id) {
      setError('Select an appointment first.');
      return;
    }
    if (!['doctor', 'admin'].includes(userRole)) {
      setError('Only doctor can end this appointment.');
      return;
    }

    setCompletingAppointment(true);
    setError('');
    try {
      await updateAppointment(selectedAppointment.id, { status: 'completed' });
      pushSessionEvent('Appointment ended and marked completed.');

      if (joined && socketRef.current && roomIdRef.current) {
        socketRef.current.emit('end-call', { roomId: roomIdRef.current });
      }
      leaveRoom();
      setSelectedAppointmentId('');
      setChatMessages([]);
      await loadAppointments();
      setNotice('Appointment ended successfully.');
    } catch (err) {
      setError(toMessage(err, 'Failed to close appointment.'));
    } finally {
      setCompletingAppointment(false);
    }
  };

  return (
    <PageTransition>
      <div className="min-h-screen py-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-slate-900">Telemedicine Video Call</h1>
              <p className="text-slate-600 mt-1">
                Phase 4: resilient consultation UX with secure appointment access, reconnect, and live call diagnostics.
              </p>
            </div>
            <div className="hidden md:flex items-center gap-2 text-sm text-slate-600 bg-slate-100 px-3 py-2 rounded-lg">
              <InformationCircleIcon className="h-5 w-5" />
              Status: <span className="font-semibold capitalize">{connectionStatus}</span>
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-red-700 text-sm">
              <ExclamationTriangleIcon className="h-5 w-5" />
              {error}
            </div>
          )}

          {notice && (
            <div className="flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-blue-900 text-sm">
              <InformationCircleIcon className="h-5 w-5" />
              {notice}
            </div>
          )}

          <Card variant="glass">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <CardTitle>Select Appointment</CardTitle>
                <Button
                  variant="secondary"
                  onClick={loadAppointments}
                  loading={loadingAppointments}
                  disabled={loadingAppointments}
                  className="inline-flex items-center gap-2"
                >
                  <ArrowPathIcon className="h-5 w-5" />
                  Refresh
                </Button>
              </div>

              <div className="flex flex-col md:flex-row gap-3">
                <select
                  className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
                  value={selectedAppointmentId}
                  onChange={(e) => setSelectedAppointmentId(e.target.value)}
                  disabled={joined || loadingAppointments || appointments.length === 0}
                >
                  {appointments.length === 0 && <option value="">No booked appointments available</option>}
                  {appointments.map((item) => (
                    <option key={item.id} value={item.id}>
                      {formatAppointmentOption(item, userRole)}
                    </option>
                  ))}
                </select>

                {!joined ? (
                  <Button
                    onClick={handleJoinRoom}
                    loading={isConnecting}
                    disabled={isConnecting || loadingAppointments || !selectedAppointmentId}
                  >
                    Join Appointment
                  </Button>
                ) : (
                  <Button variant="secondary" onClick={leaveRoom}>
                    Leave Room
                  </Button>
                )}
              </div>

              {selectedAppointment && (
                <div className="mt-3 text-sm text-slate-600">
                  {userRole === 'doctor' ? (
                    <span>Patient: {selectedAppointment.patientEmail}</span>
                  ) : (
                    <span>Doctor: {selectedAppointment.doctorName} {selectedAppointment.doctorSpecialty ? `(${selectedAppointment.doctorSpecialty})` : ''}</span>
                  )}
                  <span className="mx-2">•</span>
                  <span>{selectedAppointment.date || (selectedAppointment.appointmentDate ? new Date(selectedAppointment.appointmentDate).toLocaleString() : 'No date')}</span>
                  {selectedAppointment.reason ? (
                    <>
                      <span className="mx-2">•</span>
                      <span>Reason: {selectedAppointment.reason}</span>
                    </>
                  ) : null}
                </div>
              )}

              <p className="text-xs text-slate-500 mt-2">
                Room access is restricted to authorized appointment participants only.
              </p>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <CardTitle>Local Video</CardTitle>
                  <span className="text-xs text-slate-500">{isCameraOff ? 'Camera Off' : 'Camera On'}</span>
                </div>
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full aspect-video rounded-lg bg-slate-900 object-cover"
                />
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <CardTitle>Remote Video</CardTitle>
                  <span className="text-xs text-slate-500">
                    {remoteConnected ? `Connected • ${formatCallTime(callSeconds)}` : 'Waiting for participant'}
                  </span>
                </div>
                <video
                  ref={remoteVideoRef}
                  autoPlay
                  playsInline
                  className="w-full aspect-video rounded-lg bg-slate-900 object-cover"
                />
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardContent className="p-4">
              <div className="flex flex-wrap items-center gap-3">
                <Button variant="secondary" onClick={toggleMute} disabled={!joined || !localStreamRef.current}>
                  {isMuted ? 'Unmute' : 'Mute'}
                </Button>
                <Button variant="secondary" onClick={toggleCamera} disabled={!joined || !localStreamRef.current}>
                  {isCameraOff ? 'Camera On' : 'Camera Off'}
                </Button>
                <Button
                  variant="secondary"
                  onClick={handleRetryConnection}
                  disabled={!joined}
                  className="inline-flex items-center gap-2"
                >
                  <ArrowPathIcon className="h-5 w-5" />
                  Retry Connection
                </Button>
                {['doctor', 'admin'].includes(userRole) && (
                  <Button
                    onClick={handleCompleteAppointment}
                    loading={completingAppointment}
                    disabled={completingAppointment || !selectedAppointmentId}
                    className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 focus:ring-emerald-600"
                  >
                    <CheckCircleIcon className="h-5 w-5" />
                    End Appointment
                  </Button>
                )}
                <Button
                  onClick={handleEndCall}
                  disabled={!joined || !remoteConnected}
                  className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 focus:ring-red-600"
                >
                  <PhoneXMarkIcon className="h-5 w-5" />
                  End Call
                </Button>
              </div>

              <div className="mt-4 grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3 text-sm">
                <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                  <div className="text-slate-500">Appointment ID</div>
                  <div className="font-semibold text-slate-900">{appointmentIdRef.current || '-'}</div>
                </div>
                <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                  <div className="text-slate-500">Peer Status</div>
                  <div className="font-semibold text-slate-900 capitalize">{connectionStatus}</div>
                </div>
                <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                  <div className="text-slate-500">ICE State</div>
                  <div className="font-semibold text-slate-900 capitalize">{iceState}</div>
                </div>
                <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                  <div className="text-slate-500">NAT Traversal</div>
                  <div className="font-semibold text-slate-900">{hasTurn ? 'TURN + STUN' : 'STUN only'}</div>
                </div>
                <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                  <div className="text-slate-500">Device Access</div>
                  <div className="font-semibold text-slate-900 capitalize">
                    {mediaState === 'granted' ? 'Granted' : mediaState === 'denied' ? 'Denied' : mediaState === 'missing_device' ? 'Missing Device' : mediaState}
                  </div>
                </div>
                <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                  <div className="text-slate-500">Call Quality</div>
                  <div className="font-semibold text-slate-900">
                    {formatQualityLabel(callQuality.label)}
                    {callQuality.rttMs != null ? ` • ${callQuality.rttMs}ms RTT` : ''}
                    {callQuality.lossPct != null ? ` • ${callQuality.lossPct}% loss` : ''}
                  </div>
                </div>
              </div>

              <div className="mt-4 rounded-lg border border-slate-200 bg-white px-3 py-2">
                <div className="text-slate-500 text-sm mb-2">Session Timeline</div>
                {sessionEvents.length === 0 ? (
                  <div className="text-slate-400 text-sm">No events yet.</div>
                ) : (
                  <ul className="space-y-1 text-sm text-slate-700">
                    {sessionEvents.map((eventText, idx) => (
                      <li key={`${eventText}-${idx}`}>{eventText}</li>
                    ))}
                  </ul>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <CardTitle className="inline-flex items-center gap-2">
                  <ChatBubbleLeftRightIcon className="h-5 w-5" />
                  Consultation Chat
                </CardTitle>
                <span className="text-xs text-slate-500">{chatMessages.length} messages</span>
              </div>

              <div className="rounded-lg border border-slate-200 bg-white p-3 h-64 overflow-y-auto space-y-2">
                {chatMessages.length === 0 ? (
                  <div className="text-slate-400 text-sm">No messages yet. Share updates or care instructions here.</div>
                ) : (
                  chatMessages.map((msg) => {
                    const mine = String(msg.senderEmail || '').toLowerCase() === userEmail;
                    const isCarePoint = msg.messageType === 'care-point';
                    return (
                      <div
                        key={msg.id}
                        className={`rounded-lg px-3 py-2 text-sm ${mine ? 'bg-primary-50 border border-primary-100' : 'bg-slate-50 border border-slate-200'} ${isCarePoint ? 'ring-1 ring-amber-300' : ''}`}
                      >
                        <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                          <span className="font-medium">
                            {mine ? 'You' : msg.senderEmail}
                            {isCarePoint ? ' • Care Point' : ''}
                          </span>
                          <span>{msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}</span>
                        </div>
                        <div className="text-slate-800">{msg.text}</div>
                      </div>
                    );
                  })
                )}
              </div>

              <div className="mt-3 flex flex-col gap-3">
                <div className="flex gap-2">
                  <input
                    type="text"
                    className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder={joined ? 'Type chat message...' : 'Join room to send live chat'}
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        sendChatMessage('chat');
                      }
                    }}
                  />
                  <Button
                    variant="secondary"
                    onClick={() => sendChatMessage('chat')}
                    disabled={sendingChat || !selectedAppointmentId}
                    className="inline-flex items-center gap-2"
                  >
                    <PaperAirplaneIcon className="h-5 w-5" />
                    Send
                  </Button>
                </div>

                {['doctor', 'admin'].includes(userRole) && (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      className="flex-1 px-3 py-2 border border-amber-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                      placeholder="Add important care-point for patient..."
                      value={carePointInput}
                      onChange={(e) => setCarePointInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          sendChatMessage('care-point');
                        }
                      }}
                    />
                    <Button
                      onClick={() => sendChatMessage('care-point')}
                      disabled={sendingChat || !selectedAppointmentId}
                      className="bg-amber-600 hover:bg-amber-700 focus:ring-amber-600"
                    >
                      Save Care Point
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900 flex items-start gap-2">
            <VideoCameraIcon className="h-5 w-5 shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold">Phase 4 implemented</div>
              <div>Includes secure call flow, in-call chat with care-points, doctor booking closure, and live connection diagnostics.</div>
            </div>
          </div>
        </div>
      </div>
    </PageTransition>
  );
};

export default Telemedicine;
