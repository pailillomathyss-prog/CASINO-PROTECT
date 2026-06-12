const { EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'help',
  description: 'Afficher toutes les commandes disponibles',
  usage: '!help',
  permissions: [],

  async run(message) {
    const embed = new EmbedBuilder()
      .setTitle('📋 Commandes du Bot')
      .setColor(0x5865F2)
      .setDescription('Préfixe : `!`')
      .addFields(
        {
          name: '🔨 Modération',
          value: [
            '`!ban @membre [raison]` — Bannir un membre',
            '`!unban <ID> [raison]` — Débannir par ID',
            '`!mute @membre <durée> [raison]` — Muter (1m 5m 10m 30m 1h 12h 24h 7j)',
            '`!unmute @membre [raison]` — Démuter',
            '`!lock [raison]` — Verrouiller le salon',
            '`!unlock` — Déverrouiller le salon',
          ].join('\n'),
        },
        {
          name: '⚙️ Configuration (Admin)',
          value: [
            '`!setup reglement` — Poster l\'embed règlement',
            '`!setup ticket` — Poster l\'embed tickets',
          ].join('\n'),
        },
        {
          name: '🤖 Protection automatique',
          value: [
            '🔗 **Anti-link** — Supprime Discord, YouTube, TikTok, etc.',
            '🚫 **Anti-spam** — Timeout si +5 messages en 4 secondes',
            '⚠️ **Anti-raid** — Vérification renforcée si +8 joins en 10s',
          ].join('\n'),
        }
      )
      .setFooter({ text: `Demandé par ${message.author.tag}` })
      .setTimestamp();

    await message.reply({ embeds: [embed] });
  },
};
