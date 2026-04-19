# OptiGuard (Your Portion) — Dashboard + Diagnostics + Donation (Frontend + Backend)

This zip contains a **working demo full-stack setup** for your 3 pages:
- Dashboard (`frontend/dashboard.html`)
- Diagnostics (`frontend/diagnostics.html`)
- Donation (`frontend/donation.html`)

Right now it runs in **Mock Mode**:
- Backend returns demo JSON (no DB yet)
- Diagnostics upload returns demo risk score (no ML yet)
- Chatbot returns demo reply (no AI agent yet)

This is Step 1: **Make your pages run perfectly on your device** before connecting to your teammates' DB/auth/ML.

---

## ✅ Requirements
- Node.js installed (v16+ recommended)
- VS Code
- (Option A) VS Code extension **Live Server** OR (Option B) Python installed for a simple static server

---

## ✅ Step 1 — Run Backend
1. Open VS Code and open the folder: `optiguard_portion`
2. Open a terminal in VS Code
3. Go to backend:
   ```bash
   cd backend
   ```
4. Install dependencies:
   ```bash
   npm install
   ```
5. Start backend:
   ```bash
   npm start
   ```
6. You should see:
   `Backend running on http://localhost:5000`

Test quickly:
- Open `http://localhost:5000/api/health` in your browser — should show `{ "ok": true }`

---

## ✅ Step 2 — Run Frontend
### Option A (Easiest): Live Server
1. Install the extension: **Live Server**
2. Go to `frontend/dashboard.html`
3. Right click → **Open with Live Server**
4. It will open a URL like:
   `http://127.0.0.1:5500/frontend/dashboard.html`

### Option B (No extension): Python static server
1. Open terminal in VS Code
2. Go to frontend:
   ```bash
   cd frontend
   ```
3. Run:
   ```bash
   python -m http.server 5500
   ```
4. Open in browser:
   `http://localhost:5500/dashboard.html`

---

## ✅ What should work now?
- Dashboard loads demo "Latest Risk", "Usage", "Recent Reports"
- Diagnostics lets you upload an image and shows a demo result
- Donation saves a demo donation and shows success message
- Chatbot returns a demo reply

---

## Later (after Step 1)
### Step 2 — Connect to Teammate DB/Auth
Replace demo endpoints in `backend/server.js` with real DB queries and auth middleware.
You’ll need from teammate:
- DB type (MongoDB or MySQL)
- Models/tables
- How login works (JWT token or session)

### Step 3 — Connect ML
Replace the demo scan response in `/api/scans/upload` to call the ML service.

---

## Notes
- The current pages call same-origin `/api/...` routes directly from the HTML pages.
- If your backend port changes in local development, update the hardcoded login/admin URLs in `client/html/login.html`.

Good luck — you’re building this the right way (run → test → integrate).
