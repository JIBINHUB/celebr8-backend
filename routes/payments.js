const express = require('express');
const router = express.Router();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const crypto = require('crypto');
const { Booking, Event, User, SeatInventory, Ticket, sequelize } = require('../models');

// Step 1: Create Stripe Checkout Session
router.post('/create-checkout', async (req, res) => {
    const { eventId, seatIds, seatIdentifiers, customerName, customerEmail, customerWhatsapp } = req.body;

    try {
        const result = await sequelize.transaction(async (t) => {
            let seats;
            if (seatIds && seatIds.length > 0) {
                seats = await SeatInventory.findAll({
                    where: { id: seatIds, status: 'holding' },
                    lock: true, transaction: t
                });
            } else if (seatIdentifiers && seatIdentifiers.length > 0) {
                seats = await SeatInventory.findAll({
                    where: { eventId, identifier: seatIdentifiers, status: 'holding' },
                    lock: true, transaction: t
                });
            }

            if (!seats || seats.length === 0) {
                throw new Error('Seats have expired or were taken. Please select again.');
            }

            let user = await User.findOne({ where: { email: customerEmail }, transaction: t });
            if (!user) {
                user = await User.create({
                    name: customerName,
                    email: customerEmail,
                    whatsapp: customerWhatsapp || ''
                }, { transaction: t });
            } else {
                await user.update({ name: customerName, whatsapp: customerWhatsapp || '' }, { transaction: t });
            }

            const totalAmount = seats.reduce((sum, s) => sum + s.price, 0);
            const event = await Event.findByPk(eventId, { transaction: t });

            const booking = await Booking.create({
                userId: user.id,
                eventId,
                totalAmount,
                status: 'pending'
            }, { transaction: t });

            // Link seats to this booking, keep 'holding' status until payment verified
            await SeatInventory.update(
                { bookingId: booking.id },
                { where: { id: seats.map(s => s.id) }, transaction: t }
            );

            const origin = process.env.FRONTEND_URL || 'https://honeydew-wolverine-433113.hostingersite.com';

            const session = await stripe.checkout.sessions.create({
                payment_method_types: ['card'],
                line_items: seats.map(seat => ({
                    price_data: {
                        currency: 'gbp',
                        product_data: {
                            name: `${event.title} — ${event.subtitle || event.city}`,
                            description: seat.identifier,
                        },
                        unit_amount: Math.round(seat.price * 100),
                    },
                    quantity: 1,
                })),
                mode: 'payment',
                customer_email: customerEmail,
                success_url: `${origin}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
                cancel_url: `${origin}/payment-failed`,
                metadata: {
                    bookingId: booking.id.toString(),
                    seatIds: seats.map(s => s.id).join(','),
                    customerName,
                    customerEmail,
                    customerWhatsapp: customerWhatsapp || ''
                }
            });

            await booking.update({ stripeSessionId: session.id }, { transaction: t });
            return { checkoutUrl: session.url, sessionId: session.id };
        });

        res.json({ checkoutUrl: result.checkoutUrl, id: result.sessionId });
    } catch (err) {
        console.error('Stripe Checkout Error:', err.message);
        res.status(500).json({ message: err.message });
    }
});

// Step 2a: Verify Payment (GET — called by frontend on redirect back)
router.get('/verify/:sessionId', async (req, res) => {
    return verifyPayment(req.params.sessionId, res);
});

// Step 2b: Verify Payment (POST — alternative)
router.post('/verify', async (req, res) => {
    return verifyPayment(req.body.sessionId, res);
});

async function verifyPayment(sessionId, res) {
    if (!sessionId) return res.status(400).json({ error: 'No session ID provided' });
    try {
        const session = await stripe.checkout.sessions.retrieve(sessionId);
        if (session.payment_status !== 'paid') {
            return res.status(400).json({ error: 'Payment not completed.', status: 'failed' });
        }

        const { bookingId, seatIds: seatIdStr, customerName, customerEmail, customerWhatsapp } = session.metadata;

        const result = await sequelize.transaction(async (t) => {
            const booking = await Booking.findByPk(bookingId, {
                include: [User, Event],
                transaction: t
            });
            if (!booking) throw new Error('Booking not found');

            // Idempotent — already confirmed
            if (booking.status === 'confirmed') {
                const tickets = await Ticket.findAll({
                    where: { bookingId },
                    include: [{ model: SeatInventory }],
                    transaction: t
                });
                return formatPayload(booking, tickets);
            }

            await booking.update({ status: 'confirmed' }, { transaction: t });

            const seatIds = seatIdStr.split(',').map(Number);
            await SeatInventory.update(
                { status: 'booked', lockedAt: null },
                { where: { id: seatIds }, transaction: t }
            );

            const seats = await SeatInventory.findAll({ where: { id: seatIds }, transaction: t });
            const tickets = [];
            for (const seat of seats) {
                const qrToken = crypto.randomBytes(16).toString('hex');
                const ticket = await Ticket.create({
                    bookingId: parseInt(bookingId),
                    seatId: seat.id,
                    qrCodeString: qrToken
                }, { transaction: t });
                tickets.push({ ...ticket.toJSON(), SeatInventory: seat });
            }

            return formatPayload(booking, tickets);
        });

        res.json(result);
    } catch (err) {
        console.error('Verify Error:', err);
        res.status(500).json({ error: err.message });
    }
}

function formatPayload(booking, tickets) {
    return {
        success: true,
        status: 'confirmed',
        bookingId: booking.id,
        event: booking.Event,
        user: booking.User,
        totalAmount: booking.totalAmount,
        currency: 'GBP',
        tickets: tickets.map(t => ({
            id: t.id,
            qrCodeString: t.qrCodeString,
            seatIdentifier: t.SeatInventory?.identifier || '',
            zone: t.SeatInventory?.zone || '',
            price: t.SeatInventory?.price || 0
        }))
    };
}

module.exports = router;
