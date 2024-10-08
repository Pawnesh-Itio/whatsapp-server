const express = require('express');
const { addSession,checkSession } = require('../Controllers/authController');

const router = express.Router();

router.post('/add-session', addSession);

module.exports = router;
