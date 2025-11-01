const express = require('express');
const { verifyPassword } = require('../controllers/authController');

const router = express.Router();

router.post('/verify-password', verifyPassword);

module.exports = router;
