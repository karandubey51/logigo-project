-- ============================================
-- LogiGo Database Schema (MySQL)
-- ============================================

CREATE DATABASE IF NOT EXISTS logigo;
USE logigo;

-- ---------------- Customers ----------------
CREATE TABLE customers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  phone VARCHAR(20),
  address VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ---------------- Drivers ----------------
CREATE TABLE drivers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  phone VARCHAR(20),
  license_number VARCHAR(50),
  vehicle_type ENUM('mini_truck','pickup_van','large_truck') NOT NULL,
  vehicle_number VARCHAR(30),
  status ENUM('available','busy','offline') DEFAULT 'available',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ---------------- Admins ----------------
CREATE TABLE admins (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ---------------- Bookings ----------------
CREATE TABLE bookings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  customer_id INT NOT NULL,
  driver_id INT DEFAULT NULL,
  pickup_location VARCHAR(255) NOT NULL,
  delivery_location VARCHAR(255) NOT NULL,
  distance_km DECIMAL(6,2) DEFAULT NULL,
  vehicle_type ENUM('mini_truck','pickup_van','large_truck') NOT NULL,
  goods_description VARCHAR(255) NOT NULL,
  goods_weight_kg DECIMAL(8,2) NOT NULL,
  estimated_price DECIMAL(10,2) NOT NULL,
  status ENUM(
    'pending',
    'assigned',
    'accepted',
    'rejected',
    'picked_up',
    'in_transit',
    'delivered',
    'cancelled'
  ) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
  FOREIGN KEY (driver_id) REFERENCES drivers(id) ON DELETE SET NULL
);

-- ---------------- Booking Status History (audit trail) ----------------
CREATE TABLE booking_status_history (
  id INT AUTO_INCREMENT PRIMARY KEY,
  booking_id INT NOT NULL,
  status VARCHAR(30) NOT NULL,
  changed_by ENUM('customer','driver','admin','system') NOT NULL,
  changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE
);karan

-- ---------------- Seed data (optional, for demo/viva) ----------------
INSERT INTO admins (name, email, password_hash) VALUES
('Super Admin', 'admin@logigadmino.com', '$2b$10$replace_with_real_bcrypt_hash');

INSERT INTO drivers (name, email, password_hash, phone, license_number, vehicle_type, vehicle_number, status) VALUES
(' karan dubey', 'ramesh@logigo.com', '$2b$10$replace_with_real_bcrypt_hash', '9876543210', 'DL-01-2020-000123', 'mini_truck', 'MH12AB1234', 'available'),
('Suresh Patil', 'suresh@logigo.com', '$2b$10$replace_with_real_bcrypt_hash', '9876543211', 'DL-01-2019-000456', 'large_truck', 'MH14CD5678', 'available');
