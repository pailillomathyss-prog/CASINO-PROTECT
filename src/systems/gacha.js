const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require('discord.js');
const { getBalance, deductDiamonds, hasFunds, GACHA_COST } = require('./economy');

// guildId -> [ { roleId, roleName, rarity, emoji } ]
const gachaPools = new Map();

const RARITIES = {
  commun     : { label: 'Commun',     emoji: '⬜', color: 0x95a5a6, weight: 60 },
  rare       : { label: 'Rare',       emoji: '🔵', color: 0x3498db, weight: 28 },
  epique     : { label: 'Épique',     emoji: '🟣', color: 0x9b59b6, weight: 10 },
  legendaire : { label: 'Légendaire', emoji: '🟡', color: 0xf1c40f, weight:  2 },
};

function getPool(guildId) {
  if (!gachaPools.has(guildId)) gachaPools.set(guildId, []);
  return gachaPools.get(guildId);
}

function addRoleToPool(guildId, roleId, roleName, rarity) {
  const pool = getPool(guildId);
  const existing = pool.findIndex(r => r.roleId === roleId);
  const entry = { roleId, roleName, rarity: rarity.toLowerCase(), emoji: RARITIES[rarity.toLowerCase()]?.emoji || '⬜' };
  if (existing >= 0) pool[existing] = entry;
  else pool.push(entry);
  return entry;
}

function removeRoleFromPool(guildId, roleId) {
  const pool = getPool(guildId);
  const idx  = pool.findIndex(r => r.roleId === roleId);
  if (idx < 0) return false;
  pool.splice(idx, 1);
  return true;
}

function pickFromPool(guildId) {
  const pool = getPool(guildId);
  if (pool.length === 0) return null;

  // Tirage pondéré par rareté
  const weighted = [];
  for (const entry of pool) {
    const w = RARITIES[entry.rarity]?.weight || 60;
    for (let i = 0; i < w; i++) weighted.push(entry);
  }

  return weighted[Math.floor(Math.random() * weighted.length)];
}

function buildGachaEmbed(guildId, guild) {
  const pool = getPool(guildId);

  const byRarity = { legendaire: [], epique: [], rare: [], commun: [] };
  for (const r of pool) {
    (byRarity[r.rarity] || byRarity.commun).push(r);
  }

  const lines = [];
  for (const [rarity, entries] of Object.entries(byRarity)) {
    if (entries.length === 0) continue;
    const info = RARITIES[rarity];
    lines.push(`\n${info.emoji} **${info.label}** — ${info.weight}% de chance`);
    for (const e of entries) {
      const role = guild.roles.cache.get(e.roleId);
      lines.push(`> ${role ? role.toString() : e.roleName}`);
    }
  }

  return new EmbedBuilder()
    .setTitle('🎲 GACHA — Tire un rôle !')
    .setDescription(
      `Tente ta chance pour obtenir un rôle exclusif !\n\n` +
      `**Coût :** ${GACHA_COST} 💎 par tirage\n` +
      (lines.length > 0 ? `\n**Rôles disponibles :**\n${lines.join('\n')}` : '\n*Aucun rôle configuré — utilise `!gacha addrole`*') +
      `\n\u200B`
    )
    .setColor(0x9b59b6)
    .setFooter({ text: 'Bonne chance ! 🍀' })
    .setTimestamp();
}

function buildGachaButton() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('gacha_pull')
      .setLabel(`🎲 Tirer (${GACHA_COST} 💎)`)
      .setStyle(ButtonStyle.Primary),
  );
}

async function handleGachaPull(interaction) {
  const user  = interaction.user;
  const guild = interaction.guild;

  if (!hasFunds(user.id, GACHA_COST)) {
    return interaction.reply({
      content: `❌ Tu n'as pas assez de 💎 ! Il te faut **${GACHA_COST} 💎**.\n💎 Ton solde : **${getBalance(user.id)} 💎**`,
      ephemeral: true,
    });
  }

  const pool = getPool(guild.id);
  if (pool.length === 0) {
    return interaction.reply({
      content: '❌ Aucun rôle configuré dans le gacha. Contacte un administrateur.',
      ephemeral: true,
    });
  }

  deductDiamonds(user.id, GACHA_COST);
  const picked  = pickFromPool(guild.id);
  const rarity  = RARITIES[picked.rarity];
  const member  = await guild.members.fetch(user.id).catch(() => null);

  let alreadyHad = false;
  if (member) {
    if (member.roles.cache.has(picked.roleId)) {
      alreadyHad = true;
    } else {
      await member.roles.add(picked.roleId).catch(() => {});
    }
  }

  const embed = new EmbedBuilder()
    .setTitle(`${rarity.emoji} ${rarity.label.toUpperCase()} — Tu as obtenu un rôle !`)
    .setDescription(
      `🎊 Félicitations ${user} !\n\n` +
      `Tu as tiré : **<@&${picked.roleId}>** ${rarity.emoji}\n` +
      (alreadyHad ? `\n> *(Tu avais déjà ce rôle — tire encore !)*` : '') +
      `\n\n💎 Solde restant : **${getBalance(user.id)} 💎**`
    )
    .setColor(rarity.color)
    .setTimestamp();

  await interaction.reply({ embeds: [embed], ephemeral: true });

  // Log dans #gains-pertes s'il existe
  const logChannel = guild.channels.cache.find(c =>
    ['gains', 'pertes', 'casino-log', 'résultats', 'resultats', 'gacha-log'].some(kw => c.name.toLowerCase().includes(kw))
  );
  if (logChannel) {
    const logEmbed = new EmbedBuilder()
      .setAuthor({ name: user.tag, iconURL: user.displayAvatarURL() })
      .setTitle(`🎲 Tirage gacha — ${rarity.emoji} ${rarity.label}`)
      .setDescription(`<@${user.id}> a tiré **<@&${picked.roleId}>** !`)
      .setColor(rarity.color)
      .setTimestamp();
    await logChannel.send({ embeds: [logEmbed] }).catch(() => {});
  }
}

module.exports = {
  addRoleToPool, removeRoleFromPool, getPool,
  buildGachaEmbed, buildGachaButton,
  handleGachaPull,
};
