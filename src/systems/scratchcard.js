const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  PermissionFlagsBits,
} = require('discord.js');
const { getBalance, deductDiamonds, addDiamonds, hasFunds, SCRATCH_COST } = require('./economy');
const { buildEconomyRow } = require('./gacha');

const scratchChannels = new Map(); // userId -> channelId
const scratchState    = new Map(); // messageId -> { cells, revealed, userId }

// ── Symboles & Paiements ───────────────────────────────────────────────────────

const SYMBOLS = ['💎', '7️⃣', '🌟', '🎰', '🍀', '❌'];
const WEIGHTS  = [ 10,    8,   15,   12,   10,   45];

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
  for (let i = 0; i < SYMBOLS.length; i++) { rand -= WEIGHTS[i]; if (rand <= 0) return SYMBOLS[i]; }
  return '❌';
}

function calculateResult(cells) {
  const key = cells.join('');
  if (PAYOUTS[key]) return { ...PAYOUTS[key], won: true };
  const counts = {};
  cells.forEach(c => counts[c] = (counts[c] || 0) + 1);
  if (Math.max(...Object.values(counts)) >= 2) return { label: '✨ PAIRE', gain: 25, color: 0x1abc9c, won: true };
  return { label: '😔 PERDU', gain: 0, color: 0x636e72, won: false };
}

// ── Embeds ─────────────────────────────────────────────────────────────────────

function buildRevealEmbed(user, cells, revealed) {
  const done = revealed.filter(Boolean).length;
  const revs = cells.filter((_, i) => revealed[i]);
  const hot  = done === 2 && revs[0] === revs[1];
  const display = cells.map((s, i) => revealed[i] ? s : '⬛').join('  ╱  ');
  let hint = '';
  if (done === 1) hint = '🔎 Encore **2 cases** à gratter...';
  else if (done === 2) hint = hot
    ? '🔥 **JACKPOT POTENTIEL !** Gratte la dernière case !'
    : '😬 Plus qu\'**1 case**... bonne chance !';
  return new EmbedBuilder()
    .setTitle('🎴 EN COURS...')
    .setColor(hot ? 0xff6b35 : 0x5865F2)
    .setDescription(`**${display}**\n\n${hint}`)
    .setFooter({ text: `${done}/3 cases révélées` });
}

function buildResultEmbed(user, cells, result) {
  const net = result.gain - SCRATCH_COST;
  return new EmbedBuilder()
    .setTitle(`🎴 ${result.label}`)
    .setColor(result.color)
    .setDescription(
      `**${cells.join('  ╱  ')}**\n\n` +
      (result.won
        ? `🏆 **Gain :** +${result.gain} 💎\n${net >= 0 ? '📈' : '📉'} **Net :** ${net >= 0 ? '+' : ''}${net} 💎`
        : `😔 **Aucun gain...**\n📉 **Coût :** -${SCRATCH_COST} 💎`) +
      `\n\n💎 **Solde :** ${getBalance(user.id)} 💎`
    )
    .setFooter({ text: result.won ? '🎊 Félicitations !' : 'Retente ta chance !' })
    .setTimestamp();
}

// ── Boutons ────────────────────────────────────────────────────────────────────

function buildScratchButtons(revealed) {
  const labels = ['1️⃣', '2️⃣', '3️⃣'];
  return new ActionRowBuilder().addComponents(
    ...revealed.map((done, i) =>
      new ButtonBuilder()
        .setCustomId(`scratch_cell_${i}`)
        .setLabel(done ? '✅' : `🪙 Gratter ${labels[i]}`)
        .setStyle(done ? ButtonStyle.Secondary : ButtonStyle.Success)
        .setDisabled(done)
    )
  );
}

function buildEndButtons(canReplay) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('scratch_replay')
      .setLabel(`🔄 Rejouer (${SCRATCH_COST} 💎)`)
      .setStyle(ButtonStyle.Primary)
      .setDisabled(!canReplay),
    new ButtonBuilder()
      .setCustomId('scratch_close')
      .setLabel('🔒 Fermer le salon')
      .setStyle(ButtonStyle.Danger),
  );
}

