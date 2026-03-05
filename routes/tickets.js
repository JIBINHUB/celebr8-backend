const express = require('express');
const router = express.Router();
const { Ticket, SeatInventory, Event, Booking, User } = require('../models');

// Fetch Public Ticket
router.get('/:id', async (req, res) => {
    try {
        const ticket = await Ticket.findOne({
            where: { id: req.params.id },
            include: [{ model: SeatInventory, include: [Event] }]
        });
        if (!ticket) return res.status(404).json({ error: 'Ticket not found' });
        res.json(ticket);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Verify Ticket by QR Code (Public Route for Customer Scans)
router.get('/verify/:code', async (req, res) => {
    try {
        const ticket = await Ticket.findOne({
            where: { qrCodeString: req.params.code },
            include: [
                { model: SeatInventory, include: [Event] },
                { model: Booking, include: [User] }
            ]
        });

        if (!ticket) {
            return res.status(404).json({ message: 'Invalid or unknown ticket code.' });
        }

        res.json({
            id: ticket.id,
            status: ticket.status,
            seat: ticket.SeatInventory?.identifier,
            zone: ticket.SeatInventory?.zone,
            event: ticket.SeatInventory?.Event?.title,
            venue: ticket.SeatInventory?.Event?.venue,
            date: ticket.SeatInventory?.Event?.date,
            customer: ticket.Booking?.User?.name || 'Guest',
            email: ticket.Booking?.User?.email,
            whatsapp: ticket.Booking?.User?.whatsapp,
            paymentStatus: ticket.Booking?.status === 'confirmed' ? 'Paid' : 'Pending',
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
