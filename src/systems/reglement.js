const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { sendLog } = require('./logs');
const config = require('../config');

async function postReglementEmbed(channel) {
  const embed = new EmbedBuilder()
    .setTitle('📜 Règlement du Serveur')
    .setDescription(
      '**Bienvenue ! Avant d\'accéder au serveur, lis et accepte les règles suivantes.**\n\n' +
      '**1.** Respecte tous les membres sans exception.\n' +
      '**2.** Aucun contenu illégal, NSFW ou choquant.\n' +
      '**3.** Pas de spam, flood ni de publicité non autorisée.\n' +
      '**4.** Les liens externes non autorisés seront supprimés.\n' +
      '**5.** Suis les instructions des modérateurs sans discuter.\n' +
      '**6.** Aucune usurpation d\'identité.\n' +
      '**7.** Gardez les conversations dans les salons appropriés.\n\n' +
      '> En cliquant sur le bouton ci-dessous, tu acceptes le règlement.'
    )
    .setColor(0x5865F2)
    .setFooter({ text: 'Clique sur le bouton pour obtenir accès au serveur.' })
    .setTimestamp();

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('reglement_accept')
      .setLabel('✅ Est-tu prêt à parier ?')
      .setStyle(ButtonStyle.Success)
  );

  await channel.send({ embeds: [embed], components: [row] });
}

async function handleReglementAccept(interaction) {
  const roleId = config.VERIFIED_ROLE_ID;

  if (!roleId) {
    return interaction.reply({
      content: '❌ Le rôle vérifié n\'est pas configuré. Contacte un administrateur.',
      ephemeral: true,
    });
  }

  const member = interaction.member;
  const role = interaction.guild.roles.cache.get(roleId);

  if (!role) {
    return interaction.reply({
      content: '❌ Rôle introuvable. Contacte un administrateur.',
      ephemeral: true,
    });
  }

  if (member.roles.cache.has(roleId)) {
    return interaction.reply({
      content: '✅ Tu as déjà accepté le règlement et tu as accès au serveur !',
      ephemeral: true,
    });
  }

  try {
    await member.roles.add(role, 'Règlement accepté');

    await interaction.reply({
      content: '🎉 **Bienvenue !** Tu as accepté le règlement et tu as maintenant accès au serveur. Amuse-toi bien !',
      ephemeral: true,
    });

    await sendLog(interaction.guild, 'REGLEMENT', {
      user: interaction.user,
      roleId,
    });
  } catch (err) {
    await interaction.reply({
      content: '❌ Impossible d\'attribuer le rôle. Vérifie que le bot a les permissions nécessaires.',
      ephemeral: true,
    });
  }
}

module.exports = { postReglementEmbed, handleReglementAccept };
