const { Sequelize } = require('sequelize');
require('dotenv').config();

const isSSH = !!process.env.SSH_HOST;

const sequelize = new Sequelize(
    process.env.DB_NAME,
    process.env.DB_USER,
    process.env.DB_PASSWORD,
    {
        host: isSSH ? '127.0.0.1' : (process.env.DB_HOST || 'localhost'),
        port: isSSH ? (process.env.DB_PORT || 33060) : (process.env.DB_PORT || 3306),
        dialect: 'mysql',
        logging: false,
        dialectOptions: {
            connectTimeout: 20000,           // 20s for slow cloud DNS
            // Keep TCP connection alive through Hostinger's idle killer
            supportBigNumbers: true,
            bigNumberStrings: true
        },
        pool: {
            max: 15,                         // Hostinger shared MySQL ≈30 max; leave room
            min: 2,
            acquire: 30000,                  // 30s to acquire a connection
            idle: 10000,                     // Release idle connections after 10s
            evict: 10000                     // Check for idle connections every 10s
        },
        retry: {
            match: [
                /Deadlock/i,
                /ECONNRESET/,
                /ETIMEDOUT/,
                /PROTOCOL_CONNECTION_LOST/,
                /ER_LOCK_WAIT_TIMEOUT/,
                Sequelize.ConnectionError,
                Sequelize.TimeoutError
            ],
            max: 5
        }
    }
);

module.exports = sequelize;
