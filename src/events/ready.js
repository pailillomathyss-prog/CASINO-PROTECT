const { ActivityType } = require('discord.js');
const { postReglementEmbed } = require('../systems/reglement');
const { postTicketEmbed } = require('../systems/ticket');
const { getOrCreateVerifiedRole } = require('../systems/roleManager');
const config = require('../config');

async function setupChannel(client, channelId, label, postFn) {
  if (!channelId) {
    console.log(`[SETUP] ⚠️  ${label} : CHANNEL ID non défini dans les variables d'environnement.`);
    return;
  }

  let channel = client.channels.cache.get(channelId);
  if (!channel) {
    try {
      channel = await client.channels.fetch(channelId);
    } catch (err) {
      console.log(`[SETUP] ❌ ${label} : salon introuvable (ID: ${channelId}) — ${err.message}`);
      return;
    }
  }

  // Supprimer les anciens messages du bot
  try {
    const messages = await channel.messages.fetch({ limit: 20 });
    const botMessages = messages.filter(m => m.author.id === client.user.id);
    for (const msg of botMessages.values()) {
      await msg.delete().catch(() => {});
    }
  } catch {}

  try {
    await postFn(channel);
    console.log(`[SETUP] ✅ ${label} : embed posté dans #${channel.name}`);
  } catch (err) {
    console.log(`[SETUP] ❌ ${label} : erreur — ${err.message}`);
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

    await new Promise(r => setTimeout(r, 2000));

    // Créer/récupérer le rôle vérifié sur chaque serveur
    for (const [, guild] of client.guilds.cache) {
      try {
        await guild.members.fetchMe();
        const role = await getOrCreateVerifiedRole(guild);
        console.log(`[ROLE] Rôle vérifié prêt : "${role.name}" (${role.id}) sur ${guild.name}`);
      } catch (err) {
        console.log(`[ROLE] ❌ Erreur sur ${guild.name} : ${err.message}`);
      }
    }

    console.log('[SETUP] Démarrage de la configuration automatique...');
    await setupChannel(client, config.REGLEMENT_CHANNEL_ID, '📜 Règlement', postReglementEmbed);
    await setupChannel(client, config.TICKET_CHANNEL_ID, '🎟️ Tickets', postTicketEmbed);
    console.log('[SETUP] Configuration terminée.');
  },
};
