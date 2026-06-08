// Kudaw Toolkit — Telegram Mini App
// Features: NFT Drop Tracker, Airdrop Dashboard, CC Generator, Cron Job Manager

// ============================================================
// INITIALIZATION
// ============================================================

const tg = window.Telegram.WebApp;
tg.ready();
tg.expand();

// Theme from Telegram
document.documentElement.style.setProperty('--purple', tg.themeParams.button_color || '#a855f7');
document.documentElement.style.setProperty('--text', tg.themeParams.text_color || '#e2e8f0');
document.documentElement.style.setProperty('--bg', tg.themeParams.bg_color || '#0a0a0f');

// User info
const user = tg.initDataUnsafe?.user;
if (user) {
  document.getElementById('userName').textContent = user.first_name || 'User';
  document.getElementById('userAvatar').textContent = user.first_name?.[0] || '👤';
}

// ============================================================
// NAVIGATION
// ============================================================

function switchTab(tabName) {
  document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  document.getElementById(`tab-${tabName}`).classList.add('active');
  document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
}

// ============================================================
// TOAST NOTIFICATIONS
// ============================================================

function showToast(msg, duration = 3000) {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.classList.remove('hidden');
  setTimeout(() => toast.classList.add('hidden'), duration);
}

// ============================================================
// LOCAL STORAGE
// ============================================================

function loadStore(key, defaultVal = []) {
  try { return JSON.parse(localStorage.getItem(key)) || defaultVal; }
  catch { return defaultVal; }
}

function saveStore(key, data) {
  localStorage.setItem(key, JSON.stringify(data));
}

// ============================================================
// 1. NFT DROP TRACKER
// ============================================================

let allDrops = [];

