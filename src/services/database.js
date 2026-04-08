// Coffee POS System - Database Service
const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const path = require('path');

class DatabaseService {
    constructor(dbPath = null) {
        this.db = null;
        this.dbPath = dbPath || path.join(__dirname, '..', '..', 'coffee_pos.db');
    }

    initialize() {
        // Initialize SQLite Database
        this.db = new Database(this.dbPath);
        
        // Enable foreign keys
        this.db.pragma('foreign_keys = ON');
        
        // Create tables
        this.createTables();
        
        // Insert default data
        this.seedDefaults();
        
        console.log('✅ Database initialized successfully');
        return this.db;
    }

    createTables() {
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                username TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL,
                fullname TEXT NOT NULL,
                role TEXT NOT NULL DEFAULT 'staff',
                permissions TEXT DEFAULT '["pos","orders"]',
                createdAt TEXT NOT NULL,
                startDate TEXT,
                endDate TEXT,
                active INTEGER DEFAULT 1
            )
        `);

        this.db.exec(`
            CREATE TABLE IF NOT EXISTS categories (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                name_km TEXT NOT NULL,
                icon TEXT DEFAULT 'fa-box',
                active INTEGER DEFAULT 1
            )
        `);

        this.db.exec(`
            CREATE TABLE IF NOT EXISTS products (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                name_km TEXT,
                category_id TEXT,
                price REAL NOT NULL DEFAULT 0,
                salePrice REAL DEFAULT 0,
                image TEXT,
                icon TEXT DEFAULT 'fa-box',
                description TEXT,
                active INTEGER DEFAULT 1,
                FOREIGN KEY (category_id) REFERENCES categories(id)
            )
        `);

        this.db.exec(`
            CREATE TABLE IF NOT EXISTS orders (
                id TEXT PRIMARY KEY,
                receiptNumber TEXT UNIQUE NOT NULL,
                date TEXT NOT NULL,
                items TEXT NOT NULL,
                subtotal REAL NOT NULL DEFAULT 0,
                discountPercent REAL DEFAULT 0,
                discountAmount REAL DEFAULT 0,
                total REAL NOT NULL DEFAULT 0,
                paymentMethod TEXT NOT NULL DEFAULT 'cash',
                userId TEXT NOT NULL,
                userName TEXT NOT NULL,
                FOREIGN KEY (userId) REFERENCES users(id)
            )
        `);

        this.db.exec(`
            CREATE TABLE IF NOT EXISTS settings (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL
            )
        `);

        this.db.exec(`
            CREATE TABLE IF NOT EXISTS permissions (
                id          TEXT PRIMARY KEY,
                key         TEXT UNIQUE NOT NULL,
                label       TEXT NOT NULL,
                label_km    TEXT NOT NULL,
                icon        TEXT DEFAULT 'fa-key',
                description TEXT,
                is_system   INTEGER DEFAULT 0
            )
        `);

        this.db.exec(`
            CREATE TABLE IF NOT EXISTS roles (
                id          TEXT PRIMARY KEY,
                name        TEXT UNIQUE NOT NULL,
                label       TEXT NOT NULL,
                color       TEXT DEFAULT '#6f4e37',
                icon        TEXT DEFAULT 'fa-user',
                description TEXT,
                is_system   INTEGER DEFAULT 0
            )
        `);

        this.db.exec(`
            CREATE TABLE IF NOT EXISTS role_permissions (
                role_id       TEXT NOT NULL,
                permission_id TEXT NOT NULL,
                PRIMARY KEY (role_id, permission_id),
                FOREIGN KEY (role_id)       REFERENCES roles(id)       ON DELETE CASCADE,
                FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE
            )
        `);
    }

    seedDefaults() {
        // Insert default categories
        const categoriesCount = this.db.prepare('SELECT COUNT(*) as count FROM categories').get();
        if (categoriesCount.count === 0) {
            this.db.exec(`
                INSERT INTO categories (id, name, name_km, icon) VALUES
                ('cat_coffee', 'Coffee', 'កាហ្វេ', 'fa-coffee'),
                ('cat_coco_shake', 'Coco-Shake', 'កូកូ-សេក', 'fa-glass-water'),
                ('cat_tea', 'Tea', 'តែបៃតង', 'fa-leaf'),
                ('cat_cub', 'Cub', 'កាប់', 'fa-mug-hot')
            `);
        }

        // Insert default users
        const usersCount = this.db.prepare('SELECT COUNT(*) as count FROM users').get();
        if (usersCount.count === 0) {
            const hashedPassword = bcrypt.hashSync('1234', 10);
            const now = new Date().toISOString();

            this.db.exec(`
                INSERT INTO users (id, username, password, fullname, role, permissions, createdAt, active) VALUES
                ('user_admin', 'admin', '${hashedPassword}', 'អ្នកគ្រប់គ្រង', 'admin', '["pos","items","orders","reports","users"]', '${now}', 1),
                ('user_manager', 'manager', '${hashedPassword}', 'អ្នកគ្រប់គ្រងរង', 'manager', '["pos","items","orders","reports"]', '${now}', 1),
                ('user_staff', 'staff', '${hashedPassword}', 'បុគ្គលិក', 'staff', '["pos","orders"]', '${now}', 1)
            `);
        }

        // Insert default products
        const productsCount = this.db.prepare('SELECT COUNT(*) as count FROM products').get();
        if (productsCount.count === 0) {
            this.db.exec(`
                INSERT INTO products (id, name, name_km, category_id, price, salePrice, icon, description) VALUES
                ('prod_1', 'កាហ្វេសរស់', 'Fresh Coffee', 'cat_coffee', 8000, 0, 'fa-coffee', 'កាហ្វេស្រស់ឆ្ងាញ់'),
                ('prod_2', 'កាហ្វេទឹកដោះគោ', 'Coffee with Milk', 'cat_coffee', 10000, 0, 'fa-coffee', 'កាហ្វេទឹកដោះគោផ្អែម'),
                ('prod_3', 'កាហ្វេទឹកក្រឡុក', 'Shaken Coffee', 'cat_coffee', 12000, 10000, 'fa-blender', 'កាហ្វេទឹកក្រឡុកត្រជាក់'),
                ('prod_4', 'កាហ្វេស្រស់តរជាក់', 'Iced Fresh Coffee', 'cat_coffee', 9000, 0, 'fa-coffee', 'កាហ្វេសរស់ត្រជាក់'),
                ('prod_5', 'កូកូសេក', 'Coco Shake', 'cat_coco_shake', 9000, 0, 'fa-glass-water', 'កូកូសេកឆ្ងាញ់'),
                ('prod_6', 'កូកូសេកទឹកដោះគោ', 'Coco Shake with Milk', 'cat_coco_shake', 10000, 0, 'fa-glass-water', 'កូកូសេកទឹកដោះគោ'),
                ('prod_7', 'តែបៃតង', 'Green Tea', 'cat_tea', 7000, 0, 'fa-leaf', 'តែបៃតងក្ដៅ'),
                ('prod_8', 'តែបៃតងទឹកឃ្មុំ', 'Green Tea with Honey', 'cat_tea', 8000, 0, 'fa-leaf', 'តែបៃតងទឹកឃ្មុំ'),
                ('prod_9', 'តែបៃតងទឹកដោះគោ', 'Green Tea with Milk', 'cat_tea', 9000, 0, 'fa-leaf', 'តែបៃតងទឹកដោះគោ'),
                ('prod_10', 'តែបៃតងត្រជាក់', 'Iced Green Tea', 'cat_tea', 7500, 0, 'fa-leaf', 'តែបៃតងត្រជាក់'),
                ('prod_11', 'កាប់កាហ្វេ', 'Coffee Cub', 'cat_cub', 8500, 0, 'fa-mug-hot', 'កាប់កាហ្វេឆ្ងាញ់'),
                ('prod_12', 'កាប់តែ', 'Tea Cub', 'cat_cub', 7500, 0, 'fa-mug-hot', 'កាប់តែឆ្ងាញ់')
            `);
        }

        // Insert default settings
        const settingsCount = this.db.prepare('SELECT COUNT(*) as count FROM settings').get();
        if (settingsCount.count === 0) {
            this.db.exec(`
                INSERT INTO settings (key, value) VALUES
                ('shopName', 'Coffee POS'),
                ('currency', '៛'),
                ('taxRate', '0')
            `);
        }

        // Insert default permissions
        const permCount = this.db.prepare('SELECT COUNT(*) as count FROM permissions').get();
        if (permCount.count === 0) {
            this.db.exec(`
                INSERT INTO permissions (id, key, label, label_km, icon, description, is_system) VALUES
                ('perm_pos',     'pos',     'POS',           'លក់',             'fa-cash-register', 'ចូលប្រើប្រព័ន្ធ POS', 1),
                ('perm_items',   'items',   'Items',         'ទំនិញ',        'fa-box-open',      'គ្រប់គ្រងទំនិញ',   1),
                ('perm_orders',  'orders',  'Orders',        'ប្រវត្តិការលក់',          'fa-receipt',       'មើលប្រវត្តិការលក់',    1),
                ('perm_reports', 'reports', 'Reports',       'របាយការណ៍',      'fa-chart-bar',     'មើលតារាងស្ថិតិ',       1),
                ('perm_users',   'users',   'Users',         'អ្នកប្រើ',        'fa-users',         'គ្រប់គ្រងអ្នកប្រើ',    1)
            `);
        }

        // Insert default roles
        const roleCount = this.db.prepare('SELECT COUNT(*) as count FROM roles').get();
        if (roleCount.count === 0) {
            this.db.exec(`
                INSERT INTO roles (id, name, label, color, icon, description, is_system) VALUES
                ('role_admin',   'admin',   'Admin',            '#6f4e37', 'fa-shield-halved', 'Full system access',          1),
                ('role_manager', 'manager', 'អ្នកគ្រប់គ្រងរង', '#3498db', 'fa-user-tie',      'Access without user mgmt',     0),
                ('role_staff',   'staff',   'បុគ្គលិក',         '#27ae60', 'fa-user',          'Basic POS and order access',   0)
            `);
            // Assign default permissions to roles
            this.db.exec(`
                INSERT INTO role_permissions (role_id, permission_id) VALUES
                ('role_admin',   'perm_pos'),
                ('role_admin',   'perm_items'),
                ('role_admin',   'perm_orders'),
                ('role_admin',   'perm_reports'),
                ('role_admin',   'perm_users'),
                ('role_admin',   'perm_settings'),
                ('role_manager', 'perm_pos'),
                ('role_manager', 'perm_items'),
                ('role_manager', 'perm_orders'),
                ('role_manager', 'perm_reports'),
                ('role_staff',   'perm_pos'),
                ('role_staff',   'perm_orders')
            `);
        }
    }

    generateReceiptNumber() {
        const date = new Date();
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
        return `${year}${month}${day}${random}`;
    }

    getDatabase() {
        if (!this.db) {
            throw new Error('Database not initialized. Call initialize() first.');
        }
        return this.db;
    }

    close() {
        if (this.db) {
            this.db.close();
            console.log('🔌 Database connection closed');
        }
    }
}

// Export singleton instance
const databaseService = new DatabaseService();
module.exports = databaseService;

