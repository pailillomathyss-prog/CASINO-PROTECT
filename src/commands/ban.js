const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { sendLog } = require('../systems/logs');

module.exports = {
  name: 'ban',
  description: 'Bannir un membre du serveur',
  usage: '!ban @membre [raison]',
  permissions: [PermissionFlagsBits.BanMembers],

  async run(message, args) {
    const target = message.mentions.members.first();
    const reason = args.slice(1).join(' ') || 'Aucune raison fournie';

    if (!target) return message.reply('❌ Mentionne un membre à bannir. Ex: `!ban @membre raison`');
    if (target.id === message.author.id) return message.reply('❌ Tu ne peux pas te bannir toi-même.');
    if (!target.bannable) return message.reply('❌ Je ne peux pas bannir ce membre (rôle supérieur au mien).');

    try {
      await target.ban({ reason: `${message.author.tag} : ${reason}` });

      const embed = new EmbedBuilder()
        .setTitle('🔨 Membre banni')
        .setColor(0xFF0000)
        .addFields(
          { name: '👤 Membre', value: `${target.user.tag}`, inline: true },
          { name: '🛡️ Modérateur', value: `${message.author.tag}`, inline: true },
          { name: '📝 Raison', value: reason }
        )
        .setTimestamp();

      await message.reply({ embeds: [embed] });

      await sendLog(message.guild, 'BAN', {
        target: target.user,
        moderator: message.author,
        reason,
      });
    } catch (err) {
      message.reply(`❌ Erreur : ${err.message}`);
    }
  },
};
