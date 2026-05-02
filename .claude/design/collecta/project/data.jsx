// Collecta — sample data
// Unsplash source URLs for realistic imagery

const UNSPLASH = (id, w = 600) => `https://images.unsplash.com/photo-${id}?w=${w}&q=80&auto=format&fit=crop`;

// Avatars — using ui-avatars for placeholder
const AV = (name, bg) => `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=${bg}&color=fff&size=128&bold=true&font-size=0.4`;

const USERS = {
  me: { name: 'Sasha Rivera', handle: 'sasharivera', avatar: AV('Sasha Rivera', 'C6A15B'), level: 12, xp: 2840, xpNext: 3200 },
  maya: { name: 'Maya Okafor', handle: 'mayao', avatar: AV('Maya Okafor', '6B8FD4') },
  kenji: { name: 'Kenji Park', handle: 'kenjipark', avatar: AV('Kenji Park', 'C4695A') },
  ivy: { name: 'Ivy Chen', handle: 'ivych', avatar: AV('Ivy Chen', '7AA66B') },
  theo: { name: 'Theo Blum', handle: 'theoblum', avatar: AV('Theo Blum', '8A6BA6') },
  rumi: { name: 'Rumi Ali', handle: 'rumiali', avatar: AV('Rumi Ali', 'B06B8A') },
};

// Home feed
const FEED = [
  {
    id: 'f1', user: USERS.maya, photo: UNSPLASH('1514888286974-6c03e2ca1dba'),
    collection: 'NYC Bodega Cats', collectionEmoji: '🐈',
    location: 'East Village, NY', timeAgo: '12m',
    reactions: { heart: 24, fire: 8, sparkle: 3 }, caption: 'Found this orange tabby guarding the register at Joe\'s.',
    itemLabel: 'Orange Tabby',
  },
  {
    id: 'f2', user: USERS.kenji, photo: UNSPLASH('1513519245088-0e12902e5a38'),
    collection: 'Brooklyn Street Art', collectionEmoji: '🎨',
    location: 'Bushwick, NY', timeAgo: '34m',
    reactions: { heart: 87, fire: 32, sparkle: 14 }, caption: 'New mural off Wyckoff. Artist tag says @kolor_club.',
    itemLabel: 'Mural #47',
  },
  {
    id: 'f3', user: USERS.ivy, photo: UNSPLASH('1506905925346-21bda4d32df4'),
    collection: 'Mountain Lakes', collectionEmoji: '🏔️',
    location: 'Bear Mountain, NY', timeAgo: '2h',
    reactions: { heart: 141, fire: 28, sparkle: 41 }, caption: 'Hiked 6mi for this one. Worth it.',
    itemLabel: 'Glacial Pond',
  },
  {
    id: 'f4', user: USERS.theo, photo: UNSPLASH('1545535650-b9a9cea37c38'),
    collection: 'Art Deco NYC', collectionEmoji: '🏛️',
    location: 'Midtown, NY', timeAgo: '3h',
    reactions: { heart: 56, fire: 12, sparkle: 9 }, caption: 'Chrysler lobby is still the move.',
    itemLabel: 'Chrysler Building',
  },
  {
    id: 'f5', user: USERS.rumi, photo: UNSPLASH('1601049676869-702ea24cfd58'),
    collection: 'Cloud Atlas', collectionEmoji: '☁️',
    location: 'Prospect Park, NY', timeAgo: '5h',
    reactions: { heart: 38, fire: 4, sparkle: 22 }, caption: 'Textbook cumulus. Chef\'s kiss.',
    itemLabel: 'Cumulus Humilis',
  },
];

