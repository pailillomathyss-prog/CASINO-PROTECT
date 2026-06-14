const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { addRoleToPool } = require('../systems/gacha');

const GACHA_ROLES = [
  { name: '⬜ Commun',     color: 0x95a5a6, rarity: 'commun',     emoji: '⬜' },
  { name: '🔵 Rare',       color: 0x3498db, rarity: 'rare',       emoji: '🔵' },
  { name: '🟣 Épique',     color: 0x9b59b6, rarity: 'epique',     emoji: '🟣' },
  { name: '🟡 Légendaire', color: 0xf1c40f, rarity: 'legendaire', emoji: '🟡' },
];

module.exports = {
  name: 'createroles',
  description: 'Créer les rôles du gacha automatiquement (Admin)',
  usage: '!createroles',

  data: new SlashCommandBuilder()
    .setName('createroles')
    .setDescription('Créer les rôles de rareté du gacha automatiquement (Admin)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async run(message) {
    if (!message.member.permissions.has(PermissionFlagsBits.Administrator))
      return message.reply('❌ Commande réservée aux administrateurs.');

    const processing = await message.reply('⏳ Création des rôles gacha en cours...');
    const embed = await createGachaRoles(message.guild);
    await processing.edit({ content: '', embeds: [embed] });
    await message.delete().catch(() => {});
  },

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });
    const embed = await createGachaRoles(interaction.guild);
    await interaction.editReply({ embeds: [embed] });
  },
};

async function createGachaRoles(guild) {
  const results = [];

  for (const def of GACHA_ROLES) {
    try {
      // Chercher si le rôle existe déjà
      await guild.roles.fetch();
      let role = guild.roles.cache.find(r => r.name === def.name);

      if (!role) {
        role = await guild.roles.create({
          name       : def.name,
          color      : def.color,
          hoist      : true,
          mentionable: false,
          reason     : 'Créé automatiquement par !createroles (gacha)',
        });
      }

      // Ajouter au pool gacha
      addRoleToPool(guild.id, role.id, role.name, def.rarity);
      results.push(`${def.emoji} **${role.name}** — <@&${role.id}> ajouté au gacha`);
    } catch (e) {
      results.push(`❌ ${def.name} : ${e.message}`);
    }
  }

  return new EmbedBuilder()
    .setTitle('🎲 Rôles Gacha créés !')
    .setDescription(results.join('\n'))
    .addFields(
      {
        name: '📊 Chances de tirage',
        value: '⬜ Commun **60%** — 🔵 Rare **28%** — 🟣 Épique **10%** — 🟡 Légendaire **2%**',
      },
      {
        name: '⚠️ Étape manuelle',
        value: 'Place le rôle du bot **au-dessus** de ces rôles dans **Paramètres → Rôles** pour qu\'il puisse les attribuer.',
      }
    )
    .setColor(0x9b59b6)
    .setTimestamp();
}
