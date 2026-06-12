const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { sendLog } = require('../systems/logs');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('unlock')
    .setDescription('Déverrouiller le salon actuel')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

  async execute(interaction) {
    const channel = interaction.channel;

    try {
      await channel.permissionOverwrites.edit(interaction.guild.id, {
        SendMessages: null,
      });

      const embed = new EmbedBuilder()
        .setTitle('🔓 Salon déverrouillé')
        .setDescription(`Ce salon a été déverrouillé par ${interaction.user}.`)
        .setColor(0x44FF44)
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });

      await sendLog(interaction.guild, 'UNLOCK', {
        channel,
        moderator: interaction.user,
      });
    } catch (err) {
      await interaction.reply({ content: `❌ Erreur : ${err.message}`, ephemeral: true });
    }
  },
};
