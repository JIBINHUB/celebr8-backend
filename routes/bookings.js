const express = require('express');
const router = express.Router();
const { SeatInventory, Booking, sequelize } = require('../models');
const { Op } = require('sequelize');

// Background cleanup of expired holding seats (called on every request + setInterval)
async function cleanupExpiredSeats() {
    const threeMinsAgo = new Date(Date.now() - 3 * 60 * 1000);
    const [affectedCount] = await SeatInventory.update(
        { status: 'available', lockedAt: null, bookingId: null },
        { where: { status: 'holding', lockedAt: { [Op.lt]: threeMinsAgo } } }
    );
    if (affectedCount > 0) {
        console.log(`🔓 Released ${affectedCount} expired held seats`);
    }
    return affectedCount;
}

// Export cleanup for use in index.js background timer
router.cleanupExpiredSeats = cleanupExpiredSeats;

// POST /lock-seats — Atomic Seat Locking (3-min hold)
router.post('/lock-seats', async (req, res) => {
    const { eventId, seatIdentifiers } = req.body;

    // Always cleanup expired seats first
    await cleanupExpiredSeats();

    try {
        const result = await sequelize.transaction(async (t) => {
            const requestedSeats = await SeatInventory.findAll({
                where: { eventId, identifier: { [Op.in]: seatIdentifiers } },
                lock: true,
                transaction: t
            });

            if (requestedSeats.length === 0) {
                throw new Error('No matching seats found. Please refresh.');
            }

            const unavailable = requestedSeats.filter(s => s.status !== 'available');
            if (unavailable.length > 0) {
                const takenNames = unavailable.map(s => s.identifier);
                throw new Error(`Seats already taken: ${takenNames.join(', ')}`);
            }

            const now = new Date();
            await SeatInventory.update(
                { status: 'holding', lockedAt: now },
                { where: { id: requestedSeats.map(s => s.id) }, transaction: t }
            );

            return {
                seatIds: requestedSeats.map(s => s.id),
                seatIdentifiers: requestedSeats.map(s => s.identifier),
                lockedAt: now,
                expiresAt: new Date(now.getTime() + 3 * 60 * 1000)
            };
        });

        res.json(result);
    } catch (err) {
        res.status(409).json({ message: err.message });
    }
});

// POST /unlock-seats — Release held seats (user navigated away)
router.post('/unlock-seats', async (req, res) => {
    const { seatIds, seatIdentifiers } = req.body;
    try {
        const where = {};
        if (seatIds && seatIds.length > 0) {
            where.id = { [Op.in]: seatIds };
        } else if (seatIdentifiers && seatIdentifiers.length > 0) {
            where.identifier = { [Op.in]: seatIdentifiers };
        } else {
            return res.status(400).json({ message: 'No seats specified' });
        }
        where.status = 'holding';

        await SeatInventory.update(
            { status: 'available', lockedAt: null, bookingId: null },
            { where }
        );
        res.json({ message: 'Seats released' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /:eventId/seats — Fetch Seat Map
router.get('/:eventId/seats', async (req, res) => {
    try {
        // Cleanup expired seats before returning the map
        await cleanupExpiredSeats();
        const seats = await SeatInventory.findAll({
            where: { eventId: req.params.eventId },
            attributes: ['id', 'identifier', 'zone', 'price', 'status']
        });
        res.json(seats);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch seats' });
    }
});

module.exports = router;