// ── Panneau casino posté par !casino scratch #salon ────────────────────────────

async function postCasinoEmbed(channel) {
  const embed = new EmbedBuilder()
    .setTitle('🎰 CASINO — Ticket à Gratter')
    .setDescription(
      `**Tente ta chance et gratte les 3 cases !**\n\n` +
      `**💰 Gains possibles :**\n` +
      `> 💎💎💎 — **Jackpot +500 💎**\n` +
      `> 7️⃣7️⃣7️⃣ — **Gros lot +300 💎**\n` +
      `> 🌟🌟🌟 — **Super +150 💎**\n` +
      `> 🎰🎰🎰 — **Casino +100 💎**\n` +
      `> 🍀🍀🍀 — **Chance +75 💎**\n` +
      `> ✨ Paire — **+25 💎**\n\n` +
      `💸 **Coût par ticket :** ${SCRATCH_COST} 💎\n\n` +
      `⬇️ Utilise les boutons ci-dessous !`
    )
    .setColor(0xf1c40f)
    .setFooter({ text: 'Un salon privé sera créé rien que pour toi !' })
    .setTimestamp();

  await channel.send({
    embeds: [embed],
    components: [
      new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('casino_start_scratch')
          .setLabel('🎴 Ouvrir un ticket à gratter')
          .setStyle(ButtonStyle.Success)
      ),
      buildEconomyRow(),
    ],
  });
}

// ── Handler : bouton "Ouvrir un ticket" sur le panneau ─────────────────────────

async function handleCasinoStartScratch(interaction) {
  const user  = interaction.user;
  const guild = interaction.guild;

  if (!hasFunds(user.id, SCRATCH_COST)) {
    return interaction.reply({
      content:
        `❌ Tu n'as pas assez de 💎 !\n` +
        `💎 Solde : **${getBalance(user.id)} 💎** — Requis : **${SCRATCH_COST} 💎**\n` +
        `> Clique sur **🎁 Daily gratuit** juste en dessous !`,
      ephemeral: true,
    });
  }

  const existingId = scratchChannels.get(user.id);
  if (existingId) {
    const existing = guild.channels.cache.get(existingId);
    if (existing) return interaction.reply({ content: `🎴 Tu as déjà un salon ouvert : ${existing}`, ephemeral: true });
    scratchChannels.delete(user.id);
  }

  await interaction.deferReply({ ephemeral: true });
  const channel = await openScratchChannel(guild, user);
  await sendScratchCard(channel, user);
  await interaction.editReply(`🎴 Ton salon de grattage est prêt : ${channel}`);
}

// ── Création du salon privé ────────────────────────────────────────────────────

async function openScratchChannel(guild, user) {
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
    topic: `🎴 Ticket à gratter de ${user.tag}`,
    permissionOverwrites,
  });

  scratchChannels.set(user.id, channel.id);
  return channel;
}

async function sendScratchCard(channel, user) {
  deductDiamonds(user.id, SCRATCH_COST);
  const cells = [pickSymbol(), pickSymbol(), pickSymbol()];
  const embed = new EmbedBuilder()
    .setTitle('🎴 TICKET À GRATTER')
    .setColor(0x5865F2)
    .setDescription(
      `**⬛  ╱  ⬛  ╱  ⬛**\n\n` +
      `✨ Gratte les **3 cases** dans l'ordre que tu veux !\n\n` +
      `> 💸 Coût payé : **${SCRATCH_COST} 💎**\n` +
      `> 💰 Solde : **${getBalance(user.id)} 💎**`
    )
    .setFooter({ text: 'Clique case par case pour révéler tes symboles !' });

  const msg = await channel.send({ embeds: [embed], components: [buildScratchButtons([false, false, false])] });
  scratchState.set(msg.id, { cells, revealed: [false, false, false], userId: user.id });
  return msg;
}

// ── Handlers animation ─────────────────────────────────────────────────────────

