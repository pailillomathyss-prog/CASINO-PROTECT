const { ActivityType } = require('discord.js');
const { postReglementEmbed } = require('../systems/reglement');
const { postTicketEmbed } = require('../systems/ticket');
const config = require('../config');

async function setupChannel(client, channelId, label, postFn) {
  if (!channelId) {
    console.log(`[SETUP] ${label} : ID non configuré, ignoré.`);
    return;
  }

  const channel = client.channels.cache.get(channelId);
  if (!channel) {
    console.log(`[SETUP] ${label} : salon introuvable (ID: ${channelId})`);
    return;
  }

  try {
    // Vérifier si le bot a déjà posté un embed dans ce salon
    const messages = await channel.messages.fetch({ limit: 20 });
    const alreadyPosted = messages.some(
      m => m.author.id === client.user.id && m.embeds.length > 0
    );

    if (alreadyPosted) {
      console.log(`[SETUP] ${label} : embed déjà présent, aucun doublon.`);
      return;
    }

    await postFn(channel);
    console.log(`[SETUP] ${label} : embed posté avec succès.`);
  } catch (err) {
    console.error(`[SETUP] ${label} : erreur —`, err.message);
  }
}

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

    // Poster automatiquement les embeds dans les bons salons
    await setupChannel(client, config.REGLEMENT_CHANNEL_ID, '📜 Règlement', postReglementEmbed);
    await setupChannel(client, config.TICKET_CHANNEL_ID, '🎟️ Tickets', postTicketEmbed);
  },
};
