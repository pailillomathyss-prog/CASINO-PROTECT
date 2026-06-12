const { sendLog } = require('./logs');

const SPAM_LIMIT = 5;       // Messages max
const SPAM_WINDOW = 4000;   // Fenêtre en ms (4 secondes)
const MUTE_DURATION = 5 * 60 * 1000; // 5 minutes en ms

const userMessageMap = new Map();

async function checkAntiSpam(message) {
  if (!message.guild) return;
  if (message.author.bot) return;

  const member = message.member;
  if (!member) return;
  if (member.permissions.has('Administrator')) return;
  if (member.permissions.has('ManageMessages')) return;

  const key = `${message.guild.id}-${message.author.id}`;
  const now = Date.now();

  if (!userMessageMap.has(key)) {
    userMessageMap.set(key, []);
  }

  // Filtrer les messages dans la fenêtre de temps
  const timestamps = userMessageMap.get(key).filter(t => now - t < SPAM_WINDOW);
  timestamps.push(now);
  userMessageMap.set(key, timestamps);

  if (timestamps.length < SPAM_LIMIT) return;

  // Spam détecté — vider le compteur immédiatement
  userMessageMap.set(key, []);

  // Supprimer les messages récents
  try {
    const messages = await message.channel.messages.fetch({ limit: 10 });
    const spamMessages = messages.filter(m => m.author.id === message.author.id);
    await message.channel.bulkDelete(spamMessages).catch(() => {});
  } catch {}

  // Appliquer un timeout de 5 minutes
  try {
    await member.timeout(MUTE_DURATION, 'Anti-spam : envoi de messages trop rapidement');
  } catch {}

  // Avertir (message temporaire)
  const warning = await message.channel.send({
    content: `> 🚫 **${message.author}**, tu as été réduit au silence pendant **5 minutes** pour spam.`,
  });
  setTimeout(() => warning.delete().catch(() => {}), 6000);

  // Log
  await sendLog(message.guild, 'ANTISPAM', {
    author: message.author,
    channel: message.channel,
  });
}

module.exports = { checkAntiSpam };
