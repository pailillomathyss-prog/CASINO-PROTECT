const { PermissionFlagsBits } = require('discord.js');
const config = require('../config');

// Cache guildId -> role
const verifiedRoleCache = new Map();

async function getOrCreateVerifiedRole(guild) {
  // 1. Vérifier le cache
  if (verifiedRoleCache.has(guild.id)) {
    const cached = guild.roles.cache.get(verifiedRoleCache.get(guild.id));
    if (cached) return cached;
  }

  // 2. Utiliser VERIFIED_ROLE_ID si défini
  if (config.VERIFIED_ROLE_ID) {
    const role = guild.roles.cache.get(config.VERIFIED_ROLE_ID)
      || await guild.roles.fetch(config.VERIFIED_ROLE_ID).catch(() => null);
    if (role) {
      verifiedRoleCache.set(guild.id, role.id);
      return role;
    }
  }

  // 3. Chercher un rôle existant par nom
  await guild.roles.fetch();
  let role = guild.roles.cache.find(r => r.name === '✅ Vérifié');

  // 4. Créer le rôle s'il n'existe pas
  if (!role) {
    role = await guild.roles.create({
      name: '✅ Vérifié',
      color: 0x57F287,
      hoist: false,
      mentionable: false,
      reason: 'Rôle de vérification créé automatiquement par le bot',
    });
    console.log(`[ROLE] ✅ Rôle "✅ Vérifié" créé sur ${guild.name} — ID : ${role.id}`);
    console.log(`[ROLE] 💡 Tu peux définir VERIFIED_ROLE_ID=${role.id} dans tes variables Railway.`);
  } else {
    console.log(`[ROLE] ♻️  Rôle "✅ Vérifié" trouvé sur ${guild.name} — ID : ${role.id}`);
  }

  verifiedRoleCache.set(guild.id, role.id);
  return role;
}

async function setupChannelPermissions(guild, reglementChannelId) {
  const verifiedRole = await getOrCreateVerifiedRole(guild);
  const everyoneRole = guild.roles.everyone;
  const botMember = guild.members.me;

  const channels = guild.channels.cache.filter(c =>
    c.isTextBased() && !c.isThread()
  );

  let success = 0;
  let errors = 0;

  for (const [, channel] of channels) {
    const isReglement = channel.id === reglementChannelId;

    try {
      if (isReglement) {
        // Salon règlement : visible par tout le monde
        await channel.permissionOverwrites.edit(everyoneRole, {
          ViewChannel: true,
          SendMessages: false,
        });
        await channel.permissionOverwrites.edit(botMember, {
          ViewChannel: true,
          SendMessages: true,
          ManageMessages: true,
        });
      } else {
        // Autres salons : caché sans le rôle vérifié
        await channel.permissionOverwrites.edit(everyoneRole, {
          ViewChannel: false,
        });
        await channel.permissionOverwrites.edit(verifiedRole, {
          ViewChannel: true,
          SendMessages: true,
        });
        await channel.permissionOverwrites.edit(botMember, {
          ViewChannel: true,
          SendMessages: true,
          ManageMessages: true,
        });
      }
      success++;
    } catch {
      errors++;
    }
  }

  return { verifiedRole, success, errors };
}

module.exports = { getOrCreateVerifiedRole, setupChannelPermissions };
