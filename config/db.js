const { Sequelize } = require('sequelize');
require('dotenv').config();

const sequelize = new Sequelize(
    process.env.DB_NAME,
    process.env.DB_USER,
    process.env.DB_PASSWORD,
    {
        host: process.env.DB_HOST || 'localhost',
        dialect: 'mysql',
        logging: false, // Prevent terminal spam in production
        pool: {
            max: 50,
            min: 2,
            acquire: 60000,
            idle: 15000,
            evict: 15000
        },
        retry: {
            match: [/Deadlock/i, Sequelize.ConnectionError],
            max: 5
        }
    }
);

// Verify Connection
sequelize.authenticate()
    .then(() => console.log('✅ Database Connection Established.'))
    .catch(err => console.error('❌ Database Connection Error:', err));

module.exports = sequelize;
