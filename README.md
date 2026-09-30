# Zain Tailor Backend

## Install
npm install

## Configure
Copy `.env.example` to `.env` and set your MongoDB URI and admin password.

## Run
npm start

Backend: http://localhost:4000
Health: http://localhost:4000/api/health

## API
POST /api/admin/login
POST /api/admin/logout
POST /api/appointments
GET /api/appointments (admin token)
PATCH /api/appointments/:id/status (admin token)
DELETE /api/appointments/:id (admin token)
DELETE /api/appointments (admin token)
POST /api/messages
GET /api/messages (admin token)
DELETE /api/messages/:id (admin token)
DELETE /api/messages (admin token)