async function loadDrops() {
  const container = document.getElementById('drops-container');
  container.innerHTML = '<div class="loading-spinner">Loading drops...</div>';

  try {
    const resp = await fetch('https://api.opensea.io/api/v2/drops?limit=50', {
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    const data = await resp.json();
    allDrops = data.drops || data || [];
    renderDrops(allDrops);
  } catch (e) {
    // Fallback: show sample data
    allDrops = getSampleDrops();
    renderDrops(allDrops);
  }
}

function getSampleDrops() {
  return [
    { name: "Example Drop 1", slug: "example-1", description: "Sample NFT collection", total_supply: 5000, is_minting: true, stages: [{stage_type: "public_sale"}], image_url: "" },
    { name: "Example Drop 2", slug: "example-2", description: "Another collection", total_supply: 10000, is_minting: false, stages: [{stage_type: "signed_presale"}], image_url: "" },
  ];
}

function renderDrops(drops) {
  const container = document.getElementById('drops-container');
  if (!drops.length) {
    container.innerHTML = '<div class="empty-state"><div class="empty-icon">🎯</div><p>No drops found</p></div>';
    return;
  }

  container.innerHTML = drops.map(drop => {
    const status = drop.is_minting ? 'live' : (drop.stages?.[0]?.stage_type === 'signed_presale' ? 'upcoming' : 'ended');
    const badgeClass = status === 'live' ? 'badge-live' : (status === 'upcoming' ? 'badge-upcoming' : 'badge-ended');
    const stageType = drop.stages?.[0]?.stage_type?.replace('_', ' ') || 'Unknown';

    return `
      <div class="card" onclick="window.open('https://opensea.io/drops/${drop.slug}', '_blank')">
        <div class="card-header">
          <div class="card-title">${drop.name || 'Unknown'}</div>
          <span class="card-badge ${badgeClass}">${status}</span>
        </div>
        <div class="card-meta">
          <span class="card-meta-item">📦 ${(drop.total_supply || 0).toLocaleString()}</span>
          <span class="card-meta-item">🏷️ ${stageType}</span>
        </div>
      </div>
    `;
  }).join('');
}

function filterDrops(filter) {
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  event.target.classList.add('active');

  let filtered = allDrops;
  if (filter === 'live') filtered = allDrops.filter(d => d.is_minting);
  else if (filter === 'upcoming') filtered = allDrops.filter(d => !d.is_minting && d.stages?.[0]?.stage_type === 'signed_presale');
  else if (filter === 'ended') filtered = allDrops.filter(d => !d.is_minting && d.stages?.[0]?.stage_type !== 'signed_presale');

  renderDrops(filtered);
}

// ============================================================
// 2. AIRDROP DASHBOARD
// ============================================================

let airdrops = loadStore('kudaw_airdrops');

function renderAirdrops() {
  const container = document.getElementById('airdrop-container');
  document.getElementById('airdrop-total').textContent = airdrops.length;
  document.getElementById('airdrop-active').textContent = airdrops.filter(a => a.status !== 'done').length;
  document.getElementById('airdrop-done').textContent = airdrops.filter(a => a.status === 'done').length;

  if (!airdrops.length) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">🪂</div>
        <p>No airdrops tracked yet</p>
        <button class="btn-primary" onclick="showAddAirdrop()">+ Add First Project</button>
      </div>`;
    return;
  }

  container.innerHTML = airdrops.map((a, idx) => {
    const tasksDone = (a.tasks || []).filter(t => t.done).length;
    const totalTasks = (a.tasks || []).length;
    const progress = totalTasks ? Math.round((tasksDone / totalTasks) * 100) : 0;
    const badgeClass = progress === 100 ? 'badge-done' : 'badge-active';

    return `
      <div class="card">
        <div class="card-header">
          <div class="card-title">${a.name}</div>
          <span class="card-badge ${badgeClass}">${progress === 100 ? 'DONE' : progress + '%'}</span>
        </div>
        <div class="card-meta">
          ${a.wallet ? `<span class="card-meta-item">💳 ${a.wallet.slice(0, 6)}...${a.wallet.slice(-4)}</span>` : ''}
          <span class="card-meta-item">✅ ${tasksDone}/${totalTasks}</span>
        </div>
        <div class="task-list">
          ${(a.tasks || []).map((t, ti) => `
            <div class="task-item">
              <div class="task-check ${t.done ? 'done' : ''}" onclick="toggleAirdropTask(${idx}, ${ti})">
                ${t.done ? '✓' : ''}
              </div>
              <span class="task-text ${t.done ? 'done' : ''}">${t.name}</span>
            </div>
          `).join('')}
        </div>
        <div class="card-actions">
          ${a.url ? `<button class="card-action" onclick="window.open('${a.url}', '_blank')">🔗 Open</button>` : ''}
          <button class="card-action" onclick="deleteAirdrop(${idx})">🗑️ Delete</button>
        </div>
      </div>
    `;
  }).join('');
}

function showAddAirdrop() {
  document.getElementById('modal-airdrop').classList.remove('hidden');
}

function saveAirdrop() {
  const name = document.getElementById('airdrop-name').value.trim();
  if (!name) return showToast('❌ Enter project name');

  const tasksText = document.getElementById('airdrop-tasks').value.trim();
  const tasks = tasksText ? tasksText.split('\n').filter(t => t.trim()).map(t => ({ name: t.trim(), done: false })) : [];

  airdrops.push({
    name,
    url: document.getElementById('airdrop-url').value.trim(),
    wallet: document.getElementById('airdrop-wallet').value.trim(),
    notes: document.getElementById('airdrop-notes').value.trim(),
    tasks,
    status: 'active',
    created: Date.now()
  });

  saveStore('kudaw_airdrops', airdrops);
  renderAirdrops();
  closeModal('airdrop');
  showToast(`✅ ${name} added`);
}

function toggleAirdropTask(airdropIdx, taskIdx) {
  airdrops[airdropIdx].tasks[taskIdx].done = !airdrops[airdropIdx].tasks[taskIdx].done;
  saveStore('kudaw_airdrops', airdrops);
  renderAirdrops();
}

function deleteAirdrop(idx) {
  if (!confirm(`Delete ${airdrops[idx].name}?`)) return;
  airdrops.splice(idx, 1);
  saveStore('kudaw_airdrops', airdrops);
  renderAirdrops();
  showToast('🗑️ Deleted');
}

// ============================================================
// 3. CC GENERATOR
// ============================================================

// BIN Database (common BINs)
const BIN_DB = {
  '453201': { network: 'Visa', type: 'Credit', country: 'US', issuer: 'Chase', length: 16 },
  '453202': { network: 'Visa', type: 'Debit', country: 'US', issuer: 'Bank of America', length: 16 },
  '528985': { network: 'Mastercard', type: 'Credit', country: 'US', issuer: 'Capital One', length: 16 },
  '510805': { network: 'Mastercard', type: 'Credit', country: 'US', issuer: 'Citi', length: 16 },
  '340000': { network: 'Amex', type: 'Credit', country: 'US', issuer: 'American Express', length: 15 },
  '370000': { network: 'Amex', type: 'Credit', country: 'US', issuer: 'American Express', length: 15 },
  '601100': { network: 'Discover', type: 'Credit', country: 'US', issuer: 'Discover', length: 16 },
  '623358': { network: 'UnionPay', type: 'Debit', country: 'CN', issuer: 'UnionPay', length: 16 },
  '350000': { network: 'JCB', type: 'Credit', country: 'JP', issuer: 'JCB', length: 16 },
};

// Country-specific names and addresses
const COUNTRY_DATA = {
  'US': {
    names: ['James Smith', 'John Johnson', 'Robert Williams', 'Michael Brown', 'David Jones', 'William Garcia', 'Richard Miller', 'Joseph Davis'],
    streets: ['123 Main St', '456 Oak Ave', '789 Pine Rd', '321 Elm Dr', '654 Maple Ln', '987 Cedar Blvd', '147 Birch Way', '258 Walnut Ct'],
    cities: ['New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix', 'San Antonio', 'San Diego', 'Dallas'],
    states: ['NY', 'CA', 'IL', 'TX', 'AZ', 'TX', 'CA', 'TX'],
    zips: ['10001', '90210', '60601', '77001', '85001', '78201', '92101', '75201'],
    phones: () => `+1${Math.floor(Math.random() * 900 + 100)}${Math.floor(Math.random() * 900 + 100)}${Math.floor(Math.random() * 9000 + 1000)}`,
  },
  'UK': {
    names: ['Oliver Smith', 'George Jones', 'Harry Williams', 'Jack Brown', 'Charlie Taylor', 'Thomas Wilson', 'James Davies', 'William Evans'],
    streets: ['10 Downing St', '221B Baker St', '42 Fleet St', '15 Oxford St', '8 Piccadilly', '23 Camden High St', '7 Notting Hill', '31 Brick Lane'],
    cities: ['London', 'Manchester', 'Birmingham', 'Liverpool', 'Leeds', 'Sheffield', 'Bristol', 'Edinburgh'],
    states: ['England', 'England', 'England', 'England', 'England', 'England', 'England', 'Scotland'],
    zips: ['SW1A 1AA', 'M1 1AA', 'B1 1BB', 'L1 1JH', 'LS1 1BA', 'S1 2GH', 'BS1 1AB', 'EH1 1YZ'],
    phones: () => `+44${Math.floor(Math.random() * 9000 + 1000)}${Math.floor(Math.random() * 900000 + 100000)}`,
  },
  'DE': {
    names: ['Müller Schmidt', 'Schneider Fischer', 'Weber Wagner', 'Becker Schulz', 'Hoffmann Koch', 'Richter Klein', 'Wolf Schröder', 'Neumann Zimmermann'],
    streets: ['Hauptstraße 1', 'Berliner Str. 42', 'Schulstraße 7', 'Gartenweg 15', 'Bahnhofstraße 3', 'Kirchgasse 8', 'Marktplatz 12', 'Waldstraße 25'],
    cities: ['Berlin', 'München', 'Hamburg', 'Köln', 'Frankfurt', 'Stuttgart', 'Düsseldorf', 'Leipzig'],
    states: ['Berlin', 'Bayern', 'Hamburg', 'NRW', 'Hessen', 'Baden-Württemberg', 'NRW', 'Sachsen'],
    zips: ['10115', '80331', '20095', '50667', '60311', '70173', '40213', '04109'],
    phones: () => `+49${Math.floor(Math.random() * 900 + 100)}${Math.floor(Math.random() * 9000000 + 1000000)}`,
  },
  'JP': {
    names: ['田中太郎', '鈴木一郎', '佐藤健', '高橋誠', '伊藤大輔', '渡辺淳', '山本翔', '中村拓'],
    streets: ['渋谷区神南1-2-3', '新宿区西新宿4-5-6', '港区六本木7-8-9', '千代田区丸の内10-11', '中央区銀座12-13', '台東区浅草14-15', '墨田区押上16-17', '江東区豊洲18-19'],
    cities: ['東京', '大阪', '名古屋', '札幌', '福岡', '横浜', '神戸', '京都'],
    states: ['東京都', '大阪府', '愛知県', '北海道', '福岡県', '神奈川県', '兵庫県', '京都府'],
    zips: ['150-0001', '530-0001', '450-0001', '060-0001', '810-0001', '231-0001', '650-0001', '600-0001'],
    phones: () => `+81-${Math.floor(Math.random() * 90 + 10)}-${Math.floor(Math.random() * 9000 + 1000)}-${Math.floor(Math.random() * 9000 + 1000)}`,
  },
  'KR': {
    names: ['김민수', '이서연', '박지훈', '최유진', '정하늘', '한소희', '강도윤', '윤서아'],
    streets: ['테헤란로 152', '해운대해변로 264', '전주로 45', '불정로 90', '동대구로 390', '센트럴로 350', '강남대로 396', '명동길 26'],
    cities: ['서울특별시', '부산광역시', '전주시', '성남시', '대구광역시', '인천광역시', '서울특별시', '서울특별시'],
    states: ['강남구', '해운대구', '완산구', '분당구', '수성구', '연수구', '서초구', '중구'],
    zips: ['06236', '48099', '55103', '13606', '42019', '21984', '06644', '04536'],
    phones: () => `010-${Math.floor(Math.random() * 9000 + 1000)}-${Math.floor(Math.random() * 9000 + 1000)}`,
  },
  'ID': {
    names: ['Budi Santoso', 'Dewi Lestari', 'Ahmad Fauzi', 'Siti Rahayu', 'Muhammad Rizki', 'Putri Wulandari', 'Agus Setiawan', 'Rina Marlina'],
    streets: ['Jl. Sudirman No. 1', 'Jl. Thamrin No. 42', 'Jl. Gatot Subroto No. 7', 'Jl. Diponegoro No. 15', 'Jl. Imam Bonjol No. 3', 'Jl. Hayam Wuruk No. 8', 'Jl. Malioboro No. 12', 'Jl. Asia Afrika No. 25'],
    cities: ['Jakarta', 'Bandung', 'Surabaya', 'Yogyakarta', 'Medan', 'Semarang', 'Makassar', 'Bali'],
    states: ['DKI Jakarta', 'Jawa Barat', 'Jawa Timur', 'DI Yogyakarta', 'Sumatera Utara', 'Jawa Tengah', 'Sulawesi Selatan', 'Bali'],
    zips: ['12190', '40112', '60271', '55223', '20111', '50132', '90113', '80361'],
    phones: () => `+62-${Math.floor(Math.random() * 90 + 10)}-${Math.floor(Math.random() * 9000 + 1000)}-${Math.floor(Math.random() * 9000 + 1000)}`,
  },
  'BR': {
    names: ['João Silva', 'Maria Santos', 'Pedro Oliveira', 'Ana Costa', 'Lucas Souza', 'Julia Ferreira', 'Gabriel Lima', 'Beatriz Pereira'],
    streets: ['Rua Augusta, 100', 'Av. Paulista, 200', 'Rua das Flores, 300', 'Av. Atlântica, 400', 'Rua da Bahia, 500', 'Av. Brasil, 600', 'Rua XV de Novembro, 700', 'Av. Rio Branco, 800'],
    cities: ['São Paulo', 'Rio de Janeiro', 'Belo Horizonte', 'Brasília', 'Salvador', 'Curitiba', 'Fortaleza', 'Recife'],
    states: ['SP', 'RJ', 'MG', 'DF', 'BA', 'PR', 'CE', 'PE'],
    zips: ['01310-100', '22041-080', '30130-000', '70040-010', '40020-000', '80020-000', '60060-000', '50030-000'],
    phones: () => `+55-${Math.floor(Math.random() * 90 + 11)}-${Math.floor(Math.random() * 9000 + 1000)}-${Math.floor(Math.random() * 9000 + 1000)}`,
  },
};

function genEmail(name) {
  const domains = ['outlook.com', 'gmail.com', 'yahoo.com', 'hotmail.com', 'protonmail.com', 'mail.com', 'icloud.com'];
  const domain = domains[Math.floor(Math.random() * domains.length)];
  const clean = name.toLowerCase()
    .replace(/[^a-z\s]/g, '')
    .replace(/\s+/g, '.')
    .slice(0, 15);
  const num = Math.floor(Math.random() * 999) + 1;
  return `${clean}${num}@${domain}`;
}

function getTypeDetail(network, type) {
  const map = {
    'Visa': 'Visa Classic',
    'Mastercard': 'Mastercard World',
    'Amex': 'Amex Green',
    'Discover': 'Discover It',
    'UnionPay': 'UnionPay BI',
    'JCB': 'JCB Gold',
  };
  return map[network] || `${network} ${type}`;
}
function luhnCheck(card) {
  const digits = card.split('').map(Number);
  const odd = digits.slice(-1, -digits.length - 1, -2).reduce((a, b) => a + b, 0);
  const even = digits.slice(-2, -digits.length - 1, -2)
    .map(d => { const dd = d * 2; return dd > 9 ? dd - 9 : dd; })
    .reduce((a, b) => a + b, 0);
  return (odd + even) % 10;
}

function genCard(bin, length) {
  const bodyLen = length - bin.length - 1;
  const body = Array.from({ length: bodyLen }, () => Math.floor(Math.random() * 10)).join('');
  const partial = bin + body;
  for (let check = 0; check < 10; check++) {
    if (luhnCheck(partial + check) === 0) return partial + check;
  }
  return partial + '0';
}

function genExp() {
  const month = String(Math.floor(Math.random() * 12) + 1).padStart(2, '0');
  const year = 2027 + Math.floor(Math.random() * 4);
  return `${month}/${year}`;
}

function genCvv(network) {
  const len = network === 'Amex' ? 4 : 3;
  return String(Math.floor(Math.random() * (10 ** len))).padStart(len, '0');
}

function getBinInfo(bin) {
  // Try local DB first
  for (const prefix of [bin.slice(0, 6), bin.slice(0, 5), bin.slice(0, 4), bin.slice(0, 3)]) {
    if (BIN_DB[prefix]) return { ...BIN_DB[prefix], bin };
  }
  // Auto-detect from prefix
  if (bin.startsWith('4')) return { network: 'Visa', type: 'Credit', country: 'Unknown', issuer: 'Unknown', length: 16, bin };
  if (/^5[1-5]/.test(bin) || /^2[2-7]/.test(bin)) return { network: 'Mastercard', type: 'Credit', country: 'Unknown', issuer: 'Unknown', length: 16, bin };
  if (/^3[47]/.test(bin)) return { network: 'Amex', type: 'Credit', country: 'Unknown', issuer: 'Unknown', length: 15, bin };
  if (bin.startsWith('6011') || bin.startsWith('65')) return { network: 'Discover', type: 'Credit', country: 'Unknown', issuer: 'Unknown', length: 16, bin };
  if (bin.startsWith('62')) return { network: 'UnionPay', type: 'Debit', country: 'CN', issuer: 'UnionPay', length: 16, bin };
  if (bin.startsWith('35')) return { network: 'JCB', type: 'Credit', country: 'Unknown', issuer: 'Unknown', length: 16, bin };
  return { network: 'Unknown', type: 'Unknown', country: 'Unknown', issuer: 'Unknown', length: 16, bin };
}

async function generateCC() {
  const bin = document.getElementById('cc-bin').value.trim();
  if (bin.length < 6 || bin.length > 10) return showToast('❌ BIN must be 6-10 digits');
  if (!/^\d+$/.test(bin)) return showToast('❌ BIN must be numeric');

  const qty = parseInt(document.getElementById('cc-qty').value);
  const country = document.getElementById('cc-country').value;
  const binInfo = getBinInfo(bin);
  const countryData = COUNTRY_DATA[country] || COUNTRY_DATA['US'];

  // Show BIN info
  const binInfoEl = document.getElementById('bin-info');
  binInfoEl.classList.remove('hidden');
  document.getElementById('bin-details').innerHTML = `
    <div class="info-item"><span class="info-key">Network</span><span class="info-val">${binInfo.network}</span></div>
    <div class="info-item"><span class="info-key">Type</span><span class="info-val">${binInfo.type}</span></div>
    <div class="info-item"><span class="info-key">Country</span><span class="info-val">${country}</span></div>
    <div class="info-item"><span class="info-key">Issuer</span><span class="info-val">${binInfo.issuer}</span></div>
  `;

  // Generate cards
  const cards = [];
  for (let i = 0; i < qty; i++) {
    const card = genCard(bin, binInfo.length);
    const exp = genExp();
    const cvv = genCvv(binInfo.network);
    const nameIdx = Math.floor(Math.random() * countryData.names.length);
    const streetIdx = Math.floor(Math.random() * countryData.streets.length);
    const cityIdx = Math.floor(Math.random() * countryData.cities.length);
    const phone = countryData.phones();
    const email = genEmail(countryData.names[nameIdx]);

    cards.push({
      card, exp, cvv,
      bin: bin.slice(0, 10),
      type: getTypeDetail(binInfo.network, binInfo.type),
      name: countryData.names[nameIdx],
      street: countryData.streets[streetIdx],
      city: countryData.cities[cityIdx],
      state: countryData.states[cityIdx],
      zip: countryData.zips[cityIdx],
      phone,
      email,
      country,
    });
  }

  // Render
  const resultsEl = document.getElementById('cc-results');
  resultsEl.classList.remove('hidden');
  document.getElementById('cc-container').innerHTML = cards.map((c, i) => `
    <div class="cc-card" id="cc-${i}">
      <div>
        <div class="cc-number">${c.card}</div>
        <div class="cc-details">
          <span>Exp:${c.exp}</span>
          <span>CVV:${c.cvv}</span>
        </div>
        <div class="cc-details" style="margin-top:4px; font-size:11px; color:var(--text-dim)">
          <span>N:${c.bin}</span>
          <span>Type: ${c.type}</span>
        </div>
        <div class="cc-details" style="margin-top:2px; font-size:11px; color:var(--text-dim)">
          <span>Name: ${c.name}</span>
        </div>
        <div class="cc-details" style="margin-top:2px; font-size:11px; color:var(--text-dim)">
          <span>Street: ${c.street}</span>
        </div>
        <div class="cc-details" style="margin-top:2px; font-size:11px; color:var(--text-dim)">
          <span>City: ${c.city}, ${c.zip}</span>
        </div>
        <div class="cc-details" style="margin-top:2px; font-size:11px; color:var(--text-dim)">
          <span>Country: ${c.country}</span>
        </div>
        <div class="cc-details" style="margin-top:2px; font-size:11px; color:var(--text-dim)">
          <span>Phone: ${c.phone}</span>
        </div>
        <div class="cc-details" style="margin-top:2px; font-size:11px; color:var(--text-dim)">
          <span>Email: ${c.email}</span>
        </div>
      </div>
      <button class="cc-copy" onclick="copyCC(${i})">📋</button>
    </div>
  `).join('');

  // Auto-fill batch check textarea
  const lines = cards.map(c => {
    const [mm, yy] = c.exp.split('/');
    return `${c.card}|${mm}/${yy}|${c.cvv}`;
  });
  document.getElementById('check-batch').value = lines.join('\n');

  // Store for copy and batch check
  window._ccCards = cards;
  window._ccLines = lines;
  showToast(`✅ ${qty} cards generated`);
}

function copyCC(idx) {
  const c = window._ccCards[idx];
  const text = [
    c.card,
    `Exp:${c.exp} CVV:${c.cvv}`,
    `N:${c.bin}`,
    `Type: ${c.type}`,
    `Name: ${c.name}`,
    `Street:${c.street}`,
    `City:${c.city}, ${c.zip}`,
    `Country: ${c.country}`,
    `Phone:${c.phone}`,
    `Email: ${c.email}`,
  ].join('\n');
  navigator.clipboard.writeText(text).then(() => showToast('📋 Copied'));
}

function copyAllCC() {
  const text = window._ccCards.map(c => [
    c.card,
    `Exp:${c.exp} CVV:${c.cvv}`,
    `N:${c.bin}`,
    `Type: ${c.type}`,
    `Name: ${c.name}`,
    `Street:${c.street}`,
    `City:${c.city}, ${c.zip}`,
    `Country: ${c.country}`,
    `Phone:${c.phone}`,
    `Email: ${c.email}`,
  ].join('\n')).join('\n\n');
  navigator.clipboard.writeText(text).then(() => showToast(`📋 ${window._ccCards.length} cards copied`));
}

// ============================================================
// BIN LOOKUP
// ============================================================

async function lookupBIN() {
  const bin = document.getElementById('bin-lookup-input').value.trim();
  if (bin.length < 6) return showToast('❌ BIN must be 6-8 digits');

  const resultEl = document.getElementById('bin-lookup-result');
  const detailsEl = document.getElementById('bin-lookup-details');
  resultEl.classList.remove('hidden');
  detailsEl.innerHTML = '<div style="color:var(--text-dim)">Looking up...</div>';

  // Try API first
  let data = null;
  try {
    const resp = await fetch(`https://lookup.binlist.net/${bin.slice(0, 6)}`, {
      headers: { 'Accept-Version': '3' }
    });
    if (resp.ok) data = await resp.json();
  } catch {}

  // Fallback to local DB
  if (!data) {
    const local = getBinInfo(bin);
    data = {
      scheme: local.network.toLowerCase(),
      type: local.type.toLowerCase(),
      brand: local.network,
      country: { alpha2: local.country, name: getCountryName(local.country) },
      bank: { name: local.issuer },
    };
  }

  detailsEl.innerHTML = `
    <div class="info-item"><span class="info-key">Network</span><span class="info-val">${(data.scheme || data.network || 'Unknown').toUpperCase()}</span></div>
    <div class="info-item"><span class="info-key">Brand</span><span class="info-val">${data.brand || data.scheme || 'Unknown'}</span></div>
    <div class="info-item"><span class="info-key">Type</span><span class="info-val">${(data.type || 'Unknown').toUpperCase()}</span></div>
    <div class="info-item"><span class="info-key">Country</span><span class="info-val">${data.country?.name || data.country || 'Unknown'} (${data.country?.alpha2 || '?'})</span></div>
    <div class="info-item"><span class="info-key">Issuer</span><span class="info-val">${data.bank?.name || data.issuer || 'Unknown'}</span></div>
    <div class="info-item"><span class="info-key">BIN</span><span class="info-val">${bin}</span></div>
  `;
}

