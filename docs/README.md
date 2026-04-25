# OptiGuard AI

OptiGuard AI is a full-stack eye health screening platform. It lets users sign up, log in, upload retinal scans, view dashboard/history data, manage their profile, donate, chat with an eye health assistant, and access an admin console for user management.

## Tech Stack

- Frontend: HTML, CSS, vanilla JavaScript
- Backend: Node.js, Express
- Database: hosted MySQL via `mysql2`
- Auth/session: client-side session state in `sessionStorage`
- File uploads: `multer`
- Password hashing: `bcrypt`
- Charts: `Chart.js`
- AI integrations:
  - Roboflow for scan inference
  - Gemini for chatbot responses
  - Firebase Google sign-in on the login page

## Project Structure

```text
client/
  css/
  html/
  js/
server/
  db/
  server.js
docs/
  README.md
```

## Main Pages

- `/` : landing page
- `/login` : user login, signup, Google sign-in, and admin login
- `/dashboard` : user dashboard
- `/diagnostics` : scan upload and chatbot
- `/donation` : donation page
- `/settings` : profile and account settings
- `/test-history` : user scan history
- `/admin` : admin dashboard

## Backend Routes

### Health

- `GET /api/health`

### User Account

- `GET /api/me`
- `PUT /api/me`
- `POST /signup`
- `POST /login`
- `POST /api/auth/change-password`
- `DELETE /api/auth/account`

### Admin

- `POST /admin/login`
- `GET /api/admin/users`
- `POST /api/admin/users`
- `PUT /api/admin/users/:id`
- `DELETE /api/admin/users/:id`
- `GET /api/admin/stats`

### Scans

- `GET /api/scans/latest`
- `GET /api/scans/recent`
- `DELETE /api/scans`
- `POST /api/scans/upload`

### Donations

- `POST /api/donations`
- `GET /api/donations/recent`

### Chatbot

- `POST /api/agents/chat`

## Database

The app uses the hosted MySQL connection configured in [db1.js](/Users/zubo/CSE327_SE_Project/server/db/db1.js:1), not the old local SQLite/MySQL demo files.

The `users` table is automatically prepared with these fields:

- `id`
- `fullname`
- `display_name`
- `email`
- `password`
- `phone`
- `dob`
- `gender`
- `role`
- `status`
- `created_at`

Other tables used by the app:

- `reports`
- `donations`

## Default Admin Account

On startup, the app seeds a default admin user if one does not already exist.

- Default email: `admin@optiguard.ai`
- Default password: `Admin123!`

You can override these with environment variables before starting the server:

- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`
- `ADMIN_NAME`

## Local Setup

### Requirements

- Node.js 
- npm

### Install

From the project root:

```bash
npm install
```

### Run

Start the backend server from the project root:

```bash
node server/server.js
```

The app runs on:

```text
http://localhost:3000
```

Open the browser at:

```text
http://localhost:3000
```

## Authentication Notes

- Regular user login stores session info in `sessionStorage` under `optiUser`
- Admin login stores session info in `sessionStorage` under `optiAdmin`
- Protected user pages rely on frontend session checks
- Admin API routes require an admin email sent through the current admin session flow

## Important Implementation Notes

- The current login page uses hardcoded local URLs pointing to `http://127.0.0.1:3000` for login/admin login requests
- Frontend pages mostly call same-origin `/api/...` routes directly
- Scan and donation requests attach the signed-in user email when available
- Admin features read from the same hosted database as the main application

## Current Features

- User signup and password login
- Google sign-in
- Admin login
- Profile editing
- Password change
- Account deletion
- Scan upload and result storage
- Scan history view
- Donation recording
- Eye health chatbot
- Admin user listing, filtering, editing, creating, deleting, and reporting

## Caution

This repository currently contains live-style service configuration directly in code, including external API/database setup. Before production deployment, move sensitive configuration to environment variables and review access control more strictly.
