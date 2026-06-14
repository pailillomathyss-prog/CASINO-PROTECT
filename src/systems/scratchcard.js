const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  PermissionFlagsBits,
} = require('discord.js');
const { getBalance, deductDiamonds, addDiamonds, hasFunds, SCRATCH_COST } = require('./economy');

// Salons actifs par user
const scratchChannels = new Map(); // userId -> channelId
// État du grattage en cours
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
  for (let i = 0; i < SYMBOLS.length; i++) {
    rand -= WEIGHTS[i];
    if (rand <= 0) return SYMBOLS[i];
  }
  return '❌';
}

function calculateResult(cells) {
  const key = cells.join('');
  if (PAYOUTS[key]) return { ...PAYOUTS[key], won: true };

  const counts = {};
  cells.forEach(c => counts[c] = (counts[c] || 0) + 1);
  const maxCount = Math.max(...Object.values(counts));
  if (maxCount >= 2) return { label: '✨ PAIRE', gain: 25, color: 0x1abc9c, won: true };

  return { label: '😔 PERDU', gain: 0, color: 0x636e72, won: false };
}

// ── Embeds ─────────────────────────────────────────────────────────────────────

const HIDDEN = '⬛';

function displayCells(cells, revealed) {
  return cells.map((sym, i) => revealed[i] ? sym : HIDDEN).join('  ╱  ');
}

function buildWaitEmbed(user) {
  const balance = getBalance(user.id);
  return new EmbedBuilder()
    .setTitle('🎴 TICKET À GRATTER')
    .setColor(0x5865F2)
    .setDescription(
      `**${HIDDEN}  ╱  ${HIDDEN}  ╱  ${HIDDEN}**\n\n` +
      `✨ Gratte les **3 cases** pour révéler ton lot !\n\n` +
      `> 💎 Coût : **${SCRATCH_COST} diamants**\n` +
      `> 💰 Solde : **${balance} 💎**`
    )
    .setFooter({ text: 'Clique sur les boutons ci-dessous dans l\'ordre que tu veux !' });
}

function buildRevealEmbed(user, cells, revealed) {
  const revealedCount = revealed.filter(Boolean).length;
  const display = displayCells(cells, revealed);

  // Suspense : si 2 cases révélées identiques, mettre le feu
  const revealedSymbols = cells.filter((_, i) => revealed[i]);
  const hasPotentialJackpot = revealedSymbols.length === 2 &&
    revealedSymbols[0] === revealedSymbols[1];

  let desc = `**${display}**\n\n`;

  if (revealedCount === 1) {
    desc += `🔎 Encore **2 cases** à gratter...`;
  } else if (revealedCount === 2) {
    if (hasPotentialJackpot) {
      desc += `🔥 **JACKPOT POTENTIEL !** Gratte la dernière case ! 🔥`;
    } else {
      desc += `😬 Plus qu'**1 case**... bonne chance !`;
    }
  }

  return new EmbedBuilder()
    .setTitle('🎴 EN COURS...')
    .setColor(hasPotentialJackpot ? 0xff6b35 : 0x5865F2)
    .setDescription(desc)
    .setFooter({ text: `${revealedCount}/3 cases révélées` });
}

function buildResultEmbed(user, cells, result) {
  const net     = result.gain - SCRATCH_COST;
  const balance = getBalance(user.id);
  const display = cells.join('  ╱  ');

  return new EmbedBuilder()
    .setTitle(`🎴 ${result.label}`)
    .setColor(result.color)
    .setDescription(
      `**${display}**\n\n` +
      (result.won
        ? `🏆 **Gain :** +${result.gain} 💎\n` +
          `${net >= 0 ? '📈' : '📉'} **Net :** ${net >= 0 ? '+' : ''}${net} 💎`
        : `😔 **Aucun gain cette fois...**\n📉 **Coût :** -${SCRATCH_COST} 💎`
      ) +
      `\n\n💎 **Solde :** ${balance} 💎`
    )
    .setFooter({ text: result.won ? '🎊 Félicitations !' : 'Retente ta chance !' })
    .setTimestamp();
}

// ── Boutons ────────────────────────────────────────────────────────────────────