function getCountryName(code) {
  const map = {'US':'United States','UK':'United Kingdom','DE':'Germany','FR':'France','JP':'Japan','KR':'South Korea','ID':'Indonesia','BR':'Brazil','CN':'China','SG':'Singapore','AU':'Australia','CA':'Canada','IN':'India','NL':'Netherlands','ES':'Spain','IT':'Italy'};
  return map[code] || code || 'Unknown';
}

// ============================================================
// CC CHECKER (chkr.cc API)
// ============================================================

async function batchCheckFromGen() {
  // Use stored lines from generateCC
  const lines = window._ccLines;
  if (!lines || !lines.length) return showToast('❌ Generate CC first');

  const resultsEl = document.getElementById('batch-results');
  const containerEl = document.getElementById('batch-container');
  const statsEl = document.getElementById('batch-stats');
  resultsEl.classList.remove('hidden');
  containerEl.innerHTML = '<div style="color:var(--text-dim); padding:16px">Checking...</div>';

  let live = 0, die = 0, unknown = 0;
  const results = [];

  for (const line of lines) {
    const parts = line.split('|').map(p => p.trim());
    const card = parts[0], exp = parts[1], cvv = parts[2];
    const [mm, yy] = exp.split('/');
    const dataStr = `${card}|${mm}|${yy}|${cvv}`;

    try {
      const proxyUrl = 'https://corsproxy.io/?' + encodeURIComponent('https://api.chkr.cc/');
      const resp = await fetch(proxyUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: dataStr, charge: false }),
      });

      if (resp.status === 429) {
        results.push({ card, exp, cvv, status: 'rate_limited' });
        unknown++;
      } else {
        const data = await resp.json();
        const status = (data.status || 'unknown').toLowerCase();
        if (status === 'live') live++;
        else if (status === 'die') die++;
        else unknown++;
        results.push({ card, exp, cvv, status, bank: data.card?.bank, message: data.message });
      }
    } catch {
      results.push({ card, exp, cvv, status: 'error' });
      unknown++;
    }
    await new Promise(r => setTimeout(r, 2500));
  }

  statsEl.textContent = `✅ ${live} Live | ❌ ${die} Die | ⚠️ ${unknown} Unknown`;
  containerEl.innerHTML = results.map(r => {
    const statusColor = r.status === 'live' ? 'var(--green)' : r.status === 'die' ? 'var(--red)' : 'var(--yellow)';
    const emoji = r.status === 'live' ? '✅' : r.status === 'die' ? '❌' : '⚠️';
    const label = r.status === 'rate_limited' ? 'RATE LIMITED' : r.status.toUpperCase();
    return `
      <div class="cc-card">
        <div>
          <div class="cc-number">${r.card}</div>
          <div class="cc-details">
            <span>${r.exp}</span>
            <span>${r.cvv}</span>
            ${r.bank ? `<span>${r.bank}</span>` : ''}
          </div>
          ${r.message ? `<div style="font-size:10px; color:var(--text-dim); margin-top:2px">${r.message}</div>` : ''}
        </div>
        <div style="font-size:14px; font-weight:700; color:${statusColor}; font-family:'JetBrains Mono',monospace">
          ${emoji} ${label}
        </div>
      </div>
    `;
  }).join('');

  showToast(`Checked: ${live} live, ${die} die, ${unknown} unknown`);
}

