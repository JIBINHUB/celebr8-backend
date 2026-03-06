const express = require('express');
const router = express.Router();
const { SeatInventory, Booking, sequelize } = require('../models');
const { Op } = require('sequelize');

// ============================================================
// BACKGROUND CLEANUP — Release seats held > 3 minutes
// ============================================================
async function cleanupExpiredSeats() {
    try {
        const threeMinsAgo = new Date(Date.now() - 3 * 60 * 1000);
        const [affectedCount] = await SeatInventory.update(
            { status: 'available', lockedAt: null, bookingId: null },
            { where: { status: 'holding', lockedAt: { [Op.lt]: threeMinsAgo } } }
        );
        if (affectedCount > 0) {
            console.log(`🔓 Released ${affectedCount} expired held seats`);
        }
        return affectedCount;
    } catch (err) {
        // Never crash the server — log and continue
        console.error('⚠️ Cleanup error (non-fatal):', err.message);
        return 0;
    }
}

router.cleanupExpiredSeats = cleanupExpiredSeats;

// ============================================================
// POST /lock-seats — Atomic Seat Locking (3-min hold)
// ============================================================
router.post('/lock-seats', async (req, res) => {
    const { eventId, seatIds, seatIdentifiers } = req.body;

    // Input validation
    if (!eventId) {
        return res.status(400).json({ message: 'Missing eventId' });
    }
    if ((!seatIds || !Array.isArray(seatIds) || seatIds.length === 0) &&
        (!seatIdentifiers || !Array.isArray(seatIdentifiers) || seatIdentifiers.length === 0)) {
        return res.status(400).json({ message: 'No seats specified' });
    }

    // Non-blocking cleanup (don't let this crash the lock)
    try { await cleanupExpiredSeats(); } catch (_) { /* logged inside */ }

    try {
        const result = await sequelize.transaction(async (t) => {
            // SELF-HEALING: release expired holdings INSIDE the transaction
            // This guarantees seats are freed even if the background timer wasn't running
            const threeMinsAgo = new Date(Date.now() - 3 * 60 * 1000);
            await SeatInventory.update(
                { status: 'available', lockedAt: null, bookingId: null },
                { where: { eventId, status: 'holding', lockedAt: { [Op.lt]: threeMinsAgo } }, transaction: t }
            );

            let requestedSeats = [];

            if (seatIds && seatIds.length > 0) {
                requestedSeats = await SeatInventory.findAll({
                    where: { eventId, id: { [Op.in]: seatIds } },
                    lock: true, transaction: t
                });
            } else if (seatIdentifiers && seatIdentifiers.length > 0) {
                requestedSeats = await SeatInventory.findAll({
                    where: { eventId, identifier: { [Op.in]: seatIdentifiers } },
                    lock: true, transaction: t
                });
            }

            if (!requestedSeats || requestedSeats.length === 0) {
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
        console.error('LOCK-SEATS ERROR:', err.message);
        res.status(409).json({ message: err.message });
    }
});

// ============================================================
// POST /unlock-seats — Release held seats (user navigated away)
// ============================================================
router.post('/unlock-seats', async (req, res) => {
    const { eventId, seatIds, seatIdentifiers } = req.body;
    try {
        const where = { status: 'holding' };

        // Add eventId filter when provided for safety
        if (eventId) where.eventId = eventId;

        if (seatIds && Array.isArray(seatIds) && seatIds.length > 0) {
            where.id = { [Op.in]: seatIds };
        } else if (seatIdentifiers && Array.isArray(seatIdentifiers) && seatIdentifiers.length > 0) {
            where.identifier = { [Op.in]: seatIdentifiers };
        } else {
            return res.status(400).json({ message: 'No seats specified' });
        }

        await SeatInventory.update(
            { status: 'available', lockedAt: null, bookingId: null },
            { where }
        );
        res.json({ message: 'Seats released' });
    } catch (err) {
        // Never crash — best effort release
        console.error('UNLOCK-SEATS ERROR:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// ============================================================
// GET /:eventId/seats — Fetch Seat Map (with cleanup)
// ============================================================
router.get('/:eventId/seats', async (req, res) => {
    try {
        // Non-blocking cleanup before serving the map
        try { await cleanupExpiredSeats(); } catch (_) { /* logged inside */ }

        const seats = await SeatInventory.findAll({
            where: { eventId: req.params.eventId },
            attributes: ['id', 'identifier', 'zone', 'price', 'status']
        });
        res.json(seats);
    } catch (err) {
        console.error('FETCH-SEATS ERROR:', err.message);
        res.status(500).json({ error: 'Failed to fetch seats' });
    }
});

module.exports = router;
