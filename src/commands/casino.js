const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
  ChannelType,
} = require('discord.js');
const { postCasinoEmbed } = require('../systems/scratchcard');
const { buildGachaEmbed, buildGachaButton } = require('../systems/gacha');
const { SCRATCH_COST, GACHA_COST } = require('../systems/economy');

module.exports = {
  name: 'casino',
  description: 'Placer les panneaux du casino dans le salon de ton choix',
  usage: '!casino scratch [#salon] | !casino gacha [#salon] | !casino gains [#salon]',

  data: new SlashCommandBuilder()
    .setName('casino')
    .setDescription('Placer les panneaux du casino dans un salon')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
    .addSubcommand(sub => sub
      .setName('scratch')
      .setDescription('Poster le panneau ticket à gratter')
      .addChannelOption(o => o
        .setName('salon')
        .setDescription('Salon cible (défaut : salon actuel)')
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(false)
      )
    )
    .addSubcommand(sub => sub
      .setName('gacha')
      .setDescription('Poster le panneau gacha')
      .addChannelOption(o => o
        .setName('salon')
        .setDescription('Salon cible (défaut : salon actuel)')
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(false)
      )
    )
    .addSubcommand(sub => sub
      .setName('gains')
      .setDescription('Poster l\'embed dans le salon gains/pertes')
      .addChannelOption(o => o
        .setName('salon')
        .setDescription('Salon cible (défaut : salon actuel)')
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(false)
      )
    ),

  // Préfixe : !casino scratch | !casino scratch #salon
  async run(message, args) {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
      return message.reply('❌ Tu n\'as pas la permission d\'utiliser cette commande.');
    }

    const sub     = args[0]?.toLowerCase();
    // Salon mentionné ou salon actuel
    const target  = message.mentions.channels.first() || message.channel;

    if (!sub || sub === 'scratch') {
      await postCasinoEmbed(target);
      await message.reply({ content: `✅ Panneau grattage posté dans ${target} !`, allowedMentions: { parse: [] } });
      await message.delete().catch(() => {});

    } else if (sub === 'gacha') {
      const embed = buildGachaEmbed(message.guild.id, message.guild);
      const row   = buildGachaButton();
      await target.send({ embeds: [embed], components: [row] });
      await message.reply({ content: `✅ Panneau gacha posté dans ${target} !`, allowedMentions: { parse: [] } });
      await message.delete().catch(() => {});

    } else if (sub === 'gains') {
      await postGainsEmbed(target);
      await message.reply({ content: `✅ Embed gains/pertes posté dans ${target} !`, allowedMentions: { parse: [] } });
      await message.delete().catch(() => {});

    } else {
      message.reply(
        '❌ Sous-commande inconnue.\n' +
        '> `!casino scratch [#salon]`\n' +
        '> `!casino gacha [#salon]`\n' +
        '> `!casino gains [#salon]`'
      );
    }
  },

  // Slash : /casino scratch salon:#casino
  async execute(interaction) {
    const sub    = interaction.options.getSubcommand();
    const target = interaction.options.getChannel('salon') || interaction.channel;

    await interaction.deferReply({ ephemeral: true });

    if (sub === 'scratch') {
      await postCasinoEmbed(target);
      await interaction.editReply(`✅ Panneau grattage posté dans ${target} !`);

    } else if (sub === 'gacha') {
      const embed = buildGachaEmbed(interaction.guild.id, interaction.guild);
      const row   = buildGachaButton();
      await target.send({ embeds: [embed], components: [row] });
      await interaction.editReply(`✅ Panneau gacha posté dans ${target} !`);

    } else if (sub === 'gains') {
      await postGainsEmbed(target);
      await interaction.editReply(`✅ Embed gains/pertes posté dans ${target} !`);
    }
  },
};

async function postGainsEmbed(channel) {
  const embed = new EmbedBuilder()
    .setTitle('📊 Gains & Pertes — Casino')
    .setDescription(
      `**Tous les résultats du casino s'affichent ici automatiquement !**\n\n` +
      `🎴 **Ticket à gratter** — ${SCRATCH_COST} 💎\n` +
      `> Clique sur le bouton dans le salon grattage\n\n` +
      `🎲 **Gacha** — ${GACHA_COST} 💎\n` +
      `> Clique sur le bouton dans le salon gacha\n\n` +
      `💎 **Daily** — Gratuit\n` +
      `> \`!daily\` — 50 à 200 💎 gratuits chaque jour\n\n` +
      `─────────────────────────\n` +
      `*Les résultats des parties s'affichent ci-dessous.*`
    )
    .setColor(0x2ecc71)
    .setFooter({ text: 'Bonne chance à tous ! 🍀' })
    .setTimestamp();

  await channel.send({ embeds: [embed] });
}
