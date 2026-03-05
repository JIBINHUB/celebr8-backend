const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Ticket = sequelize.define('Ticket', {
    qrCodeString: { type: DataTypes.STRING, unique: true, allowNull: false },
    status: {
        type: DataTypes.ENUM('valid', 'used', 'cancelled'),
        defaultValue: 'valid'
    }
});

module.exports = Ticket;
