'use strict';
// Sample data: the trusted-partner directory (seeded once) and per-visitor demo accounts.
const crypto = require('crypto');

const uid = () => crypto.randomBytes(8).toString('hex');
const DAY = 864e5;
const EAT = 3 * 3600e3; // East Africa Time = UTC+3, no daylight saving

// epoch ms for "n days from today at h:m" in Uganda time
function atDay(n, h = 9, m = 0) {
  const start = Math.floor((Date.now() + EAT) / DAY) * DAY - EAT;
  return start + n * DAY + (h * 60 + m) * 60e3;
}

const SERV = {
  mech: ['General Repairs', 'Flat Tire Assistance', 'Engine Diagnostics', 'Battery Service', 'Electrical Repairs', 'Pre-trip Inspection'],
  tow: ['Light Vehicle Towing', 'Flatbed Recovery', 'Off-road Recovery', 'Accident Recovery', 'Long-distance Transport', 'Winching'],
  parts: ['Genuine Spare Parts', 'Tyres & Wheels', 'Batteries', 'Filters & Oils', 'Brake Parts', 'Delivery to Roadside'],
  tour: ['Safari Packages', 'Driver-Guides', 'Park Permits', 'Airport Pickup', 'Custom Itineraries', 'Group Tours'],
  stay: ['Safari Lodges', 'Hotel Rooms', 'Guesthouses', 'Emergency Overnight Stay', 'Airport Hotels', 'Camping Sites'],
  med: ['First Aid', 'Ambulance Transfer', 'Minor Injuries', 'General Consultation', 'Medicine Supply', 'Referral to Hospital'],
};

// [category, name, rating, reviews, minutes away, km away, tag, kind]  (sample data - replace with your real partners)
const PARTNERS = [
  ['mech', 'Safari Auto Care', 4.8, 120, 15, 4.8, 'Available 24/7', 'Mobile Mechanic'],
  ['mech', 'Bwebajja Garage', 4.6, 98, 25, 9.1, 'Open', 'Garage'],
  ['mech', 'Kampala Motor Fix', 4.7, 76, 30, 11.6, 'Available 24/7', 'Mobile Mechanic'],
  ['mech', 'Express Mechanics', 4.5, 60, 45, 17.2, 'Available 24/7', 'Mobile Mechanic'],
  ['mech', 'Nakawa Auto Clinic', 4.4, 41, 35, 12.9, 'Open', 'Garage'],
  ['tow', 'Swift Recovery Uganda', 4.8, 88, 22, 7.5, 'Available 24/7', 'Tow Operator'],
  ['tow', 'Entebbe Road Towing', 4.6, 64, 28, 10.3, 'Available 24/7', 'Tow Operator'],
  ['tow', 'Jinja Highway Recovery', 4.5, 52, 40, 16.8, 'Open', 'Recovery Team'],
  ['tow', 'Western Tow & Rescue', 4.7, 37, 55, 24.0, 'Available 24/7', 'Recovery Team'],
  ['parts', 'Kampala Auto Spares', 4.7, 142, 20, 6.2, 'Open', 'Spare Parts Shop'],
  ['parts', 'Ndeeba Tyre & Battery', 4.5, 87, 26, 8.9, 'Open', 'Tyres & Batteries'],
  ['parts', 'Kisenyi Genuine Parts', 4.4, 61, 32, 11.4, 'Open', 'Spare Parts Shop'],
  ['parts', 'Nakawa Motor Parts', 4.3, 45, 38, 13.6, 'Open', 'Spare Parts Shop'],
  ['tour', 'Safari Tours', 4.8, 210, 0, 3.4, 'Open', 'Tour Operator'],
  ['tour', 'Adventure Seekers', 4.7, 133, 0, 5.8, 'Open', 'Tour Operator'],
  ['tour', 'Wild Tracks Expeditions', 4.9, 95, 0, 7.2, 'Open', 'Tour Operator'],
  ['tour', 'Pearl of Africa Tours', 4.6, 78, 0, 9.9, 'Open', 'Tour Operator'],
  ['stay', 'Acacia Lodge', 4.7, 156, 0, 2.9, 'Open', 'Safari Lodge'],
  ['stay', 'Lakeview Guesthouse', 4.5, 92, 0, 6.1, 'Open', 'Guesthouse'],
  ['stay', 'Savannah Rest Inn', 4.4, 68, 0, 8.4, 'Open', 'Hotel'],
  ['stay', 'Pearl Gate Hotel', 4.6, 119, 0, 4.7, 'Open', 'Hotel'],
  ['med', 'Safari Care Clinic', 4.7, 54, 18, 5.2, 'Available 24/7', 'Clinic'],
  ['med', 'Entebbe Wellness Clinic', 4.5, 39, 30, 12.1, 'Open', 'Clinic'],
  ['med', 'Western Region Care Centre', 4.6, 28, 50, 21.7, 'Available 24/7', 'Health Centre'],
];

