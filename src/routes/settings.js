<<<<<<< HEAD
// Settings Routes
const express = require('express');
const router = express.Router();
const settingsController = require('../controllers/settingsController');

// GET /api/settings - Get all settings
router.get('/', settingsController.getSettings);

// PUT /api/settings - Update settings
router.put('/', settingsController.updateSettings);

module.exports = router;
=======
const express = require('express');

module.exports = function settingsRoutes(db) {
    const router = express.Router();

    router.get('/', (req, res) => {
        try {
            const rows = db.prepare('SELECT key, value FROM settings').all();
            const settings = Object.fromEntries(rows.map(r => [r.key, r.value]));
            res.json({ success: true, settings });
        } catch (error) {
            console.error('Get settings error:', error);
            res.status(500).json({ success: false, message: 'Server error' });
        }
    });

    router.put('/', (req, res) => {
        try {
            const { settings } = req.body;
            const upsert = db.prepare(`
                INSERT INTO settings (key, value) VALUES (?, ?)
                ON CONFLICT(key) DO UPDATE SET value = ?
            `);
            for (const [key, value] of Object.entries(settings)) {
                upsert.run(key, String(value), String(value));
            }
            res.json({ success: true, message: 'Settings updated successfully' });
        } catch (error) {
            console.error('Update settings error:', error);
            res.status(500).json({ success: false, message: 'Server error' });
        }
    });

    return router;
};
>>>>>>> acbaef74e4deb37ef63c984d184b45dcbd99c93d
