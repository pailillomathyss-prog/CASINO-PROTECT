const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
} = require('discord.js');
const { postCasinoEmbed } = require('../systems/scratchcard');
const { buildGachaEmbed, buildGachaComponents, buildEconomyRow } = require('../systems/gacha');
const { SCRATCH_COST, GACHA_COST } = require('../systems/economy');

module.exports = {
  name: 'casino',
  description: 'Placer les panneaux du casino dans les salons',
  usage: '!casino menu [#salon] | !casino scratch [#salon] | !casino gacha [#salon] | !casino gains [#salon]',

  data: new SlashCommandBuilder()
    .setName('casino')
    .setDescription('Placer les panneaux du casino dans un salon')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
    .addSubcommand(sub => sub
      .setName('menu')
      .setDescription('Poster le menu principal du casino (tous les jeux + solde + daily)')
      .addChannelOption(o => o.setName('salon').setDescription('Salon cible').addChannelTypes(ChannelType.GuildText).setRequired(false))
    )
    .addSubcommand(sub => sub
      .setName('scratch')
      .setDescription('Poster le panneau ticket à gratter')
      .addChannelOption(o => o.setName('salon').setDescription('Salon cible').addChannelTypes(ChannelType.GuildText).setRequired(false))
    )
    .addSubcommand(sub => sub
      .setName('gacha')
      .setDescription('Poster le panneau gacha')
      .addChannelOption(o => o.setName('salon').setDescription('Salon cible').addChannelTypes(ChannelType.GuildText).setRequired(false))
    )
    .addSubcommand(sub => sub
      .setName('gains')
      .setDescription('Poster l\'embed dans le salon gains/pertes')
      .addChannelOption(o => o.setName('salon').setDescription('Salon cible').addChannelTypes(ChannelType.GuildText).setRequired(false))
    ),

  async run(message, args) {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
      return message.reply('❌ Tu n\'as pas la permission.');
    }
    const sub    = args[0]?.toLowerCase();
    const target = message.mentions.channels.first() || message.channel;

    if (!sub || sub === 'menu') {
      await postMenuEmbed(target);
    } else if (sub === 'scratch') {
      await postCasinoEmbed(target);
    } else if (sub === 'gacha') {
      await target.send({ embeds: [buildGachaEmbed(message.guild.id, message.guild)], components: buildGachaComponents() });
    } else if (sub === 'gains') {
      await postGainsEmbed(target);
    } else {
      return message.reply('❌ Usage : `!casino menu | scratch | gacha | gains [#salon]`');
    }

    await message.reply({ content: `✅ Posté dans ${target} !`, allowedMentions: { parse: [] } });
    await message.delete().catch(() => {});
  },

  async execute(interaction) {
    const sub    = interaction.options.getSubcommand();
    const target = interaction.options.getChannel('salon') || interaction.channel;
    await interaction.deferReply({ ephemeral: true });

    if (sub === 'menu') {
      await postMenuEmbed(target);
    } else if (sub === 'scratch') {
      await postCasinoEmbed(target);
    } else if (sub === 'gacha') {
      await target.send({ embeds: [buildGachaEmbed(interaction.guild.id, interaction.guild)], components: buildGachaComponents() });
    } else if (sub === 'gains') {
      await postGainsEmbed(target);
    }

    await interaction.editReply(`✅ Panneau posté dans ${target} !`);
  },
};

// ── Menu principal (tous les jeux réunis) ─────────────────────────────────────

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
        new ButtonBuilder()
          .setCustomId('casino_start_scratch')
          .setLabel('🎴 Ticket à gratter')
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId('gacha_pull')
          .setLabel('🎲 Gacha')
          .setStyle(ButtonStyle.Primary),
      ),
      buildEconomyRow(),
    ],
  });
}

// ── Embed salon gains/pertes ───────────────────────────────────────────────────

async function postGainsEmbed(channel) {
  const embed = new EmbedBuilder()
    .setTitle('📊 Gains & Pertes — Casino')
    .setDescription(
      `**Tous les résultats du casino s'affichent ici !**\n\n` +
      `🎴 Ticket à gratter — ${SCRATCH_COST} 💎\n` +
      `🎲 Gacha — ${GACHA_COST} 💎\n` +
      `🎁 Daily — Gratuit (50–200 💎)\n\n` +
      `─────────────────────────\n` +
      `*Les résultats des parties s'affichent ci-dessous automatiquement.*`
    )
    .setColor(0x2ecc71)
    .setFooter({ text: 'Bonne chance à tous ! 🍀' })
    .setTimestamp();

  await channel.send({ embeds: [embed] });
}
