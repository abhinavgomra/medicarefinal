## Environment setup

Create the following .env files locally (do not commit secrets):

### Backend: `backend/.env`

```
PORT=5000
JWT_SECRET=dev_secret_key_change_me
MONGODB_URI=mongodb://127.0.0.1:27017/medicare
# Allow in-memory Mongo fallback if real DB is unavailable
USE_IN_MEMORY_DB=true

# Optional: Twilio (leave blank to disable SMS/Verify flows)
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_FROM_NUMBER=
TWILIO_VERIFY_SERVICE_SID=
NOTIFY_TO_NUMBER=

# Optional: Voice transcription (leave blank to disable)
GEMINI_API_KEY=

# Optional: SMTP for email notifications (leave blank to disable)
EMAIL_TO=abhinav.gomra@gmail.com
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
```

Notes:
- Voice transcription is disabled unless both `GEMINI_API_KEY` is set and the optional `gemini-api` library is installed.

### Frontend: `frontend/.env`

```
REACT_APP_API_BASE_URL=http://localhost:5000
```

### Start commands
- Backend: `cd backend && npm install && npm start`
- Frontend: `cd frontend && npm install && npm start`

