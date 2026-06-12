const { ActivityType } = require('discord.js');
const { postReglementEmbed } = require('../systems/reglement');
const { postTicketEmbed } = require('../systems/ticket');
const config = require('../config');

async function setupChannel(client, channelId, label, postFn) {
  if (!channelId) {
    console.log(`[SETUP] ⚠️  ${label} : CHANNEL ID non défini dans les variables d'environnement.`);
    return;
  }

  // Attendre que le canal soit en cache
  let channel = client.channels.cache.get(channelId);
  if (!channel) {
    try {
      channel = await client.channels.fetch(channelId);
    } catch (err) {
      console.log(`[SETUP] ❌ ${label} : impossible de trouver le salon (ID: ${channelId}) — ${err.message}`);
      return;
    }
  }

  // Supprimer les anciens messages du bot dans ce salon (évite les doublons)
  try {
    const messages = await channel.messages.fetch({ limit: 20 });
    const botMessages = messages.filter(m => m.author.id === client.user.id);
    for (const msg of botMessages.values()) {
      await msg.delete().catch(() => {});
    }
  } catch {
    // Pas grave si on ne peut pas supprimer
  }

  // Poster l'embed
  try {
    await postFn(channel);
    console.log(`[SETUP] ✅ ${label} : embed posté dans #${channel.name}`);
  } catch (err) {
    console.log(`[SETUP] ❌ ${label} : erreur lors du post — ${err.message}`);
  }
}

module.exports = {
  name: 'ready',
  once: true,
  async execute(client) {
    console.log(`[BOT] ✅ Connecté en tant que ${client.user.tag}`);
    console.log(`[BOT] 🌐 ${client.guilds.cache.size} serveur(s)`);

    client.user.setPresence({
      activities: [{ name: '🛡️ Protection du serveur', type: ActivityType.Watching }],
      status: 'online',
    });

    // Laisser le temps au cache de se charger
    await new Promise(r => setTimeout(r, 2000));

    console.log('[SETUP] Démarrage de la configuration automatique...');
    console.log(`[SETUP] REGLEMENT_CHANNEL_ID = ${config.REGLEMENT_CHANNEL_ID || 'NON DÉFINI'}`);
    console.log(`[SETUP] TICKET_CHANNEL_ID    = ${config.TICKET_CHANNEL_ID || 'NON DÉFINI'}`);

    await setupChannel(client, config.REGLEMENT_CHANNEL_ID, '📜 Règlement', postReglementEmbed);
    await setupChannel(client, config.TICKET_CHANNEL_ID,    '🎟️ Tickets',   postTicketEmbed);

    console.log('[SETUP] Configuration terminée.');
  },
};
