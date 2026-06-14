const { PermissionFlagsBits } = require('discord.js');
const config = require('../config');

const verifiedRoleCache = new Map(); // guildId -> roleId
const supportRoleCache  = new Map(); // guildId -> roleId

// ── Rôle ✅ Vérifié ─────────────────────────────────────────────────────────

async function getOrCreateVerifiedRole(guild) {
  if (verifiedRoleCache.has(guild.id)) {
    const cached = guild.roles.cache.get(verifiedRoleCache.get(guild.id));
    if (cached) return cached;
  }

  if (config.VERIFIED_ROLE_ID) {
    const role = guild.roles.cache.get(config.VERIFIED_ROLE_ID)
      || await guild.roles.fetch(config.VERIFIED_ROLE_ID).catch(() => null);
    if (role) { verifiedRoleCache.set(guild.id, role.id); return role; }
  }

  await guild.roles.fetch();
  let role = guild.roles.cache.find(r =>
    ['✅ vérifié', 'verifie', 'verified'].includes(r.name.toLowerCase())
  );

  if (!role) {
    role = await guild.roles.create({
      name       : '✅ Vérifié',
      color      : 0x57F287,
      hoist      : false,
      mentionable: false,
      reason     : 'Créé automatiquement par le bot (règlement)',
    });
    console.log(`[ROLE] ✅ "✅ Vérifié" créé sur ${guild.name} — ID : ${role.id}`);
  } else {
    console.log(`[ROLE] ♻️  "✅ Vérifié" trouvé sur ${guild.name}`);
  }

  verifiedRoleCache.set(guild.id, role.id);
  return role;
}

// ── Rôle 🎫 Support ─────────────────────────────────────────────────────────

async function getOrCreateSupportRole(guild) {
  if (supportRoleCache.has(guild.id)) {
    const cached = guild.roles.cache.get(supportRoleCache.get(guild.id));
    if (cached) return cached;
  }

  await guild.roles.fetch();
  let role = guild.roles.cache.find(r =>
    r.name.toLowerCase().includes('support') || r.name.includes('🎫')
  );

  if (!role) {
    role = await guild.roles.create({
      name       : '🎫 Support',
      color      : 0x5865F2,
      hoist      : true,
      mentionable: true,
      reason     : 'Créé automatiquement par le bot (tickets)',
    });
    console.log(`[ROLE] 🎫 "🎫 Support" créé sur ${guild.name} — ID : ${role.id}`);
  } else {
    console.log(`[ROLE] ♻️  "🎫 Support" trouvé sur ${guild.name}`);
  }

  supportRoleCache.set(guild.id, role.id);
  return role;
}

// ── Setup permissions salons ─────────────────────────────────────────────────

async function setupChannelPermissions(guild, reglementChannelId) {
  const verifiedRole = await getOrCreateVerifiedRole(guild);
  const everyoneRole = guild.roles.everyone;
  const botMember    = guild.members.me;

  const channels = guild.channels.cache.filter(c => c.isTextBased() && !c.isThread());
  let success = 0, errors = 0;

  for (const [, channel] of channels) {
    const isReglement = channel.id === reglementChannelId;
    try {
      if (isReglement) {
        await channel.permissionOverwrites.edit(everyoneRole, { ViewChannel: true, SendMessages: false });
        await channel.permissionOverwrites.edit(botMember, { ViewChannel: true, SendMessages: true, ManageMessages: true });
      } else {
        await channel.permissionOverwrites.edit(everyoneRole, { ViewChannel: false });
        await channel.permissionOverwrites.edit(verifiedRole, { ViewChannel: true, SendMessages: true });
        await channel.permissionOverwrites.edit(botMember, { ViewChannel: true, SendMessages: true, ManageMessages: true });
      }
      success++;
    } catch { errors++; }
  }

  return { verifiedRole, success, errors };
}

module.exports = { getOrCreateVerifiedRole, getOrCreateSupportRole, setupChannelPermissions };
