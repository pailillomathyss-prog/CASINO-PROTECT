const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { sendLog } = require('../systems/logs');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('unban')
    .setDescription('Débannir un utilisateur')
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
    .addStringOption(opt =>
      opt.setName('user_id').setDescription('L\'ID de l\'utilisateur à débannir').setRequired(true)
    )
    .addStringOption(opt =>
      opt.setName('raison').setDescription('Raison du déban').setRequired(false)
    ),

  async execute(interaction) {
    const userId = interaction.options.getString('user_id');
    const reason = interaction.options.getString('raison') || 'Aucune raison fournie';

    try {
      const ban = await interaction.guild.bans.fetch(userId).catch(() => null);
      if (!ban) {
        return interaction.reply({ content: '❌ Cet utilisateur n\'est pas banni.', ephemeral: true });
      }

      await interaction.guild.members.unban(userId, `${interaction.user.tag} : ${reason}`);

      const embed = new EmbedBuilder()
        .setTitle('✅ Membre débanni')
        .setColor(0x00FF00)
        .addFields(
          { name: '👤 Utilisateur', value: `${ban.user.tag} (${userId})`, inline: true },
          { name: '🛡️ Modérateur', value: `${interaction.user.tag}`, inline: true },
          { name: '📝 Raison', value: reason }
        )
        .setTimestamp();

      await interaction.reply({ embeds: [embed], ephemeral: true });

      await sendLog(interaction.guild, 'UNBAN', {
        target: ban.user.tag,
        targetId: userId,
        moderator: interaction.user,
        reason,
      });
    } catch (err) {
      await interaction.reply({ content: `❌ Erreur : ${err.message}`, ephemeral: true });
    }
  },
};
