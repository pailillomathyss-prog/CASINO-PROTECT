const { PermissionFlagsBits } = require('discord.js');
const { sendLog } = require('./logs');

// ── Tous les formats d'invitations Discord et liens externes ─────────────────
const DISCORD_PATTERNS = [
  /discord\.gg\/[a-zA-Z0-9\-]+/i,
  /discord\.com\/invite\/[a-zA-Z0-9\-]+/i,
  /discordapp\.com\/invite\/[a-zA-Z0-9\-]+/i,
  /discord\.me\/[a-zA-Z0-9\-]+/i,
  /dsc\.gg\/[a-zA-Z0-9\-]+/i,
  /discord\.io\/[a-zA-Z0-9\-]+/i,
  /invite\.gg\/[a-zA-Z0-9\-]+/i,
  /discord\.link\/[a-zA-Z0-9\-]+/i,
];

const OTHER_LINK_PATTERNS = [
  /youtu\.be\/[^\s]+/i,
  /youtube\.com\/(watch|shorts|live|channel)[^\s]*/i,
  /tiktok\.com\/[^\s]+/i,
  /twitch\.tv\/[^\s]+/i,
  /instagram\.com\/[^\s]+/i,
  /twitter\.com\/[^\s]+/i,
  /x\.com\/[^\s]+/i,
  /https?:\/\/[^\s]+/i,
];

const ALL_PATTERNS = [...DISCORD_PATTERNS, ...OTHER_LINK_PATTERNS];

// Salons exemptés — ajoute des IDs ici si besoin
const EXEMPT_CHANNEL_IDS = [];

async function checkAntiLink(message) {
  if (!message.guild) return false;
  if (message.author.bot) return false;

  const member = message.member;
  if (!member) return false;

  // Exempter admins et modérateurs
  if (member.permissions.has(PermissionFlagsBits.Administrator)) return false;
  if (member.permissions.has(PermissionFlagsBits.ManageMessages)) return false;

  // Salon exempté
  if (EXEMPT_CHANNEL_IDS.includes(message.channelId)) return false;

  const content = message.content;
  let detectedLink = null;
  let isDiscordInvite = false;

  // Vérifier d'abord les invitations Discord (priorité haute)
  for (const pattern of DISCORD_PATTERNS) {
    const match = content.match(pattern);
    if (match) {
      detectedLink = match[0];
      isDiscordInvite = true;
      break;
    }
  }

  // Puis les autres liens
  if (!detectedLink) {
    for (const pattern of OTHER_LINK_PATTERNS) {
      const match = content.match(pattern);
      if (match) {
        detectedLink = match[0];
        break;
      }
    }
  }

  if (!detectedLink) return false;

  // Vérifier que le bot peut supprimer des messages
  const botMember = message.guild.members.me;
  const canDelete = botMember && message.channel
    .permissionsFor(botMember)
    .has(PermissionFlagsBits.ManageMessages);

  if (canDelete) {
    await message.delete().catch(err =>
      console.log(`[ANTI-LINK] Impossible de supprimer le message : ${err.message}`)
    );
  } else {
    console.log('[ANTI-LINK] ⚠️  Le bot n\'a pas la permission ManageMessages pour supprimer les messages.');
  }

  // Avertissement temporaire (5 secondes)
  const warningText = isDiscordInvite
    ? `> 🚫 **${message.author}**, les invitations Discord ne sont pas autorisées ici !`
    : `> ❌ **${message.author}**, les liens externes ne sont pas autorisés dans ce salon !`;

  const warning = await message.channel.send({ content: warningText }).catch(() => null);
  if (warning) setTimeout(() => warning.delete().catch(() => {}), 5000);

  // Log
  await sendLog(message.guild, 'ANTILINK', {
    author: message.author,
    channel: message.channel,
    link: detectedLink,
  });

  return true;
}

module.exports = { checkAntiLink };