async function seedPartners(store) {
  if ((await store.all('partners')).length) return;
  for (const [cat, n, r, c, m, km, tag, kind] of PARTNERS) {
    const id = n.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    await store.put('partners', id, { id, cat, n, r, c, m, km, tag, kind, services: SERV[cat] });
  }
}

const emptyPortal = (userId) => ({
  uid: userId, stats: { active: 0, completed: 0, earnings: 0, change: 0 },
  series: [], requests: [], top: [], inventory: [], reviews: [], messages: [],
});

function demoPortal(userId) {
  const t = Date.now();
  const series = Array.from({ length: 28 }, (_, i) => Math.round((300000 + i * 14000 + (Math.sin(i * 1.3) + 1) * 90000) / 1000) * 1000);
  const R = (title, place, km, vehicle, minsAgo) => ({ id: uid(), title, place, km, vehicle, at: t - minsAgo * 60e3, status: 'new' });
  const parts = ['Brake Pads', 'Oil Filter', 'Air Filter', 'Fan Belt', 'Battery 12V', 'Alternator', 'Shock Absorber', 'Spark Plugs', 'Radiator', 'Clutch Kit', 'Wiper Blades', 'Headlight', 'Tyre 265/65R17', 'Fuel Pump', 'Water Pump', 'Timing Belt'];
  const prices = [45000, 18000, 22000, 25000, 280000, 320000, 160000, 30000, 350000, 400000, 20000, 120000, 420000, 200000, 150000, 95000];
  const models = ['Land Cruiser', 'Hilux', 'Prado', 'Land Rover Discovery', 'Nissan Patrol', 'Hiace', 'Subaru Forester', 'RAV4'];
  const inventory = [];
  for (let i = 0; i < 128; i++) {
    const rank = (i * 37) % 128;
    const item = { id: uid(), name: `${parts[i % 16]} – ${models[Math.floor(i / 16)]}`, price: prices[i % 16], min: 5, off: false, qty: 0 };
    if (rank < 78) item.qty = 6 + (i % 25);
    else if (rank < 104) item.qty = 1 + (i % 4);
    else if (rank < 118) item.qty = 0;
    else item.off = true;
    inventory.push(item);
  }
  return {
    uid: userId,
    stats: { active: 12, completed: 136, earnings: series.reduce((a, b) => a + b, 0), change: 18 },
    series,
    requests: [
      R('Engine Parts Needed', 'Queen Elizabeth NP', 3.2, 'Toyota Land Cruiser TX 2018', 10),
      R('Tyre Replacement', 'Mbarara – Kabale Highway', 12.6, 'Nissan Patrol 2015', 25),
      R('Battery Request', 'Bwindi Impenetrable NP', 18.4, 'Land Rover Discovery 2017', 45),
      R('Oil Filter Needed', 'Kidepo Valley NP', 32.8, 'Toyota Land Cruiser VX 2020', 60),
      R('Brake Pads Needed', 'Murchison Falls NP', 41.0, 'Toyota Hilux 2016', 120),
      R('Fan Belt', 'Lake Mburo NP', 22.5, 'Toyota Prado 2014', 130),
      R('Shock Absorbers', 'Kampala – Masaka Road', 8.1, 'Toyota Land Cruiser TX 2018', 190),
      R('Wiper Blades', 'Jinja Road', 6.4, 'Subaru Forester 2013', 240),
    ],
    top: [['Engine Parts', 64], ['Tyres & Wheels', 48], ['Batteries', 32], ['Brake Parts', 27], ['Oil & Filters', 21]],
    inventory,
    reviews: [
      { id: uid(), name: 'Sarah Johnson', stars: 5, txt: 'Great service and quality parts. Delivery was fast!', at: t - 2 * 3600e3 },
      { id: uid(), name: 'John Smith', stars: 5, txt: 'Very professional and reliable. Highly recommended.', at: t - 26 * 3600e3 },
      { id: uid(), name: 'Grace Akello', stars: 4, txt: 'Good prices and friendly staff.', at: t - 3 * DAY },
    ],
    messages: [
      { id: uid(), who: 'Brian Okello', txt: 'Do you have an alternator for a Land Cruiser TX?', at: t - 12 * 60e3 },
      { id: uid(), who: 'Safari Rescue Team', txt: 'New parts request near Queen Elizabeth NP.', at: t - 55 * 60e3 },
      { id: uid(), who: 'Moses Ssemanda', txt: 'Thanks, the tyres arrived safely.', at: t - 5 * 3600e3 },
    ],
  };
}

