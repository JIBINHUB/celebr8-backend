const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
require('dotenv').config();

const { sequelize, SeatInventory } = require('./models');
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
    res.json({ status: 'ok', version: '4.0.0', uptime: process.uptime() });
});

// Apply Routes
app.use('/api/events', eventRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/owner', ownerRoutes);
app.use('/api/tickets', ticketRoutes);

// ============================================================
// DATABASE SYNC & SERVER STARTUP
// ============================================================
const PORT = process.env.PORT || 5000;

async function startServer() {
    // 1. Establish SSH Tunnel (if configured for cloud deployment)
    if (process.env.SSH_HOST) {
        console.log(`🔒 Establishing SSH Tunnel to ${process.env.SSH_HOST}...`);
        const { Client } = require('ssh2');
        const net = require('net');

        await new Promise((resolve, reject) => {
            const sshClient = new Client();
            sshClient.on('ready', () => {
                const localPort = process.env.DB_PORT || 33060;
                const server = net.createServer(socket => {
                    sshClient.forwardOut('127.0.0.1', socket.remotePort, '127.0.0.1', 3306, (err, stream) => {
                        if (err) return socket.end();
                        socket.pipe(stream).pipe(socket);
                    });
                });
                server.listen(localPort, '127.0.0.1', () => {
                    console.log(`✅ SSH Tunnel established on local port ${localPort}`);
                    resolve();
                });
            }).on('error', reject).connect({
                host: process.env.SSH_HOST,
                port: process.env.SSH_PORT || 65002,
                username: process.env.SSH_USER,
                password: process.env.SSH_PASSWORD,
                keepaliveInterval: 10000
            });
        });
    }

    // 2. Sync Database & Start Server
    try {
        await sequelize.sync({ alter: true });
        console.log('✅ Sequelize Models Synchronized.');

        const server = app.listen(PORT, '0.0.0.0', () => {
            console.log(`🚀 API Server listening on port ${PORT}`);
        });

        // ============================================================
        // BACKGROUND SEAT EXPIRY (every 15 seconds)
        // ============================================================
        const cleanupInterval = setInterval(async () => {
            try {
                if (bookingRoutes.cleanupExpiredSeats) {
                    await bookingRoutes.cleanupExpiredSeats();
                }
            } catch (err) {
                console.error('Background cleanup error:', err.message);
            }
        }, 15 * 1000);

        console.log('⏰ Background seat expiry timer started (15s interval)');

        // ============================================================
        // GRACEFUL SHUTDOWN — Release all holding seats before exit
        // ============================================================
        async function gracefulShutdown(signal) {
            console.log(`\n⚡ ${signal} received. Graceful shutdown...`);

            // Stop accepting new requests
            clearInterval(cleanupInterval);

            try {
                // Release ALL currently held seats so users aren't stuck
                const [released] = await SeatInventory.update(
                    { status: 'available', lockedAt: null, bookingId: null },
                    { where: { status: 'holding' } }
                );
                if (released > 0) {
                    console.log(`🔓 Released ${released} holding seats during shutdown`);
                }
            } catch (err) {
                console.error('Shutdown cleanup error:', err.message);
            }

            server.close(() => {
                console.log('🛑 Server closed.');
                sequelize.close().then(() => {
                    console.log('🗄️ Database connections closed.');
                    process.exit(0);
                });
            });

            // Force exit after 10 seconds if graceful shutdown hangs
            setTimeout(() => {
                console.error('⚠️ Forced exit after 10s timeout');
                process.exit(1);
            }, 10000);
        }

        process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
        process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    } catch (err) {
        console.error('❌ CRITICAL: Failed to start server or sync Models.', err);
    }
} // end startServer

// ============================================================
// CRASH PROTECTION — Never let the server silently die
// ============================================================
process.on('uncaughtException', (err) => {
    console.error('🔴 UNCAUGHT EXCEPTION (server survived):', err.message);
    console.error(err.stack);
    // Don't exit — keep serving. Log for debugging.
});

process.on('unhandledRejection', (reason) => {
    console.error('🟡 UNHANDLED REJECTION (server survived):', reason);
    // Don't exit — keep serving. Log for debugging.
});

startServer();
