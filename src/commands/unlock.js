const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { sendLog } = require('../systems/logs');

module.exports = {
  name: 'unlock',
  description: 'Déverrouiller le salon actuel',
  usage: '!unlock',
  permissions: [PermissionFlagsBits.ManageChannels],

  async run(message) {
    const channel = message.channel;

    try {
      await channel.permissionOverwrites.edit(message.guild.id, { SendMessages: null });

      const embed = new EmbedBuilder()
        .setTitle('🔓 Salon déverrouillé')
        .setDescription(`Ce salon a été déverrouillé par ${message.author}.`)
        .setColor(0x44FF44)
        .setTimestamp();

      await message.reply({ embeds: [embed] });

      await sendLog(message.guild, 'UNLOCK', {
        channel,
        moderator: message.author,
      });
    } catch (err) {
      message.reply(`❌ Erreur : ${err.message}`);
    }
  },
};
