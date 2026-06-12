const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { sendLog } = require('./logs');
const { getOrCreateVerifiedRole } = require('./roleManager');

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
      '> En cliquant sur le bouton ci-dessous, tu acceptes le règlement et accèdes au serveur.'
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
  const guild = interaction.guild;
  const member = interaction.member;

  // Récupérer ou créer le rôle vérifié automatiquement
  let role;
  try {
    role = await getOrCreateVerifiedRole(guild);
  } catch (err) {
    return interaction.reply({
      content: '❌ Impossible de trouver ou créer le rôle de vérification. Vérifie les permissions du bot.',
      ephemeral: true,
    });
  }

  if (member.roles.cache.has(role.id)) {
    return interaction.reply({
      content: '✅ Tu as déjà accepté le règlement et tu as accès au serveur !',
      ephemeral: true,
    });
  }

  try {
    await member.roles.add(role, 'Règlement accepté');

    await interaction.reply({
      content: `🎉 **Bienvenue !** Tu as accepté le règlement et tu as maintenant accès au serveur. Amuse-toi bien !`,
      ephemeral: true,
    });

    await sendLog(guild, 'REGLEMENT', {
      user: interaction.user,
      roleId: role.id,
    });
  } catch (err) {
    await interaction.reply({
      content: '❌ Impossible d\'attribuer le rôle. Vérifie que le rôle du bot est **au-dessus** du rôle "✅ Vérifié" dans la liste des rôles.',
      ephemeral: true,
    });
  }
}

module.exports = { postReglementEmbed, handleReglementAccept };
