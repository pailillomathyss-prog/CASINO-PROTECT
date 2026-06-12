const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { sendLog } = require('../systems/logs');

const DURATIONS = {
  '1m': 60 * 1000,
  '5m': 5 * 60 * 1000,
  '10m': 10 * 60 * 1000,
  '30m': 30 * 60 * 1000,
  '1h': 60 * 60 * 1000,
  '12h': 12 * 60 * 60 * 1000,
  '24h': 24 * 60 * 60 * 1000,
  '7j': 7 * 24 * 60 * 60 * 1000,
};

module.exports = {
  name: 'mute',
  description: 'Réduire au silence un membre',
  usage: '!mute @membre <1m|5m|10m|30m|1h|12h|24h|7j> [raison]',
  permissions: [PermissionFlagsBits.ModerateMembers],

  async run(message, args) {
    const target = message.mentions.members.first();
    const dureeKey = args[1]?.toLowerCase();
    const reason = args.slice(2).join(' ') || 'Aucune raison fournie';
    const durationMs = DURATIONS[dureeKey];

    if (!target) return message.reply('❌ Mentionne un membre. Ex: `!mute @membre 10m spam`');
    if (!durationMs) return message.reply(`❌ Durée invalide. Utilise : \`${Object.keys(DURATIONS).join('`, `')}\``);
    if (target.id === message.author.id) return message.reply('❌ Tu ne peux pas te muter toi-même.');
    if (!target.moderatable) return message.reply('❌ Je ne peux pas muter ce membre.');

    try {
      await target.timeout(durationMs, `${message.author.tag} : ${reason}`);

      const embed = new EmbedBuilder()
        .setTitle('🔇 Membre mute')
        .setColor(0xFF8800)
        .addFields(
          { name: '👤 Membre', value: `${target.user.tag}`, inline: true },
          { name: '🛡️ Modérateur', value: `${message.author.tag}`, inline: true },
          { name: '⏱️ Durée', value: dureeKey, inline: true },
          { name: '📝 Raison', value: reason }
        )
        .setTimestamp();

      await message.reply({ embeds: [embed] });

      await sendLog(message.guild, 'MUTE', {
        target: target.user,
        moderator: message.author,
        duration: dureeKey,
        reason,
      });
    } catch (err) {
      message.reply(`❌ Erreur : ${err.message}`);
    }
  },
};