async function checkCC() {
  const card = document.getElementById('check-card').value.trim().replace(/\s/g, '');
  const exp = document.getElementById('check-exp').value.trim();
  const cvv = document.getElementById('check-cvv').value.trim();

  if (!card || card.length < 13) return showToast('❌ Enter valid card number');
  if (!exp || !/^\d{2}\/\d{2}$/.test(exp)) return showToast('❌ Exp format: MM/YY');
  if (!cvv) return showToast('❌ Enter CVV');

  const resultEl = document.getElementById('check-result');
  const contentEl = document.getElementById('check-result-content');
  resultEl.classList.remove('hidden');
  contentEl.innerHTML = '<div style="color:var(--text-dim)">Checking...</div>';

  const [mm, yy] = exp.split('/');
  const dataStr = `${card}|${mm}|${yy}|${cvv}`;

  try {
    const proxyUrl = 'https://corsproxy.io/?' + encodeURIComponent('https://api.chkr.cc/');
    const resp = await fetch(proxyUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ data: dataStr, charge: false }),
    });

    if (resp.status === 429) {
      contentEl.innerHTML = `
        <div style="text-align:center; padding:16px; color:var(--yellow)">
          <div style="font-size:32px; margin-bottom:8px">⚠️</div>
          <div>Rate Limited — try again later</div>
          <div style="font-size:11px; color:var(--text-dim); margin-top:4px">~10 checks per IP per hour</div>
        </div>
      `;
      return;
    }

    const data = await resp.json();
    const status = (data.status || 'unknown').toLowerCase();
    const statusColor = status === 'live' ? 'var(--green)' : status === 'die' ? 'var(--red)' : 'var(--yellow)';
    const statusEmoji = status === 'live' ? '✅' : status === 'die' ? '❌' : '⚠️';
    const bank = data.card?.bank || 'Unknown';
    const type = data.card?.type || 'Unknown';
    const category = data.card?.category || '';

    contentEl.innerHTML = `
      <div style="text-align:center; padding:16px">
        <div style="font-size:48px; margin-bottom:12px">${statusEmoji}</div>
        <div style="font-size:24px; font-weight:700; color:${statusColor}; text-transform:uppercase; font-family:'JetBrains Mono',monospace">${status}</div>
        <div style="font-size:13px; color:var(--text-dim); margin-top:8px">${card}</div>
        <div style="font-size:12px; color:var(--text-dim); margin-top:4px">Exp: ${exp} | CVV: ${cvv}</div>
        <div style="font-size:12px; color:var(--text-dim); margin-top:4px">Bank: ${bank} | Type: ${type} ${category}</div>
        ${data.message ? `<div style="font-size:11px; color:var(--text-dim); margin-top:6px; font-style:italic">${data.message}</div>` : ''}
      </div>
    `;
  } catch (e) {
    contentEl.innerHTML = `
      <div style="text-align:center; padding:16px; color:var(--red)">
        <div style="font-size:32px; margin-bottom:8px">⚠️</div>
        <div>API Error — try again later</div>
        <div style="font-size:11px; color:var(--text-dim); margin-top:4px">${e.message}</div>
      </div>
    `;
  }
}

