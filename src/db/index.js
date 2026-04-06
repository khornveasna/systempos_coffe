// Database connection, schema, and seed data
const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const path = require('path');

const dbPath = process.env.DATABASE_PATH || path.join(__dirname, '../../data/coffee_pos.db');
const db = new Database(dbPath);

db.pragma('foreign_keys = ON');

// ── Schema ────────────────────────────────────────────────────────────────────

db.exec(`
    CREATE TABLE IF NOT EXISTS users (
        id          TEXT PRIMARY KEY,
        username    TEXT UNIQUE NOT NULL,
        password    TEXT NOT NULL,
        fullname    TEXT NOT NULL,
        role        TEXT NOT NULL DEFAULT 'staff',
        permissions TEXT DEFAULT '["pos","orders"]',
        createdAt   TEXT NOT NULL,
        active      INTEGER DEFAULT 1
    )
`);

db.exec(`
    CREATE TABLE IF NOT EXISTS categories (
        id      TEXT PRIMARY KEY,
        name    TEXT NOT NULL,
        name_km TEXT NOT NULL,
        icon    TEXT DEFAULT 'fa-box',
        active  INTEGER DEFAULT 1
    )
`);

db.exec(`
    CREATE TABLE IF NOT EXISTS products (
        id          TEXT PRIMARY KEY,
        name        TEXT NOT NULL,
        name_km     TEXT,
        category_id TEXT,
        price       REAL NOT NULL DEFAULT 0,
        salePrice   REAL DEFAULT 0,
        image       TEXT,
        icon        TEXT DEFAULT 'fa-box',
        description TEXT,
        active      INTEGER DEFAULT 1,
        FOREIGN KEY (category_id) REFERENCES categories(id)
    )
`);

db.exec(`
    CREATE TABLE IF NOT EXISTS orders (
        id             TEXT PRIMARY KEY,
        receiptNumber  TEXT UNIQUE NOT NULL,
        date           TEXT NOT NULL,
        items          TEXT NOT NULL,
        subtotal       REAL NOT NULL DEFAULT 0,
        discountPercent REAL DEFAULT 0,
        discountAmount  REAL DEFAULT 0,
        total          REAL NOT NULL DEFAULT 0,
        paymentMethod  TEXT NOT NULL DEFAULT 'cash',
        userId         TEXT NOT NULL,
        userName       TEXT NOT NULL,
        FOREIGN KEY (userId) REFERENCES users(id)
    )
`);

db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
        key   TEXT PRIMARY KEY,
        value TEXT NOT NULL
    )
`);

// ── Seed data ─────────────────────────────────────────────────────────────────

const categoriesCount = db.prepare('SELECT COUNT(*) as count FROM categories').get();
if (categoriesCount.count === 0) {
    db.exec(`
        INSERT INTO categories (id, name, name_km, icon) VALUES
        ('cat_coffee', 'Coffee', 'កាហ្វេ', 'fa-coffee'),
        ('cat_tea',    'Tea',    'តែបៃតង', 'fa-leaf')
    `);
}

const usersCount = db.prepare('SELECT COUNT(*) as count FROM users').get();
if (usersCount.count === 0) {
    const hashedPassword = bcrypt.hashSync('1234', 10);
    const now = new Date().toISOString();
    const insertUser = db.prepare(`
        INSERT INTO users (id, username, password, fullname, role, permissions, createdAt, active)
        VALUES (?, ?, ?, ?, ?, ?, ?, 1)
    `);
    insertUser.run('user_admin',   'admin',   hashedPassword, 'អ្នកគ្រប់គ្រង',    'admin',   '["pos","items","orders","reports","users"]', now);
    insertUser.run('user_manager', 'manager', hashedPassword, 'អ្នកគ្រប់គ្រងរង', 'manager', '["pos","items","orders","reports"]', now);
    insertUser.run('user_staff',   'staff',   hashedPassword, 'បុគ្គលិក',         'staff',   '["pos","orders"]', now);
}

const productsCount = db.prepare('SELECT COUNT(*) as count FROM products').get();
if (productsCount.count === 0) {
    db.exec(`
        INSERT INTO products (id, name, name_km, category_id, price, salePrice, icon, description) VALUES
        ('prod_1', 'កាហ្វេស្រស់',      'Fresh Coffee',        'cat_coffee', 8000,  0,     'fa-coffee',  'កាហ្វេស្រស់ឆ្ងាញ់'),
        ('prod_2', 'កាហ្វេទឹកដោះគោ',  'Coffee with Milk',    'cat_coffee', 10000, 0,     'fa-coffee',  'កាហ្វេទឹកដោះគោផ្អែម'),
        ('prod_3', 'កាហ្វេទឹកក្រឡុក', 'Shaken Coffee',       'cat_coffee', 12000, 10000, 'fa-blender', 'កាហ្វេទឹកក្រឡុកត្រជាក់'),
        ('prod_4', 'កាហ្វេស្រស់ត្រជាក់','Iced Fresh Coffee',  'cat_coffee', 9000,  0,     'fa-coffee',  'កាហ្វេស្រស់ត្រជាក់'),
        ('prod_5', 'តែបៃតង',           'Green Tea',           'cat_tea',    7000,  0,     'fa-leaf',    'តែបៃតងក្ដៅ'),
        ('prod_6', 'តែបៃតងទឹកឃ្មុំ',  'Green Tea with Honey','cat_tea',    8000,  0,     'fa-leaf',    'តែបៃតងទឹកឃ្មុំ'),
        ('prod_7', 'តែបៃតងទឹកដោះគោ', 'Green Tea with Milk',  'cat_tea',    9000,  0,     'fa-leaf',    'តែបៃតងទឹកដោះគោ'),
        ('prod_8', 'តែបៃតងត្រជាក់',   'Iced Green Tea',      'cat_tea',    7500,  0,     'fa-leaf',    'តែបៃតងត្រជាក់')
    `);
}

const settingsCount = db.prepare('SELECT COUNT(*) as count FROM settings').get();
if (settingsCount.count === 0) {
    db.exec(`
        INSERT INTO settings (key, value) VALUES
        ('shopName', 'Coffee POS'),
        ('currency', '៛'),
        ('taxRate',  '0')
    `);
}

module.exports = db;
