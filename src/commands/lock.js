const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { sendLog } = require('../systems/logs');

module.exports = {
  name: 'lock',
  description: 'Verrouiller le salon actuel',
  usage: '!lock [raison]',
  permissions: [PermissionFlagsBits.ManageChannels],

  async run(message, args) {
    const reason = args.join(' ') || 'Aucune raison fournie';
    const channel = message.channel;

    try {
      await channel.permissionOverwrites.edit(message.guild.id, { SendMessages: false });

      const embed = new EmbedBuilder()
        .setTitle('🔒 Salon verrouillé')
        .setDescription(`Ce salon a été verrouillé par ${message.author}.`)
        .setColor(0xFF4444)
        .addFields({ name: '📝 Raison', value: reason })
        .setTimestamp();

      await message.reply({ embeds: [embed] });

      await sendLog(message.guild, 'LOCK', {
        channel,
        moderator: message.author,
        reason,
      });
    } catch (err) {
      message.reply(`❌ Erreur : ${err.message}`);
    }
  },
};
