require('dotenv').config();
const { sequelize, Event, SeatInventory } = require('./models');

// Must match exactly what SeatSelectionPage.jsx has in FRONTEND_EVENTS + VENUE_LAYOUTS
const EVENTS = [
    {
        title: 'The Secret Letter',
        subtitle: 'Leicester',
        date: new Date('2026-04-24T19:00:00'),
        venue: 'Maher Centre',
        city: 'Leicester',
        category: 'Concert',
        description: 'An unforgettable live experience.',
        price: 'From £30',
        image: '/images/event1.jpg',
        mapType: 'standard'
    },
    {
        title: 'The Secret Letter',
        subtitle: 'London',
        date: new Date('2026-04-25T19:00:00'),
        venue: 'The Royal Regency',
        city: 'London',
        category: 'Concert',
        description: 'An unforgettable live experience.',
        price: 'From £30',
        image: '/images/event2.jpg',
        mapType: 'standard'
    },
    {
        title: 'The Secret Letter',
        subtitle: 'Manchester',
        date: new Date('2026-05-01T19:00:00'),
        venue: 'Forum Centre',
        city: 'Manchester',
        category: 'Concert',
        description: 'An unforgettable live experience.',
        price: 'From £30',
        image: '/images/event3.jpg',
        mapType: 'standard'
    },
    {
        title: 'The Secret Letter',
        subtitle: 'Edinburgh',
        date: new Date('2026-05-02T19:00:00'),
        venue: 'Assembly Rooms',
        city: 'Edinburgh',
        category: 'Concert',
        description: 'An unforgettable live experience.',
        price: 'From £30',
        image: '/images/event4.jpg',
        mapType: 'standard'
    },
    {
        title: 'The Secret Letter',
        subtitle: 'Cardiff',
        date: new Date('2026-05-03T19:00:00'),
        venue: 'Principality Stadium',
        city: 'Cardiff',
        category: 'Concert',
        description: 'An unforgettable live experience.',
        price: 'From £30',
        image: '/images/event5.jpg',
        mapType: 'standard'
    }
];