async function handleScratchCell(interaction, cellIndex) {
  const state = scratchState.get(interaction.message.id);
  if (!state) return interaction.reply({ content: '❌ Partie introuvable.', ephemeral: true });
  if (state.userId !== interaction.user.id) return interaction.reply({ content: '❌ Ce n\'est pas ton ticket !', ephemeral: true });
  if (state.revealed[cellIndex]) return interaction.reply({ content: '❌ Case déjà révélée !', ephemeral: true });

  state.revealed[cellIndex] = true;

  if (state.revealed.every(Boolean)) {
    const result = calculateResult(state.cells);
    if (result.won) addDiamonds(interaction.user.id, result.gain);
    scratchState.delete(interaction.message.id);

    await interaction.update({
      embeds: [buildResultEmbed(interaction.user, state.cells, result)],
      components: [buildEndButtons(hasFunds(interaction.user.id, SCRATCH_COST))],
    });
    await postResultToGainsChannel(interaction.guild, interaction.user, state.cells, result);
  } else {
    await interaction.update({
      embeds: [buildRevealEmbed(interaction.user, state.cells, state.revealed)],
      components: [buildScratchButtons(state.revealed)],
    });
  }
}

async function handleScratchReplay(interaction) {
  const user = interaction.user;
  if (!hasFunds(user.id, SCRATCH_COST)) {
    return interaction.reply({
      content: `❌ Solde insuffisant ! (**${getBalance(user.id)} 💎** / ${SCRATCH_COST} 💎 requis)`,
      ephemeral: true,
    });
  }
  deductDiamonds(user.id, SCRATCH_COST);
  const cells = [pickSymbol(), pickSymbol(), pickSymbol()];
  const embed = new EmbedBuilder()
    .setTitle('🎴 TICKET À GRATTER')
    .setColor(0x5865F2)
    .setDescription(
      `**⬛  ╱  ⬛  ╱  ⬛**\n\n` +
      `✨ Nouvelle partie ! Gratte les **3 cases** !\n\n` +
      `> 💸 Coût payé : **${SCRATCH_COST} 💎**\n` +
      `> 💰 Solde : **${getBalance(user.id)} 💎**`
    )
    .setFooter({ text: 'Clique case par case pour révéler tes symboles !' });
  await interaction.update({ embeds: [embed], components: [buildScratchButtons([false, false, false])] });
  scratchState.set(interaction.message.id, { cells, revealed: [false, false, false], userId: user.id });
}

async function handleScratchClose(interaction) {
  for (const [uid, cid] of scratchChannels.entries()) {
    if (cid === interaction.channelId) { scratchChannels.delete(uid); break; }
  }
  await interaction.reply({ content: '🔒 Fermeture dans **3 secondes**...', ephemeral: true });
  setTimeout(() => interaction.channel.delete('Ticket fermé').catch(() => {}), 3000);
}

// ── Log résultat dans salon séparé ────────────────────────────────────────────

async function postResultToGainsChannel(guild, user, cells, result) {
  const ch = guild.channels.cache.find(c =>
    ['gains', 'pertes', 'gains-pertes', 'casino-log', 'résultats', 'resultats']
      .some(kw => c.name.toLowerCase().replace(/[^a-z0-9]/g, '').includes(kw.replace(/[^a-z0-9]/g, '')))
  );
  if (!ch) return;
  const net = result.gain - SCRATCH_COST;
  await ch.send({
    embeds: [
      new EmbedBuilder()
        .setAuthor({ name: user.tag, iconURL: user.displayAvatarURL() })
        .setTitle(result.won ? `🏆 ${result.label}` : '😔 Ticket perdant')
        .setDescription(
          `> ${cells.join('  ╱  ')}\n\n` +
          (result.won
            ? `**+${result.gain} 💎** remportés !\n📊 Net : ${net >= 0 ? '+' : ''}${net} 💎`
            : `Aucun gain. (−${SCRATCH_COST} 💎)`) +
          `\n\n💎 Solde : **${getBalance(user.id)} 💎**`
        )
        .setColor(result.color)
        .setTimestamp(),
    ],
  }).catch(() => {});
}

module.exports = {
  postCasinoEmbed,
  handleCasinoStartScratch,
  handleScratchCell,
  handleScratchReplay,
  handleScratchClose,
  scratchChannels,
};