// My collections
const MY_COLLECTIONS = [
  {
    id: 'c1', title: 'Cat Breeds of NYC', emoji: '🐈', cover: UNSPLASH('1514888286974-6c03e2ca1dba'),
    found: 14, total: 30, category: 'Animals', privacy: 'public',
    items: [
      { id: 'i1', name: 'Orange Tabby', photo: UNSPLASH('1514888286974-6c03e2ca1dba'), location: 'East Village', date: 'Apr 12' },
      { id: 'i2', name: 'Black Domestic', photo: UNSPLASH('1518791841217-8f162f1e1131'), location: 'SoHo', date: 'Apr 10' },
      { id: 'i3', name: 'Calico', photo: UNSPLASH('1573865526739-10659fec78a5'), location: 'Chelsea', date: 'Apr 08' },
      { id: 'i4', name: 'Russian Blue', photo: UNSPLASH('1574158622682-e40e69881006'), location: 'Williamsburg', date: 'Apr 06' },
      { id: 'i5', name: 'Maine Coon', photo: UNSPLASH('1592194996308-7b43878e84a6'), location: 'Astoria', date: 'Apr 03' },
      { id: 'i6', name: 'Siamese', photo: UNSPLASH('1513360371669-4adf3dd7dff8'), location: 'Park Slope', date: 'Mar 30' },
      { id: 'i7', name: 'Scottish Fold', photo: UNSPLASH('1533738363-b7f9aef128ce'), location: 'LES', date: 'Mar 28' },
      { id: 'i8', name: 'Tuxedo', photo: UNSPLASH('1472491235688-bdc81a63246e'), location: 'Tribeca', date: 'Mar 25' },
      { id: 'i9', name: 'Persian', photo: UNSPLASH('1606214174585-fe31582dc6ee'), location: 'UES', date: 'Mar 22' },
      { id: 'i10', name: 'Bengal', photo: UNSPLASH('1561948955-570b270e7c36'), location: 'Bushwick', date: 'Mar 19' },
      { id: 'i11', name: 'Ragdoll', photo: UNSPLASH('1495360010541-f48722b34f7d'), location: 'Harlem', date: 'Mar 16' },
      { id: 'i12', name: 'Ginger Tortie', photo: UNSPLASH('1543852786-1cf6624b9987'), location: 'West Village', date: 'Mar 14' },
      { id: 'i13', name: 'Sphynx', photo: UNSPLASH('1585776245991-cf89dd7fc73a'), location: 'Nolita', date: 'Mar 11' },
      { id: 'i14', name: 'Grey Tabby', photo: UNSPLASH('1596854407944-bf87f6fdd49e'), location: 'Greenpoint', date: 'Mar 09' },
    ],
  },
  {
    id: 'c2', title: 'Street Art', emoji: '🎨', cover: UNSPLASH('1513519245088-0e12902e5a38'),
    found: 23, total: 50, category: 'Art', privacy: 'public',
  },
  {
    id: 'c3', title: 'Cloud Types', emoji: '☁️', cover: UNSPLASH('1601049676869-702ea24cfd58'),
    found: 7, total: 10, category: 'Nature', privacy: 'public',
  },
  {
    id: 'c4', title: 'Vintage Storefronts', emoji: '🏪', cover: UNSPLASH('1555529669-e69e7aa0ba9a'),
    found: 19, total: 40, category: 'Urban', privacy: 'private',
  },
  {
    id: 'c5', title: 'Subway Typography', emoji: '🚇', cover: UNSPLASH('1495121605193-b116b5b9c5fe'),
    found: 4, total: 12, category: 'Design', privacy: 'public',
  },
  {
    id: 'c6', title: 'Fire Escapes', emoji: '🪜', cover: UNSPLASH('1518005020951-eccb494ad742'),
    found: 31, total: 50, category: 'Urban', privacy: 'public',
  },
];

const SHARED_COLLECTIONS = [
  {
    id: 's1', title: 'Brooklyn Bodegas (w/ Maya)', emoji: '🥪', cover: UNSPLASH('1555529669-e69e7aa0ba9a'),
    found: 41, total: 60, category: 'Urban', collaborators: [USERS.me, USERS.maya],
  },
  {
    id: 's2', title: 'NY Dog Park Goodboys', emoji: '🐕', cover: UNSPLASH('1587300003388-59208cc962cb'),
    found: 17, total: 35, category: 'Animals', collaborators: [USERS.me, USERS.kenji, USERS.ivy],
  },
];

const DISCOVER_COLLECTIONS = [
  { id: 'd1', title: '100 Dive Bars', emoji: '🍺', cover: UNSPLASH('1514933651103-005eec06c04b'), total: 100, followers: '2.4k' },
  { id: 'd2', title: 'NYC Bridges', emoji: '🌉', cover: UNSPLASH('1541336032412-2048a678540d'), total: 24, followers: '890' },
  { id: 'd3', title: 'Neon Signs', emoji: '💡', cover: UNSPLASH('1518709268805-4e9042af2176'), total: 75, followers: '5.1k' },
  { id: 'd4', title: 'Old Bookshops', emoji: '📚', cover: UNSPLASH('1481627834876-b7833e8f5570'), total: 20, followers: '1.2k' },
];

const BADGES = [
  { id: 'b1', name: 'First Find', icon: '🌱', tier: 'bronze', earned: true },
  { id: 'b2', name: '10 Streak', icon: '🔥', tier: 'silver', earned: true },
  { id: 'b3', name: 'Cat Whisperer', icon: '🐾', tier: 'gold', earned: true },
  { id: 'b4', name: 'Night Owl', icon: '🌙', tier: 'silver', earned: true },
  { id: 'b5', name: 'Explorer', icon: '🧭', tier: 'gold', earned: true },
  { id: 'b6', name: 'Collector', icon: '📦', tier: 'bronze', earned: true },
  { id: 'b7', name: 'City Scout', icon: '🏙️', tier: 'gold', earned: true },
  { id: 'b8', name: '100 Finds', icon: '💯', tier: 'silver', earned: true },
  { id: 'b9', name: 'Completionist', icon: '👑', tier: 'gold', earned: false },
  { id: 'b10', name: 'Social', icon: '🤝', tier: 'silver', earned: false },
  { id: 'b11', name: 'Year One', icon: '🎂', tier: 'gold', earned: false },
  { id: 'b12', name: 'Curator', icon: '🎯', tier: 'gold', earned: false },
];

Object.assign(window, { UNSPLASH, AV, USERS, FEED, MY_COLLECTIONS, SHARED_COLLECTIONS, DISCOVER_COLLECTIONS, BADGES });
