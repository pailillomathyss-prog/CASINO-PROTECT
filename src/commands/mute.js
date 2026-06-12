const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { sendLog } = require('../systems/logs');

const DURATIONS = {
  '60': 60 * 1000,
  '300': 5 * 60 * 1000,
  '600': 10 * 60 * 1000,
  '1800': 30 * 60 * 1000,
  '3600': 60 * 60 * 1000,
  '86400': 24 * 60 * 60 * 1000,
  '604800': 7 * 24 * 60 * 60 * 1000,
};

const DURATION_LABELS = {
  '60': '1 minute',
  '300': '5 minutes',
  '600': '10 minutes',
  '1800': '30 minutes',
  '3600': '1 heure',
  '86400': '24 heures',
  '604800': '7 jours',
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName('mute')
    .setDescription('Réduire au silence un membre')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption(opt =>
      opt.setName('membre').setDescription('Le membre à muter').setRequired(true)
    )
    .addStringOption(opt =>
      opt.setName('duree')
        .setDescription('Durée du mute')
        .setRequired(true)
        .addChoices(
          { name: '1 minute', value: '60' },
          { name: '5 minutes', value: '300' },
          { name: '10 minutes', value: '600' },
          { name: '30 minutes', value: '1800' },
          { name: '1 heure', value: '3600' },
          { name: '24 heures', value: '86400' },
          { name: '7 jours', value: '604800' }
        )
    )
    .addStringOption(opt =>
      opt.setName('raison').setDescription('Raison du mute').setRequired(false)
    ),

  async execute(interaction) {
    const target = interaction.options.getMember('membre');
    const dureeKey = interaction.options.getString('duree');
    const reason = interaction.options.getString('raison') || 'Aucune raison fournie';
    const durationMs = DURATIONS[dureeKey];
    const durationLabel = DURATION_LABELS[dureeKey];

    if (!target) {
      return interaction.reply({ content: '❌ Membre introuvable.', ephemeral: true });
    }
    if (target.id === interaction.user.id) {
      return interaction.reply({ content: '❌ Tu ne peux pas te muter toi-même.', ephemeral: true });
    }
    if (!target.moderatable) {
      return interaction.reply({ content: '❌ Je ne peux pas muter ce membre.', ephemeral: true });
    }

    try {
      await target.timeout(durationMs, `${interaction.user.tag} : ${reason}`);

      const embed = new EmbedBuilder()
        .setTitle('🔇 Membre mute')
        .setColor(0xFF8800)
        .addFields(
          { name: '👤 Membre', value: `${target.user.tag}`, inline: true },
          { name: '🛡️ Modérateur', value: `${interaction.user.tag}`, inline: true },
          { name: '⏱️ Durée', value: durationLabel, inline: true },
          { name: '📝 Raison', value: reason }
        )
        .setTimestamp();

      await interaction.reply({ embeds: [embed], ephemeral: true });

      await sendLog(interaction.guild, 'MUTE', {
        target: target.user,
        moderator: interaction.user,
        duration: durationLabel,
        reason,
      });
    } catch (err) {
      await interaction.reply({ content: `❌ Erreur : ${err.message}`, ephemeral: true });
    }
  },
};
