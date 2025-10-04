// src/routes/index.js
const { Router } = require('express');
const games = require('./games');
const results = require('./results');
const users = require('./users');  
const auth = require('./auth');

const router = Router();
router.use('/games', games);
router.use('/results', results);
router.use('/users', users); 
router.use('/auth', auth); 

module.exports = router;