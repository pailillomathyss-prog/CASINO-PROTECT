const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { postCasinoEmbed } = require('../systems/scratchcard');
const { buildGachaEmbed, buildGachaButton } = require('../systems/gacha');
const { SCRATCH_COST, GACHA_COST } = require('../systems/economy');

module.exports = {
  name: 'casino',
  description: 'Placer les embeds du casino dans les salons',
  usage: '!casino scratch | !casino gacha | !casino gains',

  data: new SlashCommandBuilder()
    .setName('casino')
    .setDescription('Placer les panneaux du casino dans ce salon')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
    .addSubcommand(sub => sub
      .setName('scratch')
      .setDescription('Poster l\'embed du ticket à gratter ici')
    )
    .addSubcommand(sub => sub
      .setName('gacha')
      .setDescription('Poster le panneau gacha ici')
    )
    .addSubcommand(sub => sub
      .setName('gains')
      .setDescription('Poster l\'embed de présentation du salon gains/pertes ici')
    ),

  async run(message, args) {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
      return message.reply('❌ Tu n\'as pas la permission.');
    }

    const sub = args[0]?.toLowerCase();

    if (!sub || sub === 'scratch') {
      await postCasinoEmbed(message.channel);
      await message.delete().catch(() => {});

    } else if (sub === 'gacha') {
      const embed = buildGachaEmbed(message.guild.id, message.guild);
      const row   = buildGachaButton();
      await message.channel.send({ embeds: [embed], components: [row] });
      await message.delete().catch(() => {});

    } else if (sub === 'gains') {
      await postGainsEmbed(message.channel);
      await message.delete().catch(() => {});

    } else {
      message.reply('❌ Usage : `!casino scratch` | `!casino gacha` | `!casino gains`');
    }
  },

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    await interaction.deferReply({ ephemeral: true });

    if (sub === 'scratch') {
      await postCasinoEmbed(interaction.channel);
      await interaction.editReply('✅ Embed ticket à gratter posté !');

    } else if (sub === 'gacha') {
      const embed = buildGachaEmbed(interaction.guild.id, interaction.guild);
      const row   = buildGachaButton();
      await interaction.channel.send({ embeds: [embed], components: [row] });
      await interaction.editReply('✅ Panneau gacha posté !');

    } else if (sub === 'gains') {
      await postGainsEmbed(interaction.channel);
      await interaction.editReply('✅ Embed gains/pertes posté !');
    }
  },
};

async function postGainsEmbed(channel) {
  const embed = new EmbedBuilder()
    .setTitle('📊 Gains & Pertes — Casino')
    .setDescription(
      `**Tous les résultats du casino s\'affichent ici automatiquement !**\n\n` +
      `🎴 **Ticket à gratter** — Coût : ${SCRATCH_COST} 💎\n` +
      `> Ouvre un salon avec \`!gratter\` ou \`/gratter\`\n\n` +
      `🎲 **Gacha** — Coût : ${GACHA_COST} 💎\n` +
      `> Tire un rôle aléatoire dans le salon gacha\n\n` +
      `💎 **Daily** — Gratuit\n` +
      `> Récupère 50–200 💎 par jour avec \`!daily\`\n\n` +
      `─────────────────────────\n` +
      `*Les résultats des parties apparaissent ci-dessous.*`
    )
    .setColor(0x2ecc71)
    .setFooter({ text: 'Bonne chance à tous ! 🍀' })
    .setTimestamp();

  await channel.send({ embeds: [embed] });
}
