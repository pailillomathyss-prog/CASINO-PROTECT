const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { sendLog } = require('../systems/logs');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('lock')
    .setDescription('Verrouiller le salon actuel')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
    .addStringOption(opt =>
      opt.setName('raison').setDescription('Raison du verrouillage').setRequired(false)
    ),

  async execute(interaction) {
    const reason = interaction.options.getString('raison') || 'Aucune raison fournie';
    const channel = interaction.channel;

    try {
      await channel.permissionOverwrites.edit(interaction.guild.id, {
        SendMessages: false,
      });

      const embed = new EmbedBuilder()
        .setTitle('🔒 Salon verrouillé')
        .setDescription(`Ce salon a été verrouillé par ${interaction.user}.`)
        .setColor(0xFF4444)
        .addFields({ name: '📝 Raison', value: reason })
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });

      await sendLog(interaction.guild, 'LOCK', {
        channel,
        moderator: interaction.user,
        reason,
      });
    } catch (err) {
      await interaction.reply({ content: `❌ Erreur : ${err.message}`, ephemeral: true });
    }
  },
};
