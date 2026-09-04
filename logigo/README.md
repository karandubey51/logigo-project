# LogiGo — Online Logistics & Transport Management System

A simplified Porter-style transport booking platform, built for a college project.

## Stack
- **Frontend:** HTML + CSS + vanilla JavaScript
- **Backend:** Node.js + Express
- **Database:** MySQL
- **Auth:** JWT (JSON Web Tokens), passwords hashed with bcrypt

## Project Structure
```
logigo/
├── backend/
│   ├── config/db.js              # MySQL connection pool
│   ├── middleware/auth.js        # JWT verification + role guard
│   ├── controllers/              # Business logic per role
│   ├── routes/                   # Express route definitions
│   ├── utils/fareCalculator.js   # Price estimation logic
│   ├── server.js                 # App entry point
│   ├── package.json
│   └── .env.example
├── database/
│   └── schema.sql                # Full MySQL schema + seed data
└── frontend/
    ├── index.html, about.html
    ├── login.html, register.html
    ├── book-transport.html, booking-confirmation.html
    ├── my-bookings.html, booking-details.html
    ├── driver-dashboard.html
    ├── admin-dashboard.html
    ├── css/style.css
    └── js/ (api.js, auth.js, booking.js, driver.js, admin.js)
```

## How the pieces fit together

**Three user roles, three separate tables** (`customers`, `drivers`, `admins`) — each
has its own login, but they all get a JWT with `{ id, role }` encoded in it. Every
protected route checks that role via `middleware/auth.js`.

**One `bookings` table** is the center of the whole app. Its `status` column drives
everything: `pending → assigned → accepted → picked_up → in_transit → delivered`
(with `rejected`/`cancelled` as side branches). `booking_status_history` keeps an
audit trail of every transition, which is a nice thing to show off in a viva.

**Fare estimation** (`utils/fareCalculator.js`) is intentionally simple: a base fare
per vehicle type + rate per km (user-entered distance) + rate per kg. A real product
would call a maps API (Google Distance Matrix, etc.) to compute distance automatically
— that's a good "future improvements" talking point.

## Setup

### 1. Database
```bash
mysql -u root -p < database/schema.sql
```
This creates the `logigo` database, all tables, and seeds 2 demo drivers + 1 admin.
**Important:** the seed `password_hash` values are placeholders — generate real bcrypt
hashes and update them (or just register through the app UI instead, except for admin,
which you'll need to insert or hash manually since there's no admin registration form
by design).

To generate a real bcrypt hash quickly:
```bash
node -e "console.log(require('bcryptjs').hashSync('yourpassword', 10))"
```

### 2. Backend
```bash
cd backend
npm install
cp .env.example .env
# edit .env with your MySQL credentials and a JWT secret
npm run dev   # or: npm start
```
Server runs on `http://localhost:5000`.

### 3. Frontend
The Express server already serves `../frontend` as static files, so once the backend
is running, just open:
```
http://localhost:5000/index.html
```
(Or open the HTML files directly with a tool like VS Code's Live Server — just make
sure `API_BASE` in `frontend/js/api.js` points at your backend's URL.)

## API Overview

| Method | Route | Role | Description |
|---|---|---|---|
| POST | `/api/auth/register` | public | Register as customer or driver |
| POST | `/api/auth/login` | public | Login (role: customer/driver/admin) |
| POST | `/api/customer/estimate` | customer | Get fare estimate before booking |
| POST | `/api/customer/bookings` | customer | Place a booking |
| GET | `/api/customer/bookings` | customer | List own bookings |
| GET | `/api/customer/bookings/:id` | customer | Booking detail |
| GET | `/api/driver/bookings` | driver | List assigned deliveries |
| PATCH | `/api/driver/bookings/:id/respond` | driver | Accept/reject an assignment |
| PATCH | `/api/driver/bookings/:id/status` | driver | Update delivery status |
| GET | `/api/admin/dashboard` | admin | Summary stats |
| GET | `/api/admin/customers` | admin | List all customers |
| GET | `/api/admin/drivers` | admin | List all drivers |
| GET | `/api/admin/bookings` | admin | List all bookings |
| PATCH | `/api/admin/bookings/:id/assign` | admin | Assign a driver |
| PATCH | `/api/admin/bookings/:id/status` | admin | Override booking status |

## AWS Deployment (as planned)
```
EC2  → runs the Node.js/Express server (and can serve the static frontend too)
RDS  → managed MySQL instance (swap DB_HOST in .env to the RDS endpoint)
```
Steps: launch an EC2 instance → install Node.js → clone/upload this repo → set up
`.env` pointing at your RDS endpoint → run `schema.sql` against RDS → `npm start`
(ideally behind `pm2` so it stays running) → open port 5000 (or put Nginx in front
on port 80).

## Possible extensions (good viva talking points)
- Real geocoding/distance via Google Maps Distance Matrix API instead of manual km entry
- Live tracking with WebSockets (driver location updates)
- Email/SMS notifications on status change
- Payment integration (Razorpay/Stripe test mode)
- Admin ability to view a driver's delivery history and ratings
