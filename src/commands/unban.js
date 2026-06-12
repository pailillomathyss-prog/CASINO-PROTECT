const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { sendLog } = require('../systems/logs');

module.exports = {
  name: 'unban',
  description: 'Débannir un utilisateur par son ID',
  usage: '!unban <ID> [raison]',
  permissions: [PermissionFlagsBits.BanMembers],

  async run(message, args) {
    const userId = args[0];
    const reason = args.slice(1).join(' ') || 'Aucune raison fournie';

    if (!userId) return message.reply('❌ Fournis l\'ID de l\'utilisateur. Ex: `!unban 123456789 raison`');

    try {
      const ban = await message.guild.bans.fetch(userId).catch(() => null);
      if (!ban) return message.reply('❌ Cet utilisateur n\'est pas banni.');

      await message.guild.members.unban(userId, `${message.author.tag} : ${reason}`);

      const embed = new EmbedBuilder()
        .setTitle('✅ Membre débanni')
        .setColor(0x00FF00)
        .addFields(
          { name: '👤 Utilisateur', value: `${ban.user.tag} (${userId})`, inline: true },
          { name: '🛡️ Modérateur', value: `${message.author.tag}`, inline: true },
          { name: '📝 Raison', value: reason }
        )
        .setTimestamp();

      await message.reply({ embeds: [embed] });

      await sendLog(message.guild, 'UNBAN', {
        target: ban.user.tag,
        targetId: userId,
        moderator: message.author,
        reason,
      });
    } catch (err) {
      message.reply(`❌ Erreur : ${err.message}`);
    }
  },
};