async function seedDemoCustomer(store, user) {
  const put = (col, doc) => store.put(col, doc.id, doc);
  await put('vehicles', {
    id: uid(), uid: user.id, make: 'Toyota Land Cruiser', model: 'TX 2018', plate: 'UBQ 123A', color: 'White',
    type: 'SUV', fuel: 'Diesel', year: '2018', engine: '2.8L', ins: 'UAP Insurance', insTo: atDay(410, 0, 0), art: 'cruiser',
  });
  const up = (code, k, title, n, h, m, place, status) => put('bookings', { id: uid(), uid: user.id, code, k, title, at: atDay(n, h, m), place, status, noAuto: true, createdAt: Date.now() });
  await up('SR-09', 'towing', 'Towing Service', 1, 9, 0, 'Kampala, Kira Road', 'Confirmed');
  await up('CH-12', 'hire', 'Car Hire', 2, 8, 0, 'Entebbe Airport', 'Pending');
  await up('BA-03', 'battery', 'Battery Jump Start', 3, 10, 30, 'Naalya, Kampala', 'Scheduled');
  await up('TR-21', 'airport', 'Airport Transfer', 5, 6, 0, 'Kampala → Entebbe', 'Confirmed');
  const past = [
    ['engine', 'Engine Trouble', 'Kampala, Kira Road', 'rescue', -4, 10, 30, 5],
    ['towing', 'Towing Service', 'Entebbe Road', 'rescue', -8, 14, 15, 5],
    ['fuel', 'Fuel Delivery', 'Murchison Falls Rd', 'rescue', -12, 11, 45, 5],
    ['tire', 'Tire Change', 'Jinja Road', 'rescue', -20, 8, 10, 5],
    ['battery', 'Battery Jump Start', 'Ntinda, Kampala', 'rescue', -31, 18, 40, 4],
    ['airport', 'Airport Transfer', 'Kampala → Entebbe', 'mobility', -15, 6, 0, 5],
    ['hire', 'Car Hire', 'Entebbe Airport', 'mobility', -22, 9, 0, 5],
    ['hire', 'Car Hire', 'Kampala Road', 'mobility', -40, 8, 30, 4],
    ['van', 'Safari Van', 'Kampala → Masaka', 'mobility', -55, 7, 0, 5],
    ['hotel', 'Hotel Transfer', 'Kampala → Entebbe', 'mobility', -61, 20, 15, 5],
    ['airport', 'Airport Transfer', 'Entebbe → Kampala', 'mobility', -70, 23, 0, 5],
    ['tour', 'Tour Booking', 'Murchison Falls NP', 'other', -90, 6, 30, 5],
  ];
  let n = 40;
  for (const [k, title, place, cat, d, h, m, r] of past) {
    await put('bookings', { id: uid(), uid: user.id, code: 'SR-' + (n++), k, title, at: atDay(d, h, m), place, status: 'Completed', cat, r, createdAt: atDay(d, h, m) });
  }
  const msg = (who, ic, txt, at, unread) => put('messages', { id: uid(), uid: user.id, who, ic, txt, at, unread });
  await msg('Safari Rescue Team', 'logo', 'Welcome to Safari Rescue! Help is always one tap away.', Date.now(), 1);
  await msg('Booking Updates', 'list', 'Your towing service has been confirmed.', atDay(0, 10, 30), 1);
  await msg('Offers & Promotions', 'tag', 'Get 10% off on car hire this weekend!', atDay(-1, 16, 0), 0);
  await msg('System Alerts', 'shield', 'Your account security was updated.', atDay(-1, 9, 0), 0);
  await msg('Support Team', 'headset', 'Thanks for contacting us!', atDay(-2, 12, 0), 0);
  const note = (txt, at, unread) => put('notifs', { id: uid(), uid: user.id, txt, at, unread });
  await note('Your Toyota Land Cruiser insurance is valid for the next 13 months.', atDay(0, 8, 0), 1);
  await note('Car Hiring is now available in Kampala and Entebbe.', atDay(-1, 12, 0), 1);
  await note('Tip: add an emergency contact so we can alert them if you press SOS.', atDay(-3, 9, 0), 0);
}

