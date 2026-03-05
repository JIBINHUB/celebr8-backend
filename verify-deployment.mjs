const BASE = 'https://honeydew-wolverine-433113.hostingersite.com';

async function verify() {
    console.log("=== TEST 1: GET /api/events ===");
    const evRes = await fetch(`${BASE}/api/events`);
    const events = await evRes.json();
    console.log(`Status: ${evRes.status}`);
    events.forEach(e => console.log(`  Event ${e.id}: ${e.title} — ${e.city}`));

    const eventId = events[0]?.id;

    console.log(`\n=== TEST 2: Lock seat 'VVIP - A1' for event ${eventId} ===`);
    const lockRes = await fetch(`${BASE}/api/bookings/lock-seats`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId, seatIdentifiers: ['VVIP - A1'] })
    });
    const lockData = await lockRes.json();
    console.log(`Status: ${lockRes.status}`);
    console.log('Response:', JSON.stringify(lockData));

    if (lockData.seatIds) {
        console.log(`\n=== TEST 3: Try to lock same seat again (should fail) ===`);
        const lock2Res = await fetch(`${BASE}/api/bookings/lock-seats`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ eventId, seatIdentifiers: ['VVIP - A1'] })
        });
        const lock2Data = await lock2Res.json();
        console.log(`Status: ${lock2Res.status}, Message: ${lock2Data.message}`);

        console.log(`\n=== TEST 4: Unlock seat ===`);
        const unlockRes = await fetch(`${BASE}/api/bookings/unlock-seats`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ seatIds: lockData.seatIds })
        });
        console.log(`Unlock Status: ${unlockRes.status}`);
    }

    console.log('\n=== ALL TESTS COMPLETE ===');
}

verify().catch(e => console.error('FAIL:', e));
