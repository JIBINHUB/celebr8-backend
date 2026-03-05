const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { Event, Booking, Ticket, SeatInventory, User, sequelize } = require('../models');

const OWNER_PASSWORD = process.env.OWNER_PASSWORD || '8080';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '3699';

// Simple token store (in-memory — resets on server restart)
const validTokens = new Set();

// Auth middleware — checks Bearer token
const authMiddleware = (req, res, next) => {
    const auth = req.headers['authorization'];
    if (!auth) return res.status(401).json({ message: 'No authorization header' });
    const token = auth.replace('Bearer ', '');
    if (!validTokens.has(token)) return res.status(401).json({ message: 'Invalid or expired token' });
    next();
};

// POST /login — Owner Login
router.post('/login', async (req, res) => {
    const { password } = req.body;
    if (password !== OWNER_PASSWORD) {
        return res.status(401).json({ message: 'Invalid password' });
    }
    const token = crypto.randomBytes(32).toString('hex');
    validTokens.add(token);
    res.json({ token });
});

// POST /admin-login — Admin Control Pin
router.post('/admin-login', authMiddleware, async (req, res) => {
    const { pin } = req.body;
    if (pin !== ADMIN_PASSWORD) {
        return res.status(401).json({ message: 'Invalid admin PIN' });
    }
    res.json({ success: true });
});

// GET /stats — Dashboard Statistics
router.get('/stats', authMiddleware, async (req, res) => {
    try {
        const totalBookings = await Booking.count({ where: { status: 'confirmed' } });
        const totalRevenue = await Booking.sum('totalAmount', { where: { status: 'confirmed' } }) || 0;
        const totalTickets = await Ticket.count();
        const usedTickets = await Ticket.count({ where: { status: 'used' } });
        const events = await Event.findAll();

        // Per-event stats
        const eventStats = [];
        for (const event of events) {
            const totalSeats = await SeatInventory.count({ where: { eventId: event.id } });
            const bookedSeats = await SeatInventory.count({ where: { eventId: event.id, status: 'booked' } });
            const holdingSeats = await SeatInventory.count({ where: { eventId: event.id, status: 'holding' } });
            eventStats.push({
                id: event.id,
                title: event.title,
                totalSeats,
                bookedSeats,
                holdingSeats,
                availableSeats: totalSeats - bookedSeats - holdingSeats,
                fillRate: totalSeats > 0 ? ((bookedSeats / totalSeats) * 100).toFixed(1) : 0
            });
        }

        res.json({
            totalBookings,
            totalRevenue,
            totalTickets,
            usedTickets,
            eventStats
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /bookings — All Confirmed Bookings
router.get('/bookings', authMiddleware, async (req, res) => {
    try {
        const bookings = await Booking.findAll({
            where: { status: 'confirmed' },
            include: [
                { model: User },
                { model: Event, attributes: ['id', 'title'] },
                { model: SeatInventory, attributes: ['identifier', 'zone', 'price'] },
                { model: Ticket, attributes: ['id', 'qrCodeString', 'status'] }
            ],
            order: [['createdAt', 'DESC']],
            limit: parseInt(req.query.limit) || 500
        });
        res.json(bookings);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /events — All Events
router.get('/events', authMiddleware, async (req, res) => {
    try {
        const events = await Event.findAll();
        res.json(events);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /scan — QR Code Check-In
router.post('/scan', authMiddleware, async (req, res) => {
    const { qrData } = req.body;
    try {
        const ticket = await Ticket.findOne({
            where: { qrCodeString: qrData },
            include: [
                { model: SeatInventory, include: [Event] },
                { model: Booking, include: [User] }
            ]
        });

        if (!ticket) {
            return res.status(404).json({ message: 'Invalid QR Code. Ticket not found.' });
        }

        if (ticket.status === 'used') {
            return res.status(409).json({
                message: 'This ticket has already been checked in.',
                ticket: {
                    seat: ticket.SeatInventory?.identifier,
                    event: ticket.SeatInventory?.Event?.title,
                    guest: ticket.Booking?.User?.name
                }
            });
        }

        await ticket.update({ status: 'used' });

        res.json({
            message: 'Check-In Successful!',
            ticket: {
                seat: ticket.SeatInventory?.identifier,
                event: ticket.SeatInventory?.Event?.title,
                venue: ticket.SeatInventory?.Event?.venue,
                customer: ticket.Booking?.User?.name || 'Guest',
                email: ticket.Booking?.User?.email || '',
                whatsapp: ticket.Booking?.User?.whatsapp || '',
                paymentStatus: ticket.Booking?.status === 'confirmed' ? 'Paid' : 'Pending',
                zone: ticket.SeatInventory?.zone
            }
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /reset-db — Deep Database Reset (Admin Only)
router.post('/reset-db', authMiddleware, async (req, res) => {
    try {
        await sequelize.transaction(async (t) => {
            await Ticket.destroy({ where: {}, transaction: t });
            await Booking.destroy({ where: {}, transaction: t });
            await SeatInventory.update(
                { status: 'available', lockedAt: null, bookingId: null },
                { where: {}, transaction: t }
            );
        });
        res.json({ message: 'Database has been fully reset. All seats are now available.' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
