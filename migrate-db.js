// Database Migration Script - Update existing database with new schema
const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');

const db = new Database('coffee_pos.db');

console.log('🔄 Starting database migration...\n');

try {
    // Check if users table needs active column
    const tableInfo = db.pragma("table_info('users')");
    const hasActiveColumn = tableInfo.some(col => col.name === 'active');

    if (!hasActiveColumn) {
        console.log('➕ Adding "active" column to users table...');
        db.exec('ALTER TABLE users ADD COLUMN active INTEGER DEFAULT 1');
        console.log('✅ Column added successfully!\n');
    } else {
        console.log('✓ "active" column already exists\n');
    }

    // Check if we need to update default users
    const adminUser = db.prepare("SELECT * FROM users WHERE username = 'admin'").get();

    if (adminUser) {
        console.log('📝 Updating admin user permissions...');
        db.prepare("UPDATE users SET permissions = ?, active = 1 WHERE username = 'admin'")
            .run(JSON.stringify(['pos', 'items', 'orders', 'reports', 'users']));
        console.log('✅ Admin permissions updated!\n');
    }

    if (adminUser) {
        console.log('📝 Updating manager user permissions...');
        db.prepare("UPDATE users SET permissions = ?, active = 1 WHERE username = 'manager'")
            .run(JSON.stringify(['pos', 'items', 'orders', 'reports']));
        console.log('✅ Manager permissions updated!\n');
    }

    const staffUser = db.prepare("SELECT * FROM users WHERE username = 'staff'").get();
    if (staffUser) {
        console.log('📝 Updating staff user permissions...');
        db.prepare("UPDATE users SET permissions = ?, active = 1 WHERE username = 'staff'")
            .run(JSON.stringify(['pos', 'orders']));
        console.log('✅ Staff permissions updated!\n');
    }

    // Verify all users have active column set
    console.log('✓ Ensuring all users are active...');
    db.exec('UPDATE users SET active = 1 WHERE active IS NULL');
    console.log('✅ All users marked as active!\n');

    // Show current users
    console.log('📊 Current Users:');
    console.log('─'.repeat(60));
    const users = db.prepare('SELECT username, fullname, role, permissions, active FROM users').all();
    users.forEach(user => {
        const perms = JSON.parse(user.permissions);
        console.log(`  ${user.username} (${user.fullname})`);
        console.log(`    Role: ${user.role}`);
        console.log(`    Permissions: ${perms.join(', ')}`);
        console.log(`    Active: ${user.active ? 'Yes' : 'No'}`);
        console.log('');
    });

    // Migrate orders table for dual currency support
    console.log('\n💱 Migrating orders table for dual currency support...');
    const ordersTableInfo = db.pragma("table_info('orders')");
    const orderColumns = ordersTableInfo.map(col => col.name);

    const columnsToAdd = [
        { name: 'totalUSD', sql: 'ALTER TABLE orders ADD COLUMN totalUSD REAL DEFAULT 0' },
        { name: 'amountReceived', sql: 'ALTER TABLE orders ADD COLUMN amountReceived REAL DEFAULT 0' },
        { name: 'amountReceivedUSD', sql: 'ALTER TABLE orders ADD COLUMN amountReceivedUSD REAL DEFAULT 0' },
        { name: 'changeAmount', sql: 'ALTER TABLE orders ADD COLUMN changeAmount REAL DEFAULT 0' },
        { name: 'changeAmountUSD', sql: 'ALTER TABLE orders ADD COLUMN changeAmountUSD REAL DEFAULT 0' },
        { name: 'exchangeRate', sql: 'ALTER TABLE orders ADD COLUMN exchangeRate REAL DEFAULT 4000' }
    ];

    columnsToAdd.forEach(col => {
        if (!orderColumns.includes(col.name)) {
            console.log(`  ➕ Adding "${col.name}" column to orders table...`);
            db.exec(col.sql);
            console.log(`  ✅ Column "${col.name}" added!`);
        } else {
            console.log(`  ✓ Column "${col.name}" already exists`);
        }
    });

    // Add exchange rate to settings
    console.log('\n💱 Adding exchange rate to settings...');
    const existingRate = db.prepare("SELECT value FROM settings WHERE key = 'exchangeRate'").get();
    if (!existingRate) {
        console.log('  ➕ Adding default exchange rate (4000 KHR = 1 USD)...');
        db.prepare("INSERT INTO settings (key, value) VALUES ('exchangeRate', '4000')").run();
        console.log('  ✅ Exchange rate added!');
    } else {
        console.log('  ✓ Exchange rate already exists');
    }

    console.log('\n✅ Migration completed successfully!\n');
    console.log('📋 Summary:');
    console.log('  - Orders table now supports dual currency (KHR/USD)');
    console.log('  - Exchange rate setting added (default: 4000 KHR = 1 USD)');
    console.log('  - You can now configure exchange rate in Settings page\n');

} catch (error) {
    console.error('❌ Migration error:', error.message);
    process.exit(1);
} finally {
    db.close();
}
