const { sendLog } = require('./logs');

// Patterns de liens à bloquer
const LINK_PATTERNS = [
  /discord\.gg\/\S+/i,
  /discord\.com\/invite\/\S+/i,
  /youtu\.be\/\S+/i,
  /youtube\.com\/(watch|shorts|live)\S*/i,
  /tiktok\.com\/\S+/i,
  /twitch\.tv\/\S+/i,
  /instagram\.com\/\S+/i,
  /twitter\.com\/\S+/i,
  /x\.com\/\S+/i,
  /https?:\/\/[^\s]+/i,
];

// Salons exemptés (à remplir si besoin)
const EXEMPT_CHANNEL_IDS = [];

async function checkAntiLink(message) {
  if (!message.guild) return false;
  if (message.author.bot) return false;

  // Vérifier si le membre a les permissions d'administrateur
  const member = message.member;
  if (!member) return false;
  if (member.permissions.has('Administrator')) return false;
  if (member.permissions.has('ManageMessages')) return false;

  // Salon exempté
  if (EXEMPT_CHANNEL_IDS.includes(message.channelId)) return false;

  const content = message.content;
  let detectedLink = null;

  for (const pattern of LINK_PATTERNS) {
    const match = content.match(pattern);
    if (match) {
      detectedLink = match[0];
      break;
    }
  }

  if (!detectedLink) return false;

  // Supprimer le message
  await message.delete().catch(() => {});

  // Avertir l'utilisateur (message temporaire)
  const warning = await message.channel.send({
    content: `> ❌ **${message.author}**, les liens ne sont pas autorisés dans ce salon !`,
  });

  setTimeout(() => warning.delete().catch(() => {}), 5000);

  // Log
  await sendLog(message.guild, 'ANTILINK', {
    author: message.author,
    channel: message.channel,
    link: detectedLink,
  });

  return true;
}

module.exports = { checkAntiLink };
