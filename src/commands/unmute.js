const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { sendLog } = require('../systems/logs');

module.exports = {
  name: 'unmute',
  description: 'Retirer le mute d\'un membre',
  usage: '!unmute @membre [raison]',
  permissions: [PermissionFlagsBits.ModerateMembers],

  async run(message, args) {
    const target = message.mentions.members.first();
    const reason = args.slice(1).join(' ') || 'Aucune raison fournie';

    if (!target) return message.reply('❌ Mentionne un membre. Ex: `!unmute @membre`');
    if (!target.isCommunicationDisabled()) return message.reply('❌ Ce membre n\'est pas mute.');
    if (!target.moderatable) return message.reply('❌ Je ne peux pas démuter ce membre.');

    try {
      await target.timeout(null, `${message.author.tag} : ${reason}`);

      const embed = new EmbedBuilder()
        .setTitle('🔊 Membre démuté')
        .setColor(0x00FFAA)
        .addFields(
          { name: '👤 Membre', value: `${target.user.tag}`, inline: true },
          { name: '🛡️ Modérateur', value: `${message.author.tag}`, inline: true },
          { name: '📝 Raison', value: reason }
        )
        .setTimestamp();

      await message.reply({ embeds: [embed] });

      await sendLog(message.guild, 'UNMUTE', {
        target: target.user,
        moderator: message.author,
        reason,
      });
    } catch (err) {
      message.reply(`❌ Erreur : ${err.message}`);
    }
  },
};
