<<<<<<< HEAD
// Category Routes
const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/categoryController');

// GET /api/categories - Get all categories
router.get('/', categoryController.getAllCategories);

// GET /api/categories/:id - Get specific category
router.get('/:id', categoryController.getCategory);

// POST /api/categories - Create new category
router.post('/', categoryController.createCategory);

// PUT /api/categories/:id - Update category
router.put('/:id', categoryController.updateCategory);

// DELETE /api/categories/:id - Delete category
router.delete('/:id', categoryController.deleteCategory);

module.exports = router;
=======
const express = require('express');
const { v4: uuidv4 } = require('uuid');

module.exports = function categoriesRoutes(db) {
    const router = express.Router();

    router.get('/', (req, res) => {
        try {
            const categories = db.prepare('SELECT * FROM categories').all();
            res.json({ success: true, categories });
        } catch (error) {
            console.error('Get categories error:', error);
            res.status(500).json({ success: false, message: 'Server error' });
        }
    });

    router.post('/', (req, res) => {
        try {
            const { name, name_km, icon } = req.body;
            const id = uuidv4();
            db.prepare('INSERT INTO categories (id, name, name_km, icon) VALUES (?, ?, ?, ?)')
                .run(id, name, name_km, icon || 'fa-box');
            res.json({ success: true, message: 'Category created successfully', category: { id, name, name_km, icon } });
        } catch (error) {
            console.error('Create category error:', error);
            res.status(500).json({ success: false, message: 'Server error' });
        }
    });

    return router;
};
>>>>>>> acbaef74e4deb37ef63c984d184b45dcbd99c93d