function buildScratchButtons(revealed) {
  const labels = ['1️⃣', '2️⃣', '3️⃣'];
  const buttons = revealed.map((done, i) =>
    new ButtonBuilder()
      .setCustomId(`scratch_cell_${i}`)
      .setLabel(done ? '✅' : `🪙 Gratter ${labels[i]}`)
      .setStyle(done ? ButtonStyle.Secondary : ButtonStyle.Success)
      .setDisabled(done)
  );
  return new ActionRowBuilder().addComponents(...buttons);
}

function buildEndButtons(canReplay) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('scratch_replay')
      .setLabel(`🔄 Rejouer (${SCRATCH_COST}💎)`)
      .setStyle(ButtonStyle.Primary)
      .setDisabled(!canReplay),
    new ButtonBuilder()
      .setCustomId('scratch_close')
      .setLabel('🔒 Fermer le salon')
      .setStyle(ButtonStyle.Danger),
  );
}

// ── Salon privé ────────────────────────────────────────────────────────────────

async function openScratchChannel(guild, user) {
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
    {
      id: user.id,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ReadMessageHistory,
      ],
    },
  ];
  staffRoles.forEach(r => permissionOverwrites.push({
    id: r.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ReadMessageHistory],
  }));

  const channel = await guild.channels.create({
    name : `🎴-grattage-${user.username.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 20)}`,
    type : ChannelType.GuildText,
    topic: `🎴 Ticket à gratter de ${user.tag} | 💎 Solde : ${getBalance(user.id)} 💎`,
    permissionOverwrites,
  });

  scratchChannels.set(user.id, channel.id);
  return { channel, isNew: true };
}

// ── Démarrer une partie ────────────────────────────────────────────────────────

async function sendScratchCard(channel, user) {
  // Déduire le coût AVANT de générer (pour afficher le bon solde)
  deductDiamonds(user.id, SCRATCH_COST);

  const cells  = [pickSymbol(), pickSymbol(), pickSymbol()];
  const embed  = buildWaitEmbed(user);
  const row    = buildScratchButtons([false, false, false]);

  const msg = await channel.send({ embeds: [embed], components: [row] });
  scratchState.set(msg.id, { cells, revealed: [false, false, false], userId: user.id });
  return msg;
}

// ── Handlers boutons ───────────────────────────────────────────────────────────

async function handleScratchCell(interaction, cellIndex) {
  const state = scratchState.get(interaction.message.id);

  if (!state) {
    return interaction.reply({ content: '❌ Partie introuvable. Lance `/gratter` pour rejouer.', ephemeral: true });
  }
  if (state.userId !== interaction.user.id) {
    return interaction.reply({ content: '❌ Ce n\'est pas ton ticket !', ephemeral: true });
  }
  if (state.revealed[cellIndex]) {
    return interaction.reply({ content: '❌ Cette case est déjà révélée !', ephemeral: true });
  }

  state.revealed[cellIndex] = true;
  const allRevealed = state.revealed.every(Boolean);

  if (allRevealed) {
    // ── Toutes les cases révélées → résultat final ──
    const result = calculateResult(state.cells);
    if (result.won) addDiamonds(interaction.user.id, result.gain);

    scratchState.delete(interaction.message.id);

    const embed = buildResultEmbed(interaction.user, state.cells, result);
    const row   = buildEndButtons(hasFunds(interaction.user.id, SCRATCH_COST));

    await interaction.update({ embeds: [embed], components: [row] });

    // Poster le résultat dans le salon gains/pertes (séparé du jeu)
    await postResultToGainsChannel(interaction.guild, interaction.user, state.cells, result);

  } else {
    // ── Révélation partielle → animation ──
    const embed = buildRevealEmbed(interaction.user, state.cells, state.revealed);
    const row   = buildScratchButtons(state.revealed);
    await interaction.update({ embeds: [embed], components: [row] });
  }
}

