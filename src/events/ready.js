const { ActivityType } = require('discord.js');
const { postReglementEmbed } = require('../systems/reglement');
const { postTicketEmbed }     = require('../systems/ticket');
const { getOrCreateVerifiedRole, getOrCreateSupportRole } = require('../systems/roleManager');
const config = require('../config');

async function setupChannel(client, channelId, label, postFn) {
  if (!channelId) {
    console.log(`[SETUP] ⚠️  ${label} : CHANNEL ID non défini.`);
    return;
  }
  let channel = client.channels.cache.get(channelId);
  if (!channel) {
    try { channel = await client.channels.fetch(channelId); }
    catch (err) { console.log(`[SETUP] ❌ ${label} : salon introuvable — ${err.message}`); return; }
  }
  try {
    const messages = await channel.messages.fetch({ limit: 20 });
    for (const msg of messages.filter(m => m.author.id === client.user.id).values()) {
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

    // ── Création automatique des rôles sur chaque serveur ──────────────────
    for (const [, guild] of client.guilds.cache) {
      try {
        await guild.members.fetchMe();

        // ✅ Rôle Vérifié
        const verified = await getOrCreateVerifiedRole(guild);
        console.log(`[ROLE] ✅ Vérifié prêt : "${verified.name}" sur ${guild.name}`);

        // 🎫 Rôle Support
        const support = await getOrCreateSupportRole(guild);
        console.log(`[ROLE] 🎫 Support prêt : "${support.name}" sur ${guild.name}`);

      } catch (err) {
        console.log(`[ROLE] ❌ Erreur sur ${guild.name} : ${err.message}`);
      }
    }

    // ── Auto-post embeds dans les salons configurés ────────────────────────
    console.log('[SETUP] Démarrage de la configuration automatique...');
    await setupChannel(client, config.REGLEMENT_CHANNEL_ID, '📜 Règlement', postReglementEmbed);
    await setupChannel(client, config.TICKET_CHANNEL_ID,    '🎟️ Tickets',   postTicketEmbed);
    console.log('[SETUP] Configuration terminée.');
  },
};
