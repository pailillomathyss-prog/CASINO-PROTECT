const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { getOrCreateVerifiedRole, getOrCreateSupportRole } = require('../systems/roleManager');

module.exports = {
  name: 'createroles',
  description: 'Créer les rôles du bot automatiquement (Admin)',
  usage: '!createroles',

  data: new SlashCommandBuilder()
    .setName('createroles')
    .setDescription('Créer les rôles du bot automatiquement (Admin)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async run(message) {
    if (!message.member.permissions.has(PermissionFlagsBits.Administrator))
      return message.reply('❌ Commande réservée aux administrateurs.');

    const processing = await message.reply('⏳ Création des rôles en cours...');
    const embed = await createRoles(message.guild);
    await processing.edit({ content: '', embeds: [embed] });
    await message.delete().catch(() => {});
  },

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });
    const embed = await createRoles(interaction.guild);
    await interaction.editReply({ embeds: [embed] });
  },
};

async function createRoles(guild) {
  const results = [];

  try {
    const verified = await getOrCreateVerifiedRole(guild);
    results.push(`✅ **${verified.name}** — <@&${verified.id}>`);
  } catch (e) {
    results.push(`❌ Vérifié : ${e.message}`);
  }

  try {
    const support = await getOrCreateSupportRole(guild);
    results.push(`✅ **${support.name}** — <@&${support.id}>`);
  } catch (e) {
    results.push(`❌ Support : ${e.message}`);
  }

  return new EmbedBuilder()
    .setTitle('🎭 Rôles créés !')
    .setDescription(results.join('\n'))
    .addFields({
      name: '⚠️ Étape manuelle',
      value: 'Place le rôle du bot **au-dessus** de ces rôles dans **Paramètres → Rôles** pour qu\'il puisse les attribuer.',
    })
    .setColor(0x57F287)
    .setTimestamp();
}
