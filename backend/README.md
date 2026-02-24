Medicare Backend (Node/Express + MongoDB)

Run locally
- cd into this folder: `cd backend`
- Install deps: `npm install`
- Create `.env` from template: `cp .env.example .env`
- Update `.env` values:
  - `PORT=5000`
  - `JWT_SECRET=please_change_me`
  - `MONGODB_URI=mongodb://127.0.0.1:27017/medicare` (or Atlas URI)
  - `USE_IN_MEMORY_DB=false` (set `true` only for fallback development mode)
  - `FORCE_HTTPS=false` (set `true` behind HTTPS proxy in production)
  - `GOOGLE_CLIENT_ID=...` (optional; for Google Sign-In)
  - `TWILIO_ACCOUNT_SID=...` (optional, for SMS)
  - `TWILIO_AUTH_TOKEN=...` (optional)
  - `TWILIO_FROM_NUMBER=+1xxxxxxxxxx` (optional; your Twilio phone number)
  - `TWILIO_VERIFY_SERVICE_SID=...` (optional)
  - `NOTIFY_TO_NUMBER=+1xxxxxxxxxx` (optional; your personal phone)
  - `GEMINI_API_KEY=...` (optional; for voice transcription / AI assistant)
  - `SMTP_*` and `EMAIL_TO` (optional; for email notifications)
- Start: `npm start` (or `node server.js`)
- Health check: GET `http://localhost:5000/health`

API
- POST `/api/auth/register` { email, password } (passwords are hashed)
- POST `/api/auth/login` { email, password } -> { token }
- POST `/api/auth/google` { credential } -> { token }
- GET `/api/doctors` (MongoDB, supports q, specialty, accepting)
- POST `/api/doctors` (admin)
- PUT `/api/doctors/:id` (admin)
- DELETE `/api/doctors/:id` (admin)
- GET `/api/appointments` (auth)
  - Optional pagination query: `?page=1&limit=20&meta=true`
- POST `/api/appointments` { doctorId (Number), date, reason? } (auth)
- PUT `/api/appointments/:id` (auth)
- DELETE `/api/appointments/:id` (auth)
  - Doctor/admin can set `status=completed` to close booking after consultation.
 - POST `/api/prescriptions/ocr` (auth, multipart/form-data; field `file`) -> `{ text }`
 - POST `/api/voice/transcribe` (auth, multipart/form-data; field `file`, requires `GEMINI_API_KEY`) -> `{ text }`
- GET `/api/doctor/dashboard` (doctor auth)
  - Optional pagination query: `?appointmentsPage=1&appointmentsLimit=20&txPage=1&txLimit=20`
- GET `/api/pharmacy/products` (public; supports `q`, `category`, `inStock`, `prescription`)
- GET `/api/pharmacy/admin/products` (admin; supports `q`, `category`, `active`, `inStock`, `prescription`, paginated)
- POST `/api/pharmacy/products` (admin)
- PUT `/api/pharmacy/products/:id` (admin)
- POST `/api/pharmacy/orders` (auth; body: `{ items: [{ productId, qty }], notes?, deliveryAddress? }`)
- GET `/api/pharmacy/orders` (auth; paginated)
- POST `/api/pharmacy/orders/:id/cancel` (auth; owner/admin)
- PUT `/api/pharmacy/orders/:id/status` (admin)
- WebSocket signaling on `/socket.io` (auth required, JWT in socket auth token)
- GET `/api/telemedicine/ice-servers` (auth; returns STUN/TURN config for WebRTC)
- GET `/api/telemedicine/appointments` (auth; appointment list for telemedicine room authorization)
- GET `/api/telemedicine/appointments/:appointmentId/messages` (auth; chat/care-point history)
- POST `/api/telemedicine/appointments/:appointmentId/messages` (auth; save chat/care-point message)

Notes:
- Doctors and users are stored in MongoDB; ambulance and location flows remain in-memory.
- To seed doctors from `data/doctors.json`, run the seed script (see below).
- If Twilio env vars are set, successful logins and appointment bookings will send an SMS to `NOTIFY_TO_NUMBER`.

Roles
- First registered user becomes `admin` automatically.
- Admin can create/update/delete doctors.
- Admin can manage pharmacy products and update pharmacy order status.

Telemedicine (WebRTC signaling)
- Frontend page: `/telemedicine`
- Select the same booked appointment in two authorized participant accounts.
- Socket events used: `join-room`, `offer`, `answer`, `ice-candidate`, `end-call`, `leave-room`.
- `join-room` requires `appointmentId` and backend verifies caller access.
- Telemedicine events are logged in MongoDB collection `telemedicineevents`.
- Phase 4 UX additions:
  - Reconnect-aware signaling flow with timeline events.
  - Device permission diagnostics (camera/mic denied or unavailable).
  - Live call quality panel (RTT and packet loss from WebRTC stats).
  - In-call chat between doctor and patient with persisted message history.
  - Doctor-only care-point notes to share important post-call instructions.
  - Doctor/admin can complete booking after consultation.
- Phase 2 env vars:
  - `TELEMEDICINE_STUN_SERVERS` (comma-separated, defaults to Google STUN)
  - `TELEMEDICINE_TURN_SERVERS` (comma-separated)
  - `TELEMEDICINE_TURN_USERNAME`
  - `TELEMEDICINE_TURN_CREDENTIAL`

Doctor fields you can customize
- `id` (Number), `name` (String), `specialty` (String), `rating` (Number), `experience` (Number), `location` (String), `languages` (String[]), `acceptingNew` (Boolean), `fees` (Number), `clinicHours` (String), `images` (String[])

Seeding doctors
- `node scripts/seedDoctors.js`
