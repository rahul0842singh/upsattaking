// src/routes/results.js
const { Router } = require('express');
const { authMiddleware } = require('../utils/auth');
const ctrl = require('../controllers/results.controller');

const router = Router();

/**
 * ===========================
 *  PUBLIC ROUTES
 * ===========================
 */

// Timewise rows for a day (grouped by slot, values per GAME CODE)
router.get('/timewise', ctrl.listTimewise);

// Final snapshot at a given time (values per GAME CODE)
router.get('/snapshot', ctrl.getSnapshot);

// Monthly (day-wise) results table
router.get('/monthly', ctrl.listMonthly);

/**
 * ===========================
 *  ADMIN / PROTECTED ROUTES
 * ===========================
 */

// Create a new timewise entry (keeps history)
router.post('/timewise', authMiddleware, ctrl.upsertTimewise);

// Delete a specific timewise record by ID
router.delete('/timewise/:id', authMiddleware, ctrl.deleteTimewise);

module.exports = router;