async function batchCheckCC() {
  const raw = document.getElementById('check-batch').value.trim();
  if (!raw) return showToast('❌ Enter cards to check');

  const lines = raw.split('\n').filter(l => l.trim());
  const cards = lines.map(line => {
    const parts = line.split('|').map(p => p.trim());
    if (parts.length >= 3) {
      return { card: parts[0], exp: parts[1], cvv: parts[2] };
    }
    return null;
  }).filter(Boolean);

  if (!cards.length) return showToast('❌ Format: CARD|MM/YY|CVV');

  const resultsEl = document.getElementById('batch-results');
  const containerEl = document.getElementById('batch-container');
  const statsEl = document.getElementById('batch-stats');
  resultsEl.classList.remove('hidden');
  containerEl.innerHTML = '<div style="color:var(--text-dim); padding:16px">Checking...</div>';

  let live = 0, die = 0, unknown = 0;
  const results = [];

  for (const c of cards) {
    const [mm, yy] = c.exp.split('/');
    const dataStr = `${c.card}|${mm}|${yy}|${c.cvv}`;

    try {
      const proxyUrl = 'https://corsproxy.io/?' + encodeURIComponent('https://api.chkr.cc/');
      const resp = await fetch(proxyUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ data: dataStr, charge: false }),
      });

      if (resp.status === 429) {
        results.push({ ...c, status: 'rate_limited' });
        unknown++;
      } else {
        const data = await resp.json();
        const status = (data.status || 'unknown').toLowerCase();
        if (status === 'live') live++;
        else if (status === 'die') die++;
        else unknown++;
        results.push({ ...c, status, bank: data.card?.bank, message: data.message });
      }
    } catch {
      results.push({ ...c, status: 'error' });
      unknown++;
    }

    // Rate limit: 2500ms between requests (chkr.cc UI standard)
    await new Promise(r => setTimeout(r, 2500));
  }

  statsEl.textContent = `✅ ${live} Live | ❌ ${die} Die | ⚠️ ${unknown} Unknown`;

  containerEl.innerHTML = results.map(r => {
    const statusColor = r.status === 'live' ? 'var(--green)' : r.status === 'die' ? 'var(--red)' : 'var(--yellow)';
    const emoji = r.status === 'live' ? '✅' : r.status === 'die' ? '❌' : '⚠️';
    const label = r.status === 'rate_limited' ? 'RATE LIMITED' : r.status.toUpperCase();
    return `
      <div class="cc-card">
        <div>
          <div class="cc-number">${r.card}</div>
          <div class="cc-details">
            <span>${r.exp}</span>
            <span>${r.cvv}</span>
            ${r.bank ? `<span>${r.bank}</span>` : ''}
          </div>
          ${r.message ? `<div style="font-size:10px; color:var(--text-dim); margin-top:2px">${r.message}</div>` : ''}
        </div>
        <div style="font-size:14px; font-weight:700; color:${statusColor}; font-family:'JetBrains Mono',monospace">
          ${emoji} ${label}
        </div>
      </div>
    `;
  }).join('');

  showToast(`Checked: ${live} live, ${die} die, ${unknown} unknown`);
}