// Mirrors VENUE_LAYOUTS in SeatSelectionPage.jsx — must match exactly
const VENUE_LAYOUTS = {
    Leicester: {
        zones: [
            {
                id: 'vvip', name: 'VVIP', price: 70, blocks: [
                    { rCount: 2, cStart: 0, cCount: 12, rowLabels: ['A', 'B'] },
                    { rCount: 2, cStart: 12, cCount: 12, rowLabels: ['A', 'B'] }
                ]
            },
            {
                id: 'vip', name: 'VIP', price: 50, blocks: [
                    { rCount: 6, cStart: 0, cCount: 16, rowLabels: ['C', 'D', 'E', 'F', 'G', 'H'] },
                    { rCount: 6, cStart: 16, cCount: 16, rowLabels: ['C', 'D', 'E', 'F', 'G', 'H'] }
                ]
            },
            {
                id: 'diamond', name: 'Diamond', price: 40, blocks: [
                    { rCount: 10, cStart: 0, cCount: 20, rowLabels: ['I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R'] },
                    { rCount: 10, cStart: 20, cCount: 20, rowLabels: ['I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R'] }
                ]
            },
            {
                id: 'platinum', name: 'Platinum', price: 30, blocks: [
                    { rCount: 4, cStart: 0, cCount: 20, rowLabels: ['S', 'T', 'U', 'V'] },
                    { rCount: 4, cStart: 20, cCount: 20, rowLabels: ['S', 'T', 'U', 'V'] }
                ]
            }
        ]
    },
    London: {
        zones: [
            {
                id: 'vvip', name: 'VVIP', price: 70, blocks: [
                    { rCount: 3, cStart: 0, cCount: 12, rowLabels: ['A', 'B', 'C'] },
                    { rCount: 3, cStart: 12, cCount: 12, rowLabels: ['A', 'B', 'C'] }
                ]
            },
            {
                id: 'vip', name: 'VIP', price: 50, blocks: [
                    { rCount: 6, cStart: 0, cCount: 16, rowLabels: ['D', 'E', 'F', 'G', 'H', 'I'] },
                    { rCount: 6, cStart: 16, cCount: 16, rowLabels: ['D', 'E', 'F', 'G', 'H', 'I'] }
                ]
            },
            {
                id: 'diamond', name: 'Diamond', price: 40, blocks: [
                    { rCount: 7, cStart: 0, cCount: 20, rowLabels: ['J', 'K', 'L', 'M', 'N', 'O', 'P'] },
                    { rCount: 7, cStart: 20, cCount: 20, rowLabels: ['J', 'K', 'L', 'M', 'N', 'O', 'P'] }
                ]
            },
            {
                id: 'platinum', name: 'Platinum', price: 30, blocks: [
                    { rCount: 4, cStart: 0, cCount: 20, rowLabels: ['Q', 'R', 'S', 'T'] },
                    { rCount: 4, cStart: 20, cCount: 20, rowLabels: ['Q', 'R', 'S', 'T'] }
                ]
            }
        ]
    },
    Manchester: {
        zones: [
            {
                id: 'vvip', name: 'VVIP', price: 70, blocks: [
                    { rCount: 3, cStart: 0, cCount: 12, rowLabels: ['A', 'B', 'C'] },
                    { rCount: 3, cStart: 12, cCount: 12, rowLabels: ['A', 'B', 'C'] }
                ]
            },
            {
                id: 'vip', name: 'VIP', price: 50, blocks: [
                    { rCount: 6, cStart: 0, cCount: 16, rowLabels: ['D', 'E', 'F', 'G', 'H', 'I'] },
                    { rCount: 6, cStart: 16, cCount: 16, rowLabels: ['D', 'E', 'F', 'G', 'H', 'I'] }
                ]
            },
            {
                id: 'diamond', name: 'Diamond', price: 40, blocks: [
                    { rCount: 7, cStart: 0, cCount: 20, rowLabels: ['J', 'K', 'L', 'M', 'N', 'O', 'P'] },
                    { rCount: 7, cStart: 20, cCount: 20, rowLabels: ['J', 'K', 'L', 'M', 'N', 'O', 'P'] }
                ]
            },
            {
                id: 'platinum', name: 'Platinum', price: 30, blocks: [
                    { rCount: 4, cStart: 0, cCount: 20, rowLabels: ['Q', 'R', 'S', 'T'] },
                    { rCount: 4, cStart: 20, cCount: 20, rowLabels: ['Q', 'R', 'S', 'T'] }
                ]
            }
        ]
    },
    default: {
        zones: [
            {
                id: 'standard', name: 'Standard', price: 30, blocks: [
                    { rCount: 10, cStart: 0, cCount: 20, rowLabels: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'] }
                ]
            }
        ]
    }
};

function generateSeatsForEvent(eventId, city) {
    const layout = VENUE_LAYOUTS[city] || VENUE_LAYOUTS.default;
    const seats = [];

    for (const zone of layout.zones) {
        for (const block of zone.blocks) {
            for (let r = 0; r < block.rCount; r++) {
                for (let c = 0; c < block.cCount; c++) {
                    const rowLabel = block.rowLabels[r] || String.fromCharCode(65 + r);
                    const colIdx = block.cStart + c + 1;
                    const identifier = `${zone.id.toUpperCase()} - ${rowLabel}${colIdx}`;
                    seats.push({
                        eventId,
                        identifier,
                        zone: zone.id.toUpperCase(),
                        price: zone.price,
                        status: 'available',
                        lockedAt: null
                    });
                }
            }
        }
    }

    return seats;
}

async function seed() {
    try {
        console.log('🌱 Starting clean database seed...');
        await sequelize.sync({ force: true });
        console.log('✅ Tables created fresh.');

        for (const eventData of EVENTS) {
            const event = await Event.create(eventData);
            const seats = generateSeatsForEvent(event.id, event.city);
            await SeatInventory.bulkCreate(seats);
            console.log(`  📅 ${event.title} — ${event.city}: ${seats.length} seats`);
        }

        console.log('\n🎉 Seed complete! All events and seats match the frontend.');
        process.exit(0);
    } catch (err) {
        console.error('❌ Seed failed:', err);
        process.exit(1);
    }
}

seed();
