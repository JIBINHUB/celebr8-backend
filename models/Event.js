const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Event = sequelize.define('Event', {
    title: { type: DataTypes.STRING, allowNull: false },
    subtitle: { type: DataTypes.STRING },
    date: { type: DataTypes.DATE, allowNull: false },
    venue: { type: DataTypes.STRING, allowNull: false },
    city: { type: DataTypes.STRING },
    category: { type: DataTypes.STRING },
    description: { type: DataTypes.TEXT },
    price: { type: DataTypes.STRING },
    image: { type: DataTypes.STRING },
    mapType: { type: DataTypes.STRING, defaultValue: 'standard' },
    totalSeats: { type: DataTypes.INTEGER, defaultValue: 600 }
});

module.exports = Event;
