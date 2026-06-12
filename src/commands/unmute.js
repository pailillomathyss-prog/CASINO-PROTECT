const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { sendLog } = require('../systems/logs');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('unmute')
    .setDescription('Retirer le mute d\'un membre')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption(opt =>
      opt.setName('membre').setDescription('Le membre à démuter').setRequired(true)
    )
    .addStringOption(opt =>
      opt.setName('raison').setDescription('Raison du démute').setRequired(false)
    ),

  async execute(interaction) {
    const target = interaction.options.getMember('membre');
    const reason = interaction.options.getString('raison') || 'Aucune raison fournie';

    if (!target) {
      return interaction.reply({ content: '❌ Membre introuvable.', ephemeral: true });
    }
    if (!target.isCommunicationDisabled()) {
      return interaction.reply({ content: '❌ Ce membre n\'est pas mute.', ephemeral: true });
    }
    if (!target.moderatable) {
      return interaction.reply({ content: '❌ Je ne peux pas démuter ce membre.', ephemeral: true });
    }

    try {
      await target.timeout(null, `${interaction.user.tag} : ${reason}`);

      const embed = new EmbedBuilder()
        .setTitle('🔊 Membre démuté')
        .setColor(0x00FFAA)
        .addFields(
          { name: '👤 Membre', value: `${target.user.tag}`, inline: true },
          { name: '🛡️ Modérateur', value: `${interaction.user.tag}`, inline: true },
          { name: '📝 Raison', value: reason }
        )
        .setTimestamp();

      await interaction.reply({ embeds: [embed], ephemeral: true });

      await sendLog(interaction.guild, 'UNMUTE', {
        target: target.user,
        moderator: interaction.user,
        reason,
      });
    } catch (err) {
      await interaction.reply({ content: `❌ Erreur : ${err.message}`, ephemeral: true });
    }
  },
};
