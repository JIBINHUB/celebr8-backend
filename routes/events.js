const express = require('express');
const router = express.Router();
const { Event } = require('../models');

// Fetch all events
router.get('/', async (req, res) => {
    try {
        const events = await Event.findAll();
        res.json(events);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch events' });
    }
});

module.exports = router;
