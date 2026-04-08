const express = require('express');
const router = express.Router();
const roleController = require('../controllers/roleController');

// Permission routes
router.get('/permissions',         (req, res) => roleController.getAllPermissions(req, res));
router.post('/permissions',        (req, res) => roleController.createPermission(req, res));
router.put('/permissions/:id',     (req, res) => roleController.updatePermission(req, res));
router.delete('/permissions/:id',  (req, res) => roleController.deletePermission(req, res));

// Role routes
router.get('/',         (req, res) => roleController.getAllRoles(req, res));
router.get('/:id',      (req, res) => roleController.getRole(req, res));
router.post('/',        (req, res) => roleController.createRole(req, res));
router.put('/:id',      (req, res) => roleController.updateRole(req, res));
router.delete('/:id',   (req, res) => roleController.deleteRole(req, res));

module.exports = router;
