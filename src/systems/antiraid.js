const { GuildVerificationLevel } = require('discord.js');
const { sendLog } = require('./logs');

const RAID_THRESHOLD = 8;       // Jointures max
const RAID_WINDOW = 10000;      // Fenêtre en ms (10 secondes)
const RAID_COOLDOWN = 60000;    // Durée de restriction en ms (1 minute)

const guildJoinMap = new Map();
const raidActive = new Map();

async function checkAntiRaid(member) {
  const guild = member.guild;
  const key = guild.id;
  const now = Date.now();

  // Si un raid est déjà actif, gérer le nouveau membre
  if (raidActive.get(key)) {
    try {
      await member.kick('Anti-raid : raid en cours');
    } catch {}
    return;
  }

  if (!guildJoinMap.has(key)) {
    guildJoinMap.set(key, []);
  }

  const joins = guildJoinMap.get(key).filter(t => now - t < RAID_WINDOW);
  joins.push(now);
  guildJoinMap.set(key, joins);

  if (joins.length < RAID_THRESHOLD) return;

  // Raid détecté
  raidActive.set(key, true);
  guildJoinMap.set(key, []);

  console.log(`[ANTI-RAID] Raid détecté sur ${guild.name} — ${joins.length} jointures en ${RAID_WINDOW / 1000}s`);

  // Augmenter le niveau de vérification
  try {
    await guild.setVerificationLevel(GuildVerificationLevel.High, 'Anti-raid actif');
  } catch {}

  // Log
  await sendLog(guild, 'ANTIRAID', {
    count: joins.length,
    window: RAID_WINDOW / 1000,
  });

  // Rétablir après cooldown
  setTimeout(async () => {
    raidActive.set(key, false);
    try {
      await guild.setVerificationLevel(GuildVerificationLevel.Low, 'Anti-raid : fin de raid');
    } catch {}
  }, RAID_COOLDOWN);
}

module.exports = { checkAntiRaid };
