const express = require('express');
const router = express.Router();
const games = require('../controllers/games.controller');
const { authMiddleware } = require('../utils/auth');

// -------------------------------------------------------------
// PUBLIC ROUTES (no authentication required)
// -------------------------------------------------------------

// List all games (public for homepage)
router.get('/', games.listGames);

// Get single game by code (also public)
router.get('/:code', games.getGame);

// -------------------------------------------------------------
// PROTECTED ROUTES (admin-only)
// -------------------------------------------------------------

// Create new game
router.post('/', authMiddleware, games.createGame);

// Update an existing game
router.put('/:code', authMiddleware, games.updateGame);

// Delete a game
router.delete('/:code', authMiddleware, games.deleteGame);

// Bulk upsert (admin only)
router.post('/bulk', authMiddleware, games.bulkUpsertGames);

module.exports = router;
