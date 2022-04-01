const express = require('express');
const router = express.Router({ mergeParams: true });

const users = require('../models/users');
const Users = require('../controllers/users');

router.route('/')
    .get('')
    .post()




module.exports = router;