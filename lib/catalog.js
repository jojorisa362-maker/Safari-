'use strict';
// Static catalogue shared with the front-end through GET /api/config.
// Prices are in UGX and are only estimates until a rescuer confirms on site.

exports.CITIES = ['Kampala', 'Entebbe', 'Jinja', 'Mbarara', 'Gulu', 'Fort Portal', 'Mbale', 'Kasese'];

exports.PAY = [
  { id: 'mtn', n: 'MTN Mobile Money' },
  { id: 'airtel', n: 'Airtel Money' },
  { id: 'cash', n: 'Cash on arrival' },
];

exports.SERVICES = {
  tire:    { t: 'Tire Change',               s: 'Tire Rescue',        d: "We'll change your tire",        i: 'tire',    p: [30000, 60000],   eta: 20 },
  battery: { t: 'Battery Jump Start',        s: 'Battery Jump Start', d: 'Get a jump start',              i: 'battery', p: [40000, 80000],   eta: 15 },
  engine:  { t: 'Engine Trouble',            s: 'Engine Trouble',     d: 'Diagnose & fix the issue',      i: 'engine',  p: [100000, 250000], eta: 25 },
  towing:  { t: 'Towing Service',            s: 'Towing Service',     d: 'Tow your vehicle to a garage',  i: 'tow',     p: [150000, 400000], eta: 30 },
  fuel:    { t: 'Fuel Delivery',             s: 'Fuel Delivery',      d: "We'll bring fuel to you",       i: 'fuel',    p: [30000, 60000],   eta: 20 },
  lockout: { t: 'Lockout Service',           s: 'Lockout',            d: 'Help to open your vehicle',     i: 'lock',    p: [50000, 100000],  eta: 20 },
  winch:   { t: 'Winching / Stuck Vehicle',  s: 'Winching',           d: 'Pull out your vehicle',         i: 'anchor',  p: [150000, 400000], eta: 35 },
  other:   { t: 'Other Assistance',          s: 'Other',              d: "Tell us what's wrong",          i: 'plus',    p: null,             eta: 25 },
  sos:     { t: 'Emergency SOS',             s: 'SOS',                d: 'Rescue team alerted',           i: 'bell',    p: null,             eta: 18 },
};

exports.SOS_TYPES = { general: 'Emergency SOS', medical: 'Medical Emergency', security: 'Security Assistance' };

exports.CARS = [
  { id: 'cruiser', n: 'Toyota Land Cruiser', s: '4x4 · 7 seats · AC',     p: 450000, art: 'cruiser', c: '#E8DFC6' },
  { id: 'van',     n: 'Safari Van',          s: 'Pop-up roof · 8 seats',  p: 380000, art: 'van',     c: '#F1F1EC' },
  { id: 'suv',     n: 'Luxury SUV',          s: 'Comfort · 5 seats',      p: 520000, art: 'suv',     c: '#2B3430' },
  { id: 'sedan',   n: 'City Sedan',          s: 'Economy · 4 seats',      p: 150000, art: 'sedan',   c: '#F4F4F0' },
];
exports.DRIVER_FEE = 80000;

exports.MOBILITY = {
  j: [
    { id: 'j-cruiser', t: 'Replacement Land Cruiser', d: 'Reliable 4x4 for your safari', art: 'cruiser', c: '#EDE7D4', p: 420000, per: 'day' },
    { id: 'j-van',     t: 'Safari Van',               d: 'Spacious & comfortable',       art: 'van',     c: '#F2F2EE', p: 360000, per: 'day' },
    { id: 'j-suv',     t: 'Luxury SUV',               d: 'Travel in style & comfort',    art: 'suv',     c: '#2A2F2C', p: 520000, per: 'day' },
    { id: 'j-group',   t: 'Group Transport',          d: 'For groups & families',        art: 'van',     c: '#E8ECEF', p: 480000, per: 'day' },
  ],
  s: [
    { id: 's-hotel',   t: 'Nearest Hotel',            d: "We'll take you to safety",     i: 'hotel',   p: 40000 },
    { id: 's-town',    t: 'Nearest Town',             d: 'Get to town safely',           i: 'pin',     p: 50000 },
    { id: 's-medical', t: 'Nearest Medical Facility', d: 'Medical help on the way',      i: 'medical', p: 80000 },
    { id: 's-airport', t: 'Airport Transfer',         d: 'On-time airport drop',         i: 'plane',   p: 120000 },
  ],
  v: [
    { id: 'v-tow',  t: 'Tow Truck',        d: 'Tow your vehicle safely', i: 'tow',    art: 'tow',     c: '#F0F0EA', p: 150000 },
    { id: 'v-flat', t: 'Flatbed Recovery', d: 'Safe & secure transport', i: 'tow',    art: 'flatbed', c: '#F0F0EA', p: 220000 },
    { id: 'v-off',  t: 'Off-road Recovery', d: 'Specialized recovery',   i: 'anchor', art: 'cruiser', c: '#C9B88A', p: 300000 },
  ],
};

exports.PARTNER_CATS = {
  mech:  { t: 'Mechanics',              i: 'wrench' },
  tow:   { t: 'Towing & Recovery',      i: 'tow' },
  parts: { t: 'Spare Parts Shops',      i: 'box' },
  tour:  { t: 'Tour Operators',         i: 'plane' },
  stay:  { t: 'Accommodation Partners', i: 'hotel' },
  med:   { t: 'Medical Partners',       i: 'medical' },
};
