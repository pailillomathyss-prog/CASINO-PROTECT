const { ActivityType } = require('discord.js');

module.exports = {
  name: 'ready',
  once: true,
  async execute(client) {
    console.log(`[BOT] Connecté en tant que ${client.user.tag}`);

    client.user.setPresence({
      activities: [{ name: '🛡️ Protection du serveur', type: ActivityType.Watching }],
      status: 'online',
    });

    console.log(`[BOT] ${client.guilds.cache.size} serveur(s) protégé(s)`);
  },
};
