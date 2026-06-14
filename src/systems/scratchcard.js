const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require('discord.js');
const { getBalance, deductDiamonds, addDiamonds, hasFunds, SCRATCH_COST } = require('./economy');
const { buildEconomyRow } = require('./gacha');

// État du grattage en cours : messageId -> { cells, revealed, userId }
const scratchState = new Map();

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

function buildRevealEmbed(cells, revealed) {
  const done    = revealed.filter(Boolean).length;
  const revSyms = cells.filter((_, i) => revealed[i]);
  const hot     = done === 2 && revSyms[0] === revSyms[1];
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
    .setFooter({ text: `${done}/3 cases révélées — Seul toi vois ce message` });
}

function buildResultEmbed(userId, cells, result) {
  const net = result.gain - SCRATCH_COST;
  return new EmbedBuilder()
    .setTitle(`🎴 ${result.label}`)
    .setColor(result.color)
    .setDescription(
      `**${cells.join('  ╱  ')}**\n\n` +
      (result.won
        ? `🏆 **Gain :** +${result.gain} 💎\n${net >= 0 ? '📈' : '📉'} **Net :** ${net >= 0 ? '+' : ''}${net} 💎`
        : `😔 **Aucun gain...**\n📉 **Coût :** -${SCRATCH_COST} 💎`) +
      `\n\n💎 **Solde :** ${getBalance(userId)} 💎`
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
      .setLabel('✖️ Fermer')
      .setStyle(ButtonStyle.Secondary),
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
    .setFooter({ text: 'Le jeu se déroule en privé — seul toi vois tes cases !' })
    .setTimestamp();

  await channel.send({
    embeds: [embed],
    components: [
      new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('casino_start_scratch')
          .setLabel('🎴 Jouer au ticket à gratter')
          .setStyle(ButtonStyle.Success)
      ),
      buildEconomyRow(),
    ],
  });
}

// ── Handler : clic sur "Jouer" ─────────────────────────────────────────────────

async function handleCasinoStartScratch(interaction) {
  const user = interaction.user;

  if (!hasFunds(user.id, SCRATCH_COST)) {
    return interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setTitle('❌ Solde insuffisant')
          .setDescription(
            `Il te faut **${SCRATCH_COST} 💎** pour jouer.\n` +
            `💎 Ton solde : **${getBalance(user.id)} 💎**\n\n` +
            `> Clique sur **🎁 Daily gratuit** pour récupérer des diamants gratuits !`
          )
          .setColor(0xe74c3c),
      ],
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
      `✨ Gratte les **3 cases** dans l'ordre que tu veux !\n\n` +
      `> 💸 Coût payé : **${SCRATCH_COST} 💎**\n` +
      `> 💰 Solde : **${getBalance(user.id)} 💎**`
    )
    .setFooter({ text: 'Seul toi vois ce message — Clique case par case !' });

  // fetchReply: true pour récupérer l'ID du message éphémère
  const reply = await interaction.reply({
    embeds     : [embed],
    components : [buildScratchButtons([false, false, false])],
    ephemeral  : true,
    fetchReply : true,
  });

  scratchState.set(reply.id, { cells, revealed: [false, false, false], userId: user.id });
}

// ── Handler : grattage case par case ──────────────────────────────────────────

async function handleScratchCell(interaction, cellIndex) {
  const state = scratchState.get(interaction.message.id);

  if (!state) return interaction.reply({ content: '❌ Partie introuvable. Relance le jeu.', ephemeral: true });
  if (state.userId !== interaction.user.id) return interaction.reply({ content: '❌ Ce n\'est pas ton ticket !', ephemeral: true });
  if (state.revealed[cellIndex]) return interaction.reply({ content: '❌ Case déjà révélée !', ephemeral: true });

  state.revealed[cellIndex] = true;

  if (state.revealed.every(Boolean)) {
    // ── Toutes les cases révélées → résultat final ──
    const result = calculateResult(state.cells);
    if (result.won) addDiamonds(interaction.user.id, result.gain);
    scratchState.delete(interaction.message.id);

    await interaction.update({
      embeds    : [buildResultEmbed(interaction.user.id, state.cells, result)],
      components: [buildEndButtons(hasFunds(interaction.user.id, SCRATCH_COST))],
    });

    // Poster le résultat dans le salon gains/pertes (public, séparé)
    await postResultToGainsChannel(interaction.guild, interaction.user, state.cells, result);
  } else {
    // ── Révélation partielle → animation ──
    await interaction.update({
      embeds    : [buildRevealEmbed(state.cells, state.revealed)],
      components: [buildScratchButtons(state.revealed)],
    });
  }
}

// ── Handler : Rejouer ──────────────────────────────────────────────────────────

async function handleScratchReplay(interaction) {
  const user = interaction.user;

  if (!hasFunds(user.id, SCRATCH_COST)) {
    return interaction.update({
      embeds: [
        new EmbedBuilder()
          .setTitle('❌ Solde insuffisant')
          .setDescription(
            `Il te faut **${SCRATCH_COST} 💎** pour rejouer.\n` +
            `💎 Solde actuel : **${getBalance(user.id)} 💎**\n\n` +
            `> Ferme ce message et clique sur **🎁 Daily gratuit** sur le panneau !`
          )
          .setColor(0xe74c3c),
      ],
      components: [
        new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('scratch_close')
            .setLabel('✖️ Fermer')
            .setStyle(ButtonStyle.Secondary),
        ),
      ],
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
    .setFooter({ text: 'Seul toi vois ce message — Clique case par case !' });

  await interaction.update({
    embeds    : [embed],
    components: [buildScratchButtons([false, false, false])],
  });

  // Réutiliser le même messageId pour le nouvel état
  scratchState.set(interaction.message.id, { cells, revealed: [false, false, false], userId: user.id });
}

// ── Handler : Fermer ───────────────────────────────────────────────────────────

async function handleScratchClose(interaction) {
  // Nettoyer l'état si présent
  scratchState.delete(interaction.message.id);

  await interaction.update({
    embeds: [
      new EmbedBuilder()
        .setTitle('🎴 Partie fermée')
        .setDescription(`À bientôt ! 👋\n💎 Solde : **${getBalance(interaction.user.id)} 💎**`)
        .setColor(0x636e72),
    ],
    components: [],
  });
}

// ── Résultats dans le salon public séparé ─────────────────────────────────────

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
};
