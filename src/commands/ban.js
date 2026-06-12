const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { sendLog } = require('../systems/logs');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ban')
    .setDescription('Bannir un membre du serveur')
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
    .addUserOption(opt =>
      opt.setName('membre').setDescription('Le membre à bannir').setRequired(true)
    )
    .addStringOption(opt =>
      opt.setName('raison').setDescription('Raison du ban').setRequired(false)
    )
    .addIntegerOption(opt =>
      opt.setName('jours').setDescription('Supprimer les messages des X derniers jours (0-7)').setMinValue(0).setMaxValue(7).setRequired(false)
    ),

  async execute(interaction) {
    const target = interaction.options.getMember('membre');
    const reason = interaction.options.getString('raison') || 'Aucune raison fournie';
    const days = interaction.options.getInteger('jours') || 0;

    if (!target) {
      return interaction.reply({ content: '❌ Membre introuvable.', ephemeral: true });
    }
    if (target.id === interaction.user.id) {
      return interaction.reply({ content: '❌ Tu ne peux pas te bannir toi-même.', ephemeral: true });
    }
    if (!target.bannable) {
      return interaction.reply({ content: '❌ Je ne peux pas bannir ce membre (rôle supérieur au mien).', ephemeral: true });
    }

    try {
      await target.ban({ deleteMessageSeconds: days * 86400, reason: `${interaction.user.tag} : ${reason}` });

      const embed = new EmbedBuilder()
        .setTitle('🔨 Membre banni')
        .setColor(0xFF0000)
        .addFields(
          { name: '👤 Membre', value: `${target.user.tag}`, inline: true },
          { name: '🛡️ Modérateur', value: `${interaction.user.tag}`, inline: true },
          { name: '📝 Raison', value: reason }
        )
        .setTimestamp();

      await interaction.reply({ embeds: [embed], ephemeral: true });

      await sendLog(interaction.guild, 'BAN', {
        target: target.user,
        moderator: interaction.user,
        reason,
      });
    } catch (err) {
      await interaction.reply({ content: `❌ Erreur : ${err.message}`, ephemeral: true });
    }
  },
};
