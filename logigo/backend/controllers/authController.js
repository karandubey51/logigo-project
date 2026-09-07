const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');
require('dotenv').config();

const TABLES = { customer: 'customers', driver: 'drivers', admin: 'admins' };

function signToken(id, role) {
  return jwt.sign({ id, role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  });
}

// ---------------- Register (customers & drivers only; admins are seeded) ----------------
async function register(req, res) {
  try {
    const { role } = req.body;
    if (!['customer', 'driver'].includes(role)) {
      return res.status(400).json({ message: 'role must be customer or driver' });
    }

    const table = TABLES[role];
    const { name, email, password, phone } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'name, email and password are required' });
    }

    const [existing] = await pool.query(`SELECT id FROM ${table} WHERE email = ?`, [email]);
    if (existing.length > 0) {
      return res.status(409).json({ message: 'Email already registered' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    if (role === 'customer') {
      const { address } = req.body;
      const [result] = await pool.query(
        'INSERT INTO customers (name, email, password_hash, phone, address) VALUES (?, ?, ?, ?, ?)',
        [name, email, passwordHash, phone || null, address || null]
      );
      const token = signToken(result.insertId, 'customer');
      return res.status(201).json({ token, user: { id: result.insertId, name, email, role: 'customer' } });
    }

    // driver
    const { license_number, vehicle_type, vehicle_number } = req.body;
    if (!vehicle_type) {
      return res.status(400).json({ message: 'vehicle_type is required for drivers' });
    }
    const [result] = await pool.query(
      `INSERT INTO drivers (name, email, password_hash, phone, license_number, vehicle_type, vehicle_number)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [name, email, passwordHash, phone || null, license_number || null, vehicle_type, vehicle_number || null]
    );
    const token = signToken(result.insertId, 'driver');
    return res.status(201).json({ token, user: { id: result.insertId, name, email, role: 'driver' } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error during registration' });
  }
}

// ---------------- Login (works for customer, driver, admin) ----------------
async function login(req, res) {
  try {
    const { email, password, role } = req.body;
    if (!TABLES[role]) {
      return res.status(400).json({ message: 'role must be customer, driver or admin' });
    }

    const table = TABLES[role];
    const [rows] = await pool.query(`SELECT * FROM ${table} WHERE email = ?`, [email]);

    if (rows.length === 0) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const user = rows[0];
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    if (role === 'driver' && user.approval_status !== 'approved') {
      if (user.approval_status === 'rejected') {
        return res.status(403).json({ message: 'Your registration request was rejected by the admin.' });
      }
      return res.status(403).json({ message: 'Your account is pending admin approval. Please wait until it is approved.' });
    }

    const token = signToken(user.id, role);
    delete user.password_hash;

    res.json({ token, user: { ...user, role } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error during login' });
  }
}

// ---------------- Change Password (customer or driver) ----------------
async function changePassword(req, res) {
  try {
    const role = req.user.role;
    if (!['customer', 'driver'].includes(role)) {
      return res.status(403).json({ message: 'Not allowed for this role' });
    }
    const table = TABLES[role];
    const { current_password, new_password } = req.body;

    if (!current_password || !new_password) {
      return res.status(400).json({ message: 'current_password and new_password are required' });
    }
    if (new_password.length < 6) {
      return res.status(400).json({ message: 'New password must be at least 6 characters' });
    }

    const [rows] = await pool.query(`SELECT password_hash FROM ${table} WHERE id = ?`, [req.user.id]);
    if (rows.length === 0) return res.status(404).json({ message: 'Account not found' });

    const match = await bcrypt.compare(current_password, rows[0].password_hash);
    if (!match) return res.status(401).json({ message: 'Current password is incorrect' });

    const newHash = await bcrypt.hash(new_password, 10);
    await pool.query(`UPDATE ${table} SET password_hash = ? WHERE id = ?`, [newHash, req.user.id]);

    res.json({ message: 'Password changed successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error changing password' });
  }
}

module.exports = { register, login, changePassword };