async function handleScratchReplay(interaction) {
  const user = interaction.user;

  if (!hasFunds(user.id, SCRATCH_COST)) {
    return interaction.reply({
      content: `❌ Solde insuffisant ! Il te faut **${SCRATCH_COST} 💎**.\n` +
               `💎 Ton solde : **${getBalance(user.id)} 💎** | Utilise \`!daily\` pour en récupérer.`,
      ephemeral: true,
    });
  }

  // Déduire et générer nouvelle partie
  deductDiamonds(user.id, SCRATCH_COST);
  const cells  = [pickSymbol(), pickSymbol(), pickSymbol()];
  const embed  = buildWaitEmbed(user);
  const row    = buildScratchButtons([false, false, false]);

  await interaction.update({ embeds: [embed], components: [row] });
  scratchState.set(interaction.message.id, { cells, revealed: [false, false, false], userId: user.id });
}

async function handleScratchClose(interaction) {
  const channelId = interaction.channelId;
  for (const [uid, cid] of scratchChannels.entries()) {
    if (cid === channelId) { scratchChannels.delete(uid); break; }
  }
  await interaction.reply({ content: '🔒 Fermeture dans **3 secondes**...', ephemeral: true });
  setTimeout(() => interaction.channel.delete('Ticket à gratter fermé').catch(() => {}), 3000);
}

// ── Salon de résultats SÉPARÉ du jeu ──────────────────────────────────────────

async function postResultToGainsChannel(guild, user, cells, result) {
  // Chercher le salon gains/pertes (séparé du salon de jeu)
  const gainsChannel = guild.channels.cache.find(c =>
    ['gains', 'pertes', 'gains-pertes', 'casino-log', 'résultats', 'resultats', 'casino-résultats']
      .some(kw => c.name.toLowerCase().replace(/[^a-z0-9]/g, '').includes(kw.replace(/[^a-z0-9]/g, '')))
  );

  if (!gainsChannel) return; // Pas de salon configuré, on ne fait rien

  const net     = result.gain - SCRATCH_COST;
  const balance = getBalance(user.id);

  const embed = new EmbedBuilder()
    .setAuthor({ name: user.tag, iconURL: user.displayAvatarURL() })
    .setTitle(result.won ? `🏆 ${result.label}` : '😔 Ticket perdant')
    .setDescription(
      `> ${cells.join('  ╱  ')}\n\n` +
      (result.won
        ? `**+${result.gain} 💎** remportés !\n📊 Net : ${net >= 0 ? '+' : ''}${net} 💎`
        : `Aucun gain. (−${SCRATCH_COST} 💎)`
      ) +
      `\n\n💎 Solde : **${balance} 💎**`
    )
    .setColor(result.color)
    .setTimestamp();

  await gainsChannel.send({ embeds: [embed] }).catch(() => {});
}

// ── Commande de setup : poster l'embed d'accueil dans un salon ─────────────────

async function postCasinoEmbed(channel) {
  const embed = new EmbedBuilder()
    .setTitle('🎰 CASINO — Ticket à gratter')
    .setDescription(
      `**Tente ta chance avec un ticket à gratter !**\n\n` +
      `🎴 Gratte **3 cases** et match les symboles pour gagner des 💎\n\n` +
      `**Gains possibles :**\n` +
      `> 💎💎💎 Jackpot — **+500 💎**\n` +
      `> 7️⃣7️⃣7️⃣ Gros lot — **+300 💎**\n` +
      `> 🌟🌟🌟 Super — **+150 💎**\n` +
      `> 🎰🎰🎰 Casino — **+100 💎**\n` +
      `> 🍀🍀🍀 Chance — **+75 💎**\n` +
      `> ✨ Paire — **+25 💎**\n\n` +
      `💸 **Coût :** ${SCRATCH_COST} 💎 par ticket\n` +
      `> Utilise \`/gratter\` ou \`!gratter\` pour jouer !`
    )
    .setColor(0xf1c40f)
    .setFooter({ text: 'Utilise !daily chaque jour pour des diamants gratuits !' })
    .setTimestamp();

  await channel.send({ embeds: [embed] });
}

module.exports = {
  openScratchChannel,
  sendScratchCard,
  handleScratchCell,
  handleScratchReplay,
  handleScratchClose,
  postCasinoEmbed,
  scratchChannels,
};
