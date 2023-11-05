// routes/profileRoute.js
const express = require('express');
const router = express.Router();
const profileController = require('../controllers/profileController');

router.get('/profile', profileController);

module.exports = router;
