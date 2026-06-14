const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { addRoleToPool, removeRoleFromPool, getPool, buildGachaEmbed, buildGachaButton, calculatePoolChances, RARITIES } = require('../systems/gacha');

const VALID_RARITIES = ['commun', 'rare', 'epique', 'legendaire'];

module.exports = {
  name: 'gacha',
  description: 'Gérer le gacha du serveur',
  usage: '!gacha setup | !gacha addrole @role commun/rare/epique/legendaire | !gacha retirerole @role | !gacha liste',

  data: new SlashCommandBuilder()
    .setName('gacha')
    .setDescription('Gérer le système de gacha')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
    .addSubcommand(sub => sub
      .setName('setup')
      .setDescription('Poster le panneau gacha dans ce salon')
    )
    .addSubcommand(sub => sub
      .setName('addrole')
      .setDescription('Ajouter un rôle au pool gacha')
      .addRoleOption(o => o.setName('role').setDescription('Le rôle à ajouter').setRequired(true))
      .addStringOption(o => o
        .setName('rarete')
        .setDescription('Rareté du rôle')
        .setRequired(true)
        .addChoices(
          { name: '⬜ Commun (60%)',      value: 'commun' },
          { name: '🔵 Rare (28%)',        value: 'rare' },
          { name: '🟣 Épique (10%)',      value: 'epique' },
          { name: '🟡 Légendaire (2%)',   value: 'legendaire' },
        )
      )
    )
    .addSubcommand(sub => sub
      .setName('retirerole')
      .setDescription('Retirer un rôle du pool gacha')
      .addRoleOption(o => o.setName('role').setDescription('Le rôle à retirer').setRequired(true))
    )
    .addSubcommand(sub => sub
      .setName('liste')
      .setDescription('Voir les rôles configurés dans le gacha')
    ),

  async run(message, args) {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageRoles)) {
      return message.reply('❌ Tu n\'as pas la permission d\'utiliser cette commande.');
    }

    const sub = args[0]?.toLowerCase();

    if (!sub || sub === 'setup') {
      await postGachaPanel(message.channel, message.guild);
      await message.delete().catch(() => {});

    } else if (sub === 'addrole') {
      const role    = message.mentions.roles.first();
      const rarity  = args[2]?.toLowerCase();

      if (!role)   return message.reply('❌ Mentionne un rôle. Ex: `!gacha addrole @VIP rare`');
      if (!VALID_RARITIES.includes(rarity)) {
        return message.reply(`❌ Rareté invalide. Choix : \`${VALID_RARITIES.join(' | ')}\``);
      }

      addRoleToPool(message.guild.id, role.id, role.name, rarity);
      message.reply({ embeds: [buildAddEmbed(message.guild.id, role, rarity)] });

    } else if (sub === 'retirerole') {
      const role = message.mentions.roles.first();
      if (!role) return message.reply('❌ Mentionne un rôle. Ex: `!gacha retirerole @VIP`');

      const removed = removeRoleFromPool(message.guild.id, role.id);
      message.reply(removed ? `✅ **${role.name}** retiré du gacha.` : '❌ Ce rôle n\'est pas dans le pool.');

    } else if (sub === 'liste') {
      const pool = getPool(message.guild.id);
      if (pool.length === 0) return message.reply('📋 Aucun rôle configuré dans le gacha.');
      message.reply({ embeds: [buildListEmbed(message.guild.id)] });
    } else {
      message.reply('❌ Sous-commande inconnue. Utilise : `setup`, `addrole`, `retirerole`, `liste`');
    }
  },

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();

    if (sub === 'setup') {
      await interaction.deferReply({ ephemeral: true });
      await postGachaPanel(interaction.channel, interaction.guild);
      await interaction.editReply('✅ Panneau gacha posté !');

    } else if (sub === 'addrole') {
      const role   = interaction.options.getRole('role');
      const rarity = interaction.options.getString('rarete');
      addRoleToPool(interaction.guild.id, role.id, role.name, rarity);
      await interaction.reply({ embeds: [buildAddEmbed(interaction.guild.id, role, rarity)], ephemeral: true });

    } else if (sub === 'retirerole') {
      const role    = interaction.options.getRole('role');
      const removed = removeRoleFromPool(interaction.guild.id, role.id);
      await interaction.reply({
        content: removed ? `✅ **${role.name}** retiré du gacha.` : '❌ Ce rôle n\'est pas dans le pool.',
        ephemeral: true,
      });

    } else if (sub === 'liste') {
      const pool = getPool(interaction.guild.id);
      if (pool.length === 0) return interaction.reply({ content: '📋 Aucun rôle dans le gacha.', ephemeral: true });
      await interaction.reply({ embeds: [buildListEmbed(interaction.guild.id)], ephemeral: true });
    }
  },
};

async function postGachaPanel(channel, guild) {
  const embed = buildGachaEmbed(guild.id, guild);
  const row   = buildGachaButton();
  await channel.send({ embeds: [embed], components: [row] });
}

// ── Embed confirmation après addrole ──────────────────────────────────────────

function buildAddEmbed(guildId, role, rarity) {
  const { EmbedBuilder } = require('discord.js');
  const info    = RARITIES[rarity] || RARITIES.commun;
  const chances = calculatePoolChances(guildId);
  const entry   = chances.find(c => c.roleId === role.id);
  const percent = entry ? entry.percent : '?';

  // Résumé de tout le pool mis à jour
  const poolLines = chances.map(c => {
    const r = RARITIES[c.rarity];
    const arrow = c.roleId === role.id ? ' ◀ nouveau' : '';
    return `${r.emoji} <@&${c.roleId}> — **${c.percent}%**${arrow}`;
  }).join('\n');

  return new EmbedBuilder()
    .setTitle(`${info.emoji} Rôle ajouté au gacha !`)
    .setDescription(
      `<@&${role.id}> ajouté en **${info.label}**\n` +
      `📊 Chance d'obtention : **${percent}%**\n\n` +
      `**Pool complet (${chances.length} rôle${chances.length > 1 ? 's' : ''}) :**\n${poolLines}`
    )
    .setColor(info.color)
    .setTimestamp();
}

// ── Embed liste avec % ─────────────────────────────────────────────────────────

function buildListEmbed(guildId) {
  const { EmbedBuilder } = require('discord.js');
  const chances = calculatePoolChances(guildId);

  // Grouper par rareté
  const groups = {};
  for (const c of chances) {
    if (!groups[c.rarity]) groups[c.rarity] = [];
    groups[c.rarity].push(c);
  }

  const fields = [];
  const order  = ['legendaire', 'epique', 'rare', 'commun'];
  for (const rarity of order) {
    if (!groups[rarity]) continue;
    const info  = RARITIES[rarity];
    const lines = groups[rarity].map(c => `${info.emoji} <@&${c.roleId}> — **${c.percent}%**`).join('\n');
    fields.push({ name: `${info.emoji} ${info.label}`, value: lines, inline: false });
  }

  return new EmbedBuilder()
    .setTitle('🎲 Pool Gacha — Chances d\'obtention')
    .setDescription(`**${chances.length} rôle${chances.length > 1 ? 's' : ''} dans le pool**\nLes % sont calculés en fonction du pool actuel.`)
    .addFields(fields)
    .setColor(0x9b59b6)
    .setFooter({ text: 'Utilise !gacha addrole ou !gacha retirerole pour modifier le pool' })
    .setTimestamp();
}
