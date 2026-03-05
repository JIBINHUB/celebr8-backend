const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
require('dotenv').config();

const { sequelize } = require('./models');
const cacheControl = require('./middleware/cacheControl');

// Import Routes
const eventRoutes = require('./routes/events');
const bookingRoutes = require('./routes/bookings');
const paymentRoutes = require('./routes/payments');
const ownerRoutes = require('./routes/owner');
const ticketRoutes = require('./routes/tickets');

const app = express();

// Global Middlewares
app.use(helmet());
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(cacheControl);

// Health Check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', version: '3.0.0', uptime: process.uptime() });
});

// Apply Routes
app.use('/api/events', eventRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/owner', ownerRoutes);
app.use('/api/tickets', ticketRoutes);

// Database Sync & Server Startup
const PORT = process.env.PORT || 5000;

sequelize.sync({ alter: true }).then(() => {
    console.log('✅ Sequelize Models Synchronized.');

    const server = app.listen(PORT, '0.0.0.0', () => {
        console.log(`🚀 API Server listening on port ${PORT}`);
    });

    // ========== BACKGROUND SEAT EXPIRY PROCESS ==========
    // Runs every 30 seconds to automatically release seats
    // that have been in 'holding' status for more than 3 minutes
    setInterval(async () => {
        try {
            if (bookingRoutes.cleanupExpiredSeats) {
                await bookingRoutes.cleanupExpiredSeats();
            }
        } catch (err) {
            console.error('Background cleanup error:', err.message);
        }
    }, 30 * 1000); // Every 30 seconds

    console.log('⏰ Background seat expiry timer started (30s interval)');

}).catch(err => {
    console.error('❌ CRITICAL: Failed to sync Models.', err);
});
