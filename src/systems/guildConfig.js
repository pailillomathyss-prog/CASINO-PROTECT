const fs   = require('fs');
const path = require('path');

const DATA_DIR   = path.join(__dirname, '../../data');
const CONFIG_FILE = path.join(DATA_DIR, 'guildConfig.json');

function load() {
  try { return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8')); }
  catch { return {}; }
}

function save(data) {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(data, null, 2));
}

function get(guildId, key) {
  return load()[guildId]?.[key] ?? null;
}

function set(guildId, key, value) {
  const data = load();
  if (!data[guildId]) data[guildId] = {};
  data[guildId][key] = value;
  save(data);
}

/** Résout le salon gains/pertes : priorité au config enregistré, puis auto-détection par nom */
function getGainsChannel(guild) {
  const savedId = get(guild.id, 'gainsChannelId');
  if (savedId) {
    const ch = guild.channels.cache.get(savedId);
    if (ch) return ch;
  }
  // Fallback : chercher par nom
  return guild.channels.cache.find(c =>
    ['gains', 'pertes', 'gains-pertes', 'casino-log', 'résultats', 'resultats']
      .some(kw => c.name.toLowerCase().replace(/[^a-z0-9]/g, '').includes(kw.replace(/[^a-z0-9]/g, '')))
  ) || null;
}

module.exports = { get, set, getGainsChannel };