// ============================================================
// 4. CRON JOB MANAGER
// ============================================================

let cronJobs = loadStore('kudaw_cron');

function renderCron() {
  const container = document.getElementById('cron-container');
  document.getElementById('cron-total').textContent = cronJobs.length;
  document.getElementById('cron-active').textContent = cronJobs.filter(j => j.status === 'active').length;
  document.getElementById('cron-paused').textContent = cronJobs.filter(j => j.status === 'paused').length;

  if (!cronJobs.length) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">⏰</div>
        <p>No cron jobs configured</p>
        <button class="btn-primary" onclick="showAddCron()">+ Create First Job</button>
      </div>`;
    return;
  }

  container.innerHTML = cronJobs.map((j, idx) => {
    const badgeClass = j.status === 'active' ? 'badge-active' : 'badge-paused';
    return `
      <div class="card">
        <div class="card-header">
          <div class="card-title">${j.name}</div>
          <span class="card-badge ${badgeClass}">${j.status}</span>
        </div>
        <div class="card-meta">
          <span class="card-meta-item">⏰ ${j.schedule}</span>
          <span class="card-meta-item">🤖 ${j.provider}/${j.model}</span>
        </div>
        <div style="font-size:12px; color:var(--text-dim); margin-top:8px; font-family:var(--mono)">
          ${j.prompt.slice(0, 80)}${j.prompt.length > 80 ? '...' : ''}
        </div>
        <div class="card-actions">
          <button class="card-action" onclick="toggleCronStatus(${idx})">${j.status === 'active' ? '⏸ Pause' : '▶ Resume'}</button>
          <button class="card-action" onclick="runCronNow(${idx})">▶ Run Now</button>
          <button class="card-action" onclick="deleteCron(${idx})">🗑️ Delete</button>
        </div>
      </div>
    `;
  }).join('');
}

function showAddCron() {
  document.getElementById('modal-cron').classList.remove('hidden');
}

function saveCron() {
  const name = document.getElementById('cron-name').value.trim();
  if (!name) return showToast('❌ Enter job name');

  cronJobs.push({
    name,
    schedule: document.getElementById('cron-schedule').value.trim() || '30m',
    provider: document.getElementById('cron-provider').value,
    model: document.getElementById('cron-model').value.trim() || 'mimo-v2.5-pro',
    prompt: document.getElementById('cron-prompt').value.trim(),
    deliver: document.getElementById('cron-deliver').value,
    status: 'active',
    created: Date.now(),
  });

  saveStore('kudaw_cron', cronJobs);
  renderCron();
  closeModal('cron');
  showToast(`✅ ${name} created`);
}

function toggleCronStatus(idx) {
  cronJobs[idx].status = cronJobs[idx].status === 'active' ? 'paused' : 'active';
  saveStore('kudaw_cron', cronJobs);
  renderCron();
}

function runCronNow(idx) {
  showToast(`▶ Running: ${cronJobs[idx].name}`);
  // In production: send request to backend API
}

function deleteCron(idx) {
  if (!confirm(`Delete ${cronJobs[idx].name}?`)) return;
  cronJobs.splice(idx, 1);
  saveStore('kudaw_cron', cronJobs);
  renderCron();
  showToast('🗑️ Deleted');
}

// ============================================================
// MODAL HELPERS
// ============================================================

function closeModal(name) {
  document.getElementById(`modal-${name}`).classList.add('hidden');
}

// Close modal on backdrop click
document.querySelectorAll('.modal').forEach(modal => {
  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.classList.add('hidden');
  });
});

// ============================================================
// INIT
// ============================================================

loadDrops();
renderAirdrops();
renderCron();
