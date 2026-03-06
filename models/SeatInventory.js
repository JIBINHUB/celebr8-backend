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
        { fields: ['status'] },
        { fields: ['eventId', 'status'] },       // Cleanup query: WHERE eventId=? AND status='holding'
        { fields: ['eventId', 'identifier'] },    // Seat lookup: WHERE eventId=? AND identifier IN (...)
        { fields: ['status', 'lockedAt'] }        // Expiry sweep: WHERE status='holding' AND lockedAt < ?
    ]
});

module.exports = SeatInventory;
