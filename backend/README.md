Medicare Backend (Node/Express + MongoDB)

Run locally
- cd into this folder: `cd backend`
- Install deps: `npm install`
- Create `.env` with:
  - `PORT=5000`
  - `JWT_SECRET=please_change_me`
  - `MONGODB_URI=mongodb://127.0.0.1:27017/medicare`
  - `TWILIO_ACCOUNT_SID=...` (optional, for SMS)
  - `TWILIO_AUTH_TOKEN=...` (optional)
  - `TWILIO_FROM_NUMBER=+1xxxxxxxxxx` (optional; your Twilio phone number)
  - `NOTIFY_TO_NUMBER=+1xxxxxxxxxx` (optional; your personal phone)
  - `OPENAI_API_KEY=...` (optional; for voice transcription)
- Start: `npm start` (or `node server.js`)
- Health check: GET `http://localhost:5000/health`

API
- POST `/api/auth/register` { email, password } (passwords are hashed)
- POST `/api/auth/login` { email, password } -> { token }
- GET `/api/doctors` (MongoDB, supports q, specialty, accepting)
- POST `/api/doctors` (admin)
- PUT `/api/doctors/:id` (admin)
- DELETE `/api/doctors/:id` (admin)
- GET `/api/appointments` (auth)
- POST `/api/appointments` { doctorId (Number), date, reason? } (auth)
- PUT `/api/appointments/:id` (auth)
- DELETE `/api/appointments/:id` (auth)
 - POST `/api/prescriptions/ocr` (auth, multipart/form-data; field `file`) -> `{ text }`
 - POST `/api/voice/transcribe` (auth, multipart/form-data; field `file`, requires OPENAI_API_KEY) -> `{ text }`

Notes:
- Doctors and users are stored in MongoDB; ambulance and location flows remain in-memory.
- To seed doctors from `data/doctors.json`, run the seed script (see below).
- If Twilio env vars are set, successful logins and appointment bookings will send an SMS to `NOTIFY_TO_NUMBER`.

Roles
- First registered user becomes `admin` automatically.
- Admin can create/update/delete doctors.

Doctor fields you can customize
- `id` (Number), `name` (String), `specialty` (String), `rating` (Number), `experience` (Number), `location` (String), `languages` (String[]), `acceptingNew` (Boolean), `fees` (Number), `clinicHours` (String), `images` (String[])

Seeding doctors
- `node scripts/seedDoctors.js`

