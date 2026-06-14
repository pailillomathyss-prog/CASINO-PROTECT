const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
  ChannelType,
} = require('discord.js');
const { postReglementEmbed }         = require('../systems/reglement');
const { postTicketEmbed }            = require('../systems/ticket');
const { setupChannelPermissions }    = require('../systems/roleManager');
const { postCasinoEmbed }            = require('../systems/scratchcard');
const { buildGachaEmbed, buildGachaComponents, buildEconomyRow } = require('../systems/gacha');
const { set }                        = require('../systems/guildConfig');
const {
  ActionRowBuilder, ButtonBuilder, ButtonStyle,
} = require('discord.js');
const { SCRATCH_COST, GACHA_COST }   = require('../systems/economy');

module.exports = {
  name: 'setupall',
  description: 'Configurer le bot entier en une seule commande (Admin)',
  usage: '!setupall [#reglement] [#ticket] [#casino] [#gains]',

  data: new SlashCommandBuilder()
    .setName('setupall')
    .setDescription('Configurer le bot entier en une seule commande (Admin)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addChannelOption(o => o.setName('reglement').setDescription('Salon pour le règlement').addChannelTypes(ChannelType.GuildText).setRequired(false))
    .addChannelOption(o => o.setName('ticket').setDescription('Salon pour les tickets').addChannelTypes(ChannelType.GuildText).setRequired(false))
    .addChannelOption(o => o.setName('casino').setDescription('Salon pour les jeux casino').addChannelTypes(ChannelType.GuildText).setRequired(false))
    .addChannelOption(o => o.setName('gains').setDescription('Salon pour les gains/pertes').addChannelTypes(ChannelType.GuildText).setRequired(false)),

  async run(message, args) {
    if (!message.member.permissions.has(PermissionFlagsBits.Administrator))
      return message.reply('❌ Commande réservée aux administrateurs.');

    const mentions = [...message.mentions.channels.values()];
    const reglementCh = mentions[0] || message.channel;
    const ticketCh    = mentions[1] || message.channel;
    const casinoCh    = mentions[2] || message.channel;
    const gainsCh     = mentions[3] || message.channel;

    const processing = await message.reply('⏳ Configuration en cours...');
    try {
      const result = await runSetupAll(message.guild, reglementCh, ticketCh, casinoCh, gainsCh);
      await processing.edit({ content: '', embeds: [result] });
    } catch (err) {
      await processing.edit(`❌ Erreur : ${err.message}`);
    }
    await message.delete().catch(() => {});
  },

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const ch = (name) => interaction.options.getChannel(name) || interaction.channel;
    const reglementCh = ch('reglement');
    const ticketCh    = ch('ticket');
    const casinoCh    = ch('casino');
    const gainsCh     = ch('gains');

    try {
      const result = await runSetupAll(interaction.guild, reglementCh, ticketCh, casinoCh, gainsCh);
      await interaction.editReply({ embeds: [result] });
    } catch (err) {
      await interaction.editReply(`❌ Erreur : ${err.message}`);
    }
  },
};

// ── Logique principale ─────────────────────────────────────────────────────────

async function runSetupAll(guild, reglementCh, ticketCh, casinoCh, gainsCh) {
  const steps = [];

  // 1. Règlement
  try {
    await postReglementEmbed(reglementCh);
    steps.push(`✅ Règlement → ${reglementCh}`);
  } catch (e) { steps.push(`❌ Règlement : ${e.message}`); }

  // 2. Ticket
  try {
    await postTicketEmbed(ticketCh);
    steps.push(`✅ Tickets → ${ticketCh}`);
  } catch (e) { steps.push(`❌ Tickets : ${e.message}`); }

  // 3. Casino (menu complet)
  try {
    await postMenuEmbed(casinoCh);
    steps.push(`✅ Panneau Casino → ${casinoCh}`);
  } catch (e) { steps.push(`❌ Casino : ${e.message}`); }

  // 4. Enregistrer + poster le salon gains/pertes
  try {
    set(guild.id, 'gainsChannelId', gainsCh.id);
    await postGainsHeader(gainsCh);
    steps.push(`✅ Gains/pertes → ${gainsCh}`);
  } catch (e) { steps.push(`❌ Gains/pertes : ${e.message}`); }

  // 5. Permissions (rôles)
  try {
    const { success, errors } = await setupChannelPermissions(guild);
    steps.push(`✅ Permissions : ${success} salons configurés${errors > 0 ? ` (${errors} erreurs)` : ''}`);
  } catch (e) { steps.push(`❌ Permissions : ${e.message}`); }

  return new EmbedBuilder()
    .setTitle('🚀 Setup complet !')
    .setColor(0x57F287)
    .setDescription(steps.join('\n'))
    .addFields({
      name: '⚠️ Étape manuelle',
      value: 'Vérifie que le rôle du bot est **au-dessus** des rôles `✅ Vérifié` et `🎫 Support` dans **Paramètres → Rôles**.',
    })
    .setTimestamp();
}

// ── Menu casino complet ────────────────────────────────────────────────────────

async function postMenuEmbed(channel) {
  const embed = new EmbedBuilder()
    .setTitle('🎰 CASINO')
    .setDescription(
      `Bienvenue ! Choisis ton activité :\n\n` +
      `🎴 **Ticket à gratter** — ${SCRATCH_COST} 💎\n` +
      `> Gratte 3 cases pour tenter de gagner jusqu'à **500 💎**\n\n` +
      `🎲 **Gacha** — ${GACHA_COST} 💎\n` +
      `> Tire un rôle exclusif au hasard\n\n` +
      `💎 **Mon solde** — Gratuit\n` +
      `> Consulte tes diamants en temps réel\n\n` +
      `🎁 **Daily gratuit** — 1x par jour\n` +
      `> Récupère entre **50 et 200 💎** gratuitement`
    )
    .setColor(0xf1c40f)
    .setFooter({ text: 'Clique sur un bouton pour jouer — aucune commande nécessaire !' })
    .setTimestamp();

  await channel.send({
    embeds    : [embed],
    components: [
      new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('casino_start_scratch').setLabel('🎴 Ticket à gratter').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId('gacha_pull').setLabel('🎲 Gacha').setStyle(ButtonStyle.Primary),
      ),
      buildEconomyRow(),
    ],
  });
}

// ── En-tête salon gains/pertes ─────────────────────────────────────────────────

async function postGainsHeader(channel) {
  await channel.send({
    embeds: [
      new EmbedBuilder()
        .setTitle('📊 Gains & Pertes — Casino')
        .setDescription(
          `**Tous les résultats des parties s'affichent ici !**\n\n` +
          `🎴 Ticket à gratter — ${SCRATCH_COST} 💎\n` +
          `🎲 Gacha — ${GACHA_COST} 💎\n` +
          `🎁 Daily — Gratuit (50–200 💎/jour)\n\n` +
          `─────────────────────────\n` +
          `*Les résultats des parties apparaissent ci-dessous automatiquement.*`
        )
        .setColor(0x2ecc71)
        .setFooter({ text: 'Bonne chance à tous ! 🍀' })
        .setTimestamp(),
    ],
  });
}
