const sequelize = require('../config/db');

const Event = require('./Event');
const User = require('./User');
const Booking = require('./Booking');
const SeatInventory = require('./SeatInventory');
const Ticket = require('./Ticket');

// Event <-> SeatInventory (1:N)
Event.hasMany(SeatInventory, { foreignKey: 'eventId', onDelete: 'CASCADE' });
SeatInventory.belongsTo(Event, { foreignKey: 'eventId' });

// User <-> Booking (1:N)
User.hasMany(Booking, { foreignKey: 'userId', onDelete: 'RESTRICT' });
Booking.belongsTo(User, { foreignKey: 'userId' });

// Event <-> Booking (1:N)
Event.hasMany(Booking, { foreignKey: 'eventId', onDelete: 'RESTRICT' });
Booking.belongsTo(Event, { foreignKey: 'eventId' });

// Booking <-> SeatInventory (1:N)
Booking.hasMany(SeatInventory, { foreignKey: 'bookingId', onDelete: 'SET NULL' });
SeatInventory.belongsTo(Booking, { foreignKey: 'bookingId' });

// Booking <-> Ticket (1:N)
Booking.hasMany(Ticket, { foreignKey: 'bookingId', onDelete: 'CASCADE' });
Ticket.belongsTo(Booking, { foreignKey: 'bookingId' });

// SeatInventory <-> Ticket (1:1)
SeatInventory.hasOne(Ticket, { foreignKey: 'seatId', onDelete: 'CASCADE' });
Ticket.belongsTo(SeatInventory, { foreignKey: 'seatId' });

module.exports = {
    sequelize,
    Event,
    User,
    Booking,
    SeatInventory,
    Ticket
};
