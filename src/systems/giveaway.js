const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { sendLog } = require('./logs');

// Map giveawayMessageId -> { channelId, guildId, prize, winners, endTime, timeout }
const activeGiveaways = new Map();

function parseDuration(str) {
  const match = str.match(/^(\d+)(s|m|h|d)$/i);
  if (!match) return null;
  const val = parseInt(match[1]);
  const unit = match[2].toLowerCase();
  const multipliers = { s: 1000, m: 60000, h: 3600000, d: 86400000 };
  return val * multipliers[unit];
}

function formatTimeLeft(ms) {
  if (ms <= 0) return 'Terminé';
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (d > 0) return `${d}j ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${sec}s`;
  return `${sec}s`;
}

function buildGiveawayEmbed(prize, winners, endTime, ended = false, winnersList = []) {
  const timeLeft = formatTimeLeft(endTime - Date.now());
  const embed = new EmbedBuilder()
    .setTitle('🎁 GIVEAWAY 🎁')
    .setColor(ended ? 0x95a5a6 : 0xf1c40f)
    .setTimestamp(new Date(endTime));

  if (ended) {
    embed
      .setDescription(
        `**Lot :** ${prize}\n\n` +
        (winnersList.length > 0
          ? `🏆 **Gagnant(s) :** ${winnersList.map(id => `<@${id}>`).join(', ')}`
          : '😔 Aucun participant valide.')
      )
      .setFooter({ text: `Terminé • ${winners} gagnant(s)` });
  } else {
    embed
      .setDescription(
        `**Lot :** ${prize}\n\n` +
        `🎟️ Clique sur le bouton ci-dessous pour participer !\n\n` +
        `⏰ **Fin dans :** ${timeLeft}\n` +
        `🏆 **Gagnants :** ${winners}`
      )
      .setFooter({ text: `${winners} gagnant(s) • Fin` });
  }

  return embed;
}

function buildGiveawayRow(ended = false) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('giveaway_enter')
      .setLabel(ended ? 'Giveaway terminé' : '🎉 Participer')
      .setStyle(ended ? ButtonStyle.Secondary : ButtonStyle.Success)
      .setDisabled(ended)
  );
}

async function startGiveaway(channel, { prize, winners, durationMs, hostedBy }) {
  const endTime = Date.now() + durationMs;

  const embed = buildGiveawayEmbed(prize, winners, endTime);
  const row   = buildGiveawayRow();

  const msg = await channel.send({
    content: '🎊 **Un nouveau giveaway commence !**',
    embeds: [embed],
    components: [row],
  });

  // Stocker les participants (Set de userId)
  const participants = new Set();

  const data = {
    channelId    : channel.id,
    guildId      : channel.guild.id,
    prize,
    winners,
    endTime,
    hostedBy,
    participants,
    messageId    : msg.id,
  };

  // Mettre à jour l'embed toutes les minutes si > 5min, sinon toutes les 10s
  const updateInterval = setInterval(async () => {
    const left = endTime - Date.now();
    if (left <= 0) { clearInterval(updateInterval); return; }
    const upd = buildGiveawayEmbed(prize, winners, endTime);
    await msg.edit({ embeds: [upd] }).catch(() => {});
  }, durationMs > 300000 ? 60000 : 10000);

  data.updateInterval = updateInterval;

  // Timer de fin
  const timeout = setTimeout(() => endGiveaway(msg.id, channel.guild, channel), durationMs);
  data.timeout = timeout;

  activeGiveaways.set(msg.id, data);

  await sendLog(channel.guild, 'GIVEAWAY_START', {
    prize, winners, duration: formatTimeLeft(durationMs), hostedBy, channel,
  }).catch(() => {});

  return msg;
}

async function endGiveaway(messageId, guild, channel) {
  const data = activeGiveaways.get(messageId);
  if (!data) return null;

  clearTimeout(data.timeout);
  clearInterval(data.updateInterval);
  activeGiveaways.delete(messageId);

  const participants = [...data.participants];
  const winnerIds = [];

  // Tirage au sort
  const pool = [...participants];
  for (let i = 0; i < Math.min(data.winners, pool.length); i++) {
    const idx = Math.floor(Math.random() * pool.length);
    winnerIds.push(pool.splice(idx, 1)[0]);
  }

  // Récupérer le message et le mettre à jour
  const ch  = channel || guild.channels.cache.get(data.channelId);
  const msg = ch ? await ch.messages.fetch(messageId).catch(() => null) : null;

  if (msg) {
    const embed = buildGiveawayEmbed(data.prize, data.winners, data.endTime, true, winnerIds);
    const row   = buildGiveawayRow(true);
    await msg.edit({ embeds: [embed], components: [row] }).catch(() => {});

    const announcement = winnerIds.length > 0
      ? `🏆 Félicitations ${winnerIds.map(id => `<@${id}>`).join(', ')} ! Vous avez gagné **${data.prize}** !`
      : `😔 Personne n'a participé au giveaway pour **${data.prize}**.`;
    await msg.reply(announcement).catch(() => {});
  }

  await sendLog(guild, 'GIVEAWAY_END', {
    prize   : data.prize,
    winners : winnerIds,
    total   : participants.length,
  }).catch(() => {});

  return { winnerIds, data };
}

async function rerollGiveaway(messageId, guild, channel) {
  // On relit le message pour récupérer les anciens participants depuis la description
  const ch  = channel || guild.channels.cache.get(activeGiveaways.get(messageId)?.channelId);
  if (!ch) return null;

  const msg = await ch.messages.fetch(messageId).catch(() => null);
  if (!msg) return null;

  // Récupérer les participants du bouton via le composant — stocker dans gagnants passés
  // Pour le reroll, on repick parmi les participants existants si le giveaway est encore en cache
  const data = activeGiveaways.get(messageId);
  const pool = data ? [...data.participants] : [];

  if (pool.length === 0) {
    await msg.reply('❌ Impossible de reroll — aucun participant enregistré.').catch(() => {});
    return null;
  }

  const idx = Math.floor(Math.random() * pool.length);
  const winner = pool[idx];
  await msg.reply(`🔄 Reroll ! Le nouveau gagnant est <@${winner}> pour **${data.prize}** !`).catch(() => {});
  return winner;
}

// Gérer le clic sur le bouton "Participer"
async function handleGiveawayEnter(interaction) {
  const messageId = interaction.message.id;
  const data = activeGiveaways.get(messageId);

  if (!data) {
    return interaction.reply({ content: '❌ Ce giveaway est terminé.', ephemeral: true });
  }

  if (data.participants.has(interaction.user.id)) {
    data.participants.delete(interaction.user.id);
    return interaction.reply({ content: '😔 Tu as retiré ta participation au giveaway.', ephemeral: true });
  }

  data.participants.add(interaction.user.id);
  interaction.reply({ content: `🎉 Tu participes au giveaway pour **${data.prize}** ! Bonne chance !`, ephemeral: true });
}

function getActiveGiveaways() {
  return activeGiveaways;
}

module.exports = { startGiveaway, endGiveaway, rerollGiveaway, handleGiveawayEnter, parseDuration, getActiveGiveaways };
