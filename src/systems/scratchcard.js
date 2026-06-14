const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  PermissionFlagsBits,
} = require('discord.js');
const { getBalance, deductDiamonds, addDiamonds, hasFunds, SCRATCH_COST } = require('./economy');

// userId -> channelId (un seul salon par user)
const scratchChannels = new Map();

const SYMBOLS = ['💎', '7️⃣', '🌟', '🎰', '🍀', '❌'];
const WEIGHTS  = [ 10,    8,   15,   12,   10,   45]; // ❌ plus fréquent

const PAYOUTS = {
  '💎💎💎': { label: '💎 JACKPOT',   gain: 500, color: 0xf1c40f },
  '7️⃣7️⃣7️⃣': { label: '7️⃣ GROS LOT', gain: 300, color: 0xe74c3c },
  '🌟🌟🌟': { label: '🌟 SUPER',     gain: 150, color: 0x9b59b6 },
  '🎰🎰🎰': { label: '🎰 CASINO',    gain: 100, color: 0x3498db },
  '🍀🍀🍀': { label: '🍀 CHANCE',    gain:  75, color: 0x2ecc71 },
};

function pickSymbol() {
  const total = WEIGHTS.reduce((a, b) => a + b, 0);
  let rand = Math.random() * total;
  for (let i = 0; i < SYMBOLS.length; i++) {
    rand -= WEIGHTS[i];
    if (rand <= 0) return SYMBOLS[i];
  }
  return SYMBOLS[SYMBOLS.length - 1];
}

function generateResult() {
  const cells = [pickSymbol(), pickSymbol(), pickSymbol()];
  const key   = cells.join('');

  if (PAYOUTS[key]) {
    return { cells, ...PAYOUTS[key], won: true };
  }

  // Vérifier doublon
  const counts = {};
  cells.forEach(c => counts[c] = (counts[c] || 0) + 1);
  const maxCount = Math.max(...Object.values(counts));

  if (maxCount >= 2) {
    return { cells, label: '✨ PAIRE', gain: 25, color: 0x1abc9c, won: true };
  }

  return { cells, label: '😔 PERDU', gain: 0, color: 0x95a5a6, won: false };
}

function buildScratchEmbed(user, phase = 'wait') {
  if (phase === 'wait') {
    return new EmbedBuilder()
      .setTitle('🎴 TICKET À GRATTER')
      .setDescription(
        `> Bonne chance, ${user} !\n\n` +
        `┌─────────────────┐\n` +
        `│  ░░░  ░░░  ░░░  │\n` +
        `│  ░░░  ░░░  ░░░  │\n` +
        `└─────────────────┘\n\n` +
        `**Coût :** ${SCRATCH_COST} 💎\n` +
        `**Solde :** ${getBalance(user.id)} 💎`
      )
      .setColor(0x5865F2)
      .setFooter({ text: 'Clique sur Gratter pour révéler tes symboles !' });
  }
}

function buildResultEmbed(user, result) {
  const net = result.gain - SCRATCH_COST;

  return new EmbedBuilder()
    .setTitle(`🎴 ${result.label}`)
    .setDescription(
      `┌─────────────────┐\n` +
      `│  ${result.cells[0]}   ${result.cells[1]}   ${result.cells[2]}  │\n` +
      `└─────────────────┘\n\n` +
      (result.won
        ? `🏆 **Gain :** +${result.gain} 💎\n💰 **Net :** ${net >= 0 ? '+' : ''}${net} 💎`
        : `😔 **Aucun gain cette fois...**\n💸 **Coût :** -${SCRATCH_COST} 💎`) +
      `\n\n💎 **Nouveau solde :** ${getBalance(user.id)} 💎`
    )
    .setColor(result.color)
    .setTimestamp();
}

function buildButtons(userId) {
  const canReplay = hasFunds(userId, SCRATCH_COST);
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('scratch_replay')
      .setLabel(`🔄 Rejouer (${SCRATCH_COST}💎)`)
      .setStyle(ButtonStyle.Primary)
      .setDisabled(!canReplay),
    new ButtonBuilder()
      .setCustomId('scratch_close')
      .setLabel('🔒 Fermer')
      .setStyle(ButtonStyle.Danger),
  );
}

