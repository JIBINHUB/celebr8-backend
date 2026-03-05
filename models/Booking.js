const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Booking = sequelize.define('Booking', {
    totalAmount: { type: DataTypes.FLOAT, allowNull: false },
    status: {
        type: DataTypes.ENUM('pending', 'confirmed', 'failed', 'cancelled'),
        defaultValue: 'pending'
    },
    stripeSessionId: { type: DataTypes.STRING }
});

module.exports = Booking;
