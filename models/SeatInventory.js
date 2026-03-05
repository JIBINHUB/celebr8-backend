const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const SeatInventory = sequelize.define('SeatInventory', {
    identifier: { type: DataTypes.STRING, allowNull: false }, // e.g., "DIAMOND - A1"
    zone: { type: DataTypes.STRING, allowNull: false },
    price: { type: DataTypes.FLOAT, allowNull: false },
    status: {
        type: DataTypes.ENUM('available', 'holding', 'booked'),
        defaultValue: 'available'
    },
    lockedAt: { type: DataTypes.DATE }
}, {
    indexes: [
        { fields: ['identifier'] },
        { fields: ['eventId'] },
        { fields: ['status'] }
    ]
});

module.exports = SeatInventory;