async function openScratchChannel(guild, user) {
  // Si l'utilisateur a déjà un salon, le renvoyer
  const existingId = scratchChannels.get(user.id);
  if (existingId) {
    const existing = guild.channels.cache.get(existingId);
    if (existing) return { channel: existing, isNew: false };
    scratchChannels.delete(user.id);
  }

  await guild.roles.fetch();
  const staffRoles = guild.roles.cache.filter(r =>
    ['🎫', 'support', 'staff', 'modo', 'admin'].some(kw => r.name.toLowerCase().includes(kw))
  );

  const permissionOverwrites = [
    { id: guild.id, deny: [PermissionFlagsBits.ViewChannel] },
    { id: user.id,  allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] },
  ];
  staffRoles.forEach(r => permissionOverwrites.push({
    id: r.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ReadMessageHistory],
  }));

  const channel = await guild.channels.create({
    name : `🎴-grattage-${user.username.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 20)}`,
    type : ChannelType.GuildText,
    topic: `Ticket à gratter de ${user.tag}`,
    permissionOverwrites,
  });

  scratchChannels.set(user.id, channel.id);
  return { channel, isNew: true };
}

async function sendScratchCard(channel, user) {
  const embed = buildScratchEmbed(user, 'wait');
  const row   = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('scratch_play')
      .setLabel('🎴 GRATTER !')
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId('scratch_close')
      .setLabel('🔒 Fermer')
      .setStyle(ButtonStyle.Danger),
  );
  await channel.send({ embeds: [embed], components: [row] });
}

async function handleScratchPlay(interaction) {
  const user   = interaction.user;
  const guild  = interaction.guild;

  if (!hasFunds(user.id, SCRATCH_COST)) {
    return interaction.reply({
      content: `❌ Tu n'as pas assez de 💎 ! Il te faut **${SCRATCH_COST} 💎**.\n💎 Ton solde : **${getBalance(user.id)} 💎**`,
      ephemeral: true,
    });
  }

  deductDiamonds(user.id, SCRATCH_COST);
  const result = generateResult();
  if (result.won) addDiamonds(user.id, result.gain);

  const embed = buildResultEmbed(user, result);
  const row   = buildButtons(user.id);

  await interaction.update({ embeds: [embed], components: [row] });

  // Poster dans #gains-pertes
  await postGainLog(guild, user, result);
}

async function handleScratchReplay(interaction) {
  const user = interaction.user;

  if (!hasFunds(user.id, SCRATCH_COST)) {
    return interaction.reply({
      content: `❌ Solde insuffisant ! Il te faut **${SCRATCH_COST} 💎**.\n💎 Ton solde : **${getBalance(user.id)} 💎**`,
      ephemeral: true,
    });
  }

  const embed = buildScratchEmbed(user, 'wait');
  const row   = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('scratch_play')
      .setLabel('🎴 GRATTER !')
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId('scratch_close')
      .setLabel('🔒 Fermer')
      .setStyle(ButtonStyle.Danger),
  );
  await interaction.update({ embeds: [embed], components: [row] });
}

async function handleScratchClose(interaction) {
  const channelId = interaction.channelId;

  for (const [uid, cid] of scratchChannels.entries()) {
    if (cid === channelId) { scratchChannels.delete(uid); break; }
  }

  await interaction.reply({ content: '🔒 Fermeture dans 3 secondes...', ephemeral: true });
  setTimeout(() => interaction.channel.delete().catch(() => {}), 3000);
}

async function postGainLog(guild, user, result) {
  const logChannel = guild.channels.cache.find(c =>
    ['gains', 'pertes', 'casino-log', 'résultats', 'resultats', 'casino-gains'].some(kw => c.name.toLowerCase().includes(kw))
  );
  if (!logChannel) return;

  const embed = new EmbedBuilder()
    .setAuthor({ name: user.tag, iconURL: user.displayAvatarURL() })
    .setTitle(result.won ? `🏆 ${result.label}` : '😔 Ticket perdant')
    .setDescription(
      `${result.cells[0]} ${result.cells[1]} ${result.cells[2]}\n\n` +
      (result.won
        ? `**+${result.gain} 💎** remportés !`
        : `Aucun gain (-${SCRATCH_COST} 💎)`)
    )
    .setColor(result.color)
    .setTimestamp()
    .setFooter({ text: `Solde : ${getBalance(user.id)} 💎` });

  await logChannel.send({ embeds: [embed] }).catch(() => {});
}

module.exports = {
  openScratchChannel, sendScratchCard,
  handleScratchPlay, handleScratchReplay, handleScratchClose,
  scratchChannels,
};