async function seedDemoProvider(store, user) {
  const put = (col, doc) => store.put(col, doc.id, doc);
  const lc = { make: 'Toyota Land Cruiser', model: 'TX 2018', plate: 'UBQ 123A', color: 'White', type: 'SUV', fuel: 'Diesel' };
  const job = (code, svc, title, mins, loc, region, km, eta, price, cust, rating, reviews, veh, note) => put('requests', {
    id: uid(), code, uid: 'demo-customer', visibleTo: user.id, demoJob: true, kind: 'service', svc, title, loc, region, km, etaMin: eta, price,
    vehicle: veh, note, status: 'searching', createdAt: Date.now() - mins * 60e3, customer: { name: cust, phone: null, rating, reviews }, declinedBy: [], pay: 'mtn',
  });
  await job('SR-4821', 'engine', 'Breakdown – Engine Trouble', 5, 'Queen Elizabeth NP, Katunguru Gate', 'Kasese District, Western Uganda', 2.4, 6, [150000, 250000], 'James Thompson', 4.8, 56, lc, 'Engine making strange noise and power loss. Unable to continue the journey.');
  await job('SR-4822', 'tire', 'Flat Tyre', 12, 'Mbarara – Kabale Highway', 'Mbarara District, Western Uganda', 12.6, 18, [40000, 90000], 'Sarah Johnson', 4.8, 31, { make: 'Nissan Patrol', model: '2015', plate: 'UAX 481K', color: 'Silver', type: 'SUV', fuel: 'Diesel' }, 'Rear left tyre burst. The spare wheel is also flat.');
  await job('SR-4823', 'battery', 'Battery Jump Start', 21, 'Murchison Falls NP, Paraa', 'Nwoya District, Northern Uganda', 18.4, 25, [40000, 80000], 'John Smith', 5, 12, { make: 'Land Rover Discovery', model: '2017', plate: 'UBF 902M', color: 'Green', type: 'SUV', fuel: 'Diesel' }, 'Car will not start after a long game drive. Lights were left on.');
  const pay = [[0, 150000, 'Engine Trouble'], [-1, 60000, 'Tire Change'], [-1, 45000, 'Battery Jump Start'], [-2, 220000, 'Towing Service'], [-3, 80000, 'Lockout Service'], [-4, 120000, 'Engine Trouble'], [-5, 55000, 'Fuel Delivery']];
  for (const [d, amount, title] of pay) await put('earnings', { id: uid(), uid: user.id, rid: 'demo', title, amount, at: atDay(d, 10 + Math.abs(d), 15) });
}

async function createDemoUser(store, role) {
  const id = 'demo-' + crypto.randomBytes(6).toString('hex');
  const base = { id, role, phone: '', pwd: '', created: Date.now(), city: 'Kampala', pay: 'mtn', theme: 'system', demo: true };
  let user;
  if (role === 'provider') {
    user = Object.assign(base, { name: 'Brian Okello', provider: { title: 'Experienced Mechanic', vehicle: 'Toyota Land Cruiser', plate: 'UAY 456B', rating: 4.9, reviews: 128, online: true, verified: true } });
  } else if (role === 'partner') {
    user = Object.assign(base, { name: 'Kampala Auto Spares Ltd', partner: { business: 'Kampala Auto Spares Ltd', tagline: 'Trusted Spare Parts Supplier', cat: 'parts' } });
  } else {
    user = Object.assign(base, { name: 'David Otim' });
  }
  await store.put('users', id, user);
  if (role === 'provider') await seedDemoProvider(store, user);
  else if (role === 'partner') await store.put('portals', id, demoPortal(id));
  else await seedDemoCustomer(store, user);
  return user;
}

async function purgeUser(store, id) {
  for (const col of ['vehicles', 'contacts', 'bookings', 'messages', 'notifs', 'earnings', 'chats']) {
    for (const d of await store.byUid(col, id)) await store.del(col, d.id);
  }
  const reqs = (await store.all('requests')).filter((r) => r.uid === id || r.visibleTo === id);
  for (const r of reqs) await store.del('requests', r.id);
  await store.del('portals', id);
  await store.del('users', id);
}

// Demo accounts live for 24h, then everything they created is removed.
async function purgeDemo(store, maxAgeMs = 24 * 3600e3) {
  const old = (await store.all('users')).filter((u) => u.demo && Date.now() - u.created > maxAgeMs);
  for (const u of old) await purgeUser(store, u.id);
  return old.length;
}

module.exports = { seedPartners, createDemoUser, purgeDemo, purgeUser, emptyPortal, atDay };
