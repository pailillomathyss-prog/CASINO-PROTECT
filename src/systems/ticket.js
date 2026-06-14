const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  PermissionFlagsBits,
  ChannelType,
} = require('discord.js');
const { sendLog } = require('./logs');
const config = require('../config');

const TICKET_REASONS = [
  { label: '❓ Question générale',       value: 'question',    description: 'Une question sur le serveur ou la communauté' },
  { label: '🔧 Problème technique',      value: 'technique',   description: 'Un bug ou problème technique' },
  { label: '🚨 Signalement d\'un membre',value: 'signalement', description: 'Signaler un comportement inapproprié' },
  { label: '⚖️ Contestation de sanction',value: 'sanction',    description: 'Contester un ban, mute ou warn' },
  { label: '🤝 Partenariat',             value: 'partenariat', description: 'Proposer un partenariat' },
  { label: '📦 Autre',                   value: 'autre',       description: 'Autre demande' },
];

const REASON_LABELS = {
  question    : '❓ Question générale',
  technique   : '🔧 Problème technique',
  signalement : '🚨 Signalement d\'un membre',
  sanction    : '⚖️ Contestation de sanction',
  partenariat : '🤝 Partenariat',
  autre       : '📦 Autre',
};

// Map pour éviter les tickets multiples : userId -> channelId
const openTickets = new Map();

/**
 * Récupère tous les rôles staff qui doivent voir les tickets.
 * Cherche : STAFF_ROLE_ID (config), "🎫 support", "support", "staff", "mod", "modérateur"
 */
function getStaffRoles(guild) {
  const roles = [];

  // Rôle depuis la config Railway/env
  if (config.STAFF_ROLE_ID && guild.roles.cache.has(config.STAFF_ROLE_ID)) {
    roles.push(config.STAFF_ROLE_ID);
  }

  // Recherche par nom (🎫 Support et variantes)
  const keywords = ['🎫', 'support', 'staff', 'modo', 'modérateur', 'moderateur', 'admin'];
  for (const role of guild.roles.cache.values()) {
    const name = role.name.toLowerCase();
    if (
      !roles.includes(role.id) &&
      keywords.some(kw => name.includes(kw))
    ) {
      roles.push(role.id);
    }
  }

  return roles;
}

async function postTicketEmbed(channel) {
  const embed = new EmbedBuilder()
    .setTitle('🎟️ Support & Tickets')
    .setDescription(
      '**Besoin d\'aide ? Ouvre un ticket !**\n\n' +
      'Clique sur le bouton ci-dessous pour créer un ticket privé avec l\'équipe.\n\n' +
      '> Un seul ticket actif par utilisateur.'
    )
    .setColor(0x5865F2)
    .setFooter({ text: 'Clique sur le bouton pour ouvrir un ticket.' })
    .setTimestamp();

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('ticket_open')
      .setLabel('🎟️ Ouvrir un ticket')
      .setStyle(ButtonStyle.Primary)
  );

  await channel.send({ embeds: [embed], components: [row] });
}

async function handleTicketOpen(interaction) {
  const existingChannelId = openTickets.get(interaction.user.id);
  if (existingChannelId) {
    const existing = interaction.guild.channels.cache.get(existingChannelId);
    if (existing) {
      return interaction.reply({
        content: `❌ Tu as déjà un ticket ouvert : ${existing}`,
        ephemeral: true,
      });
    } else {
      openTickets.delete(interaction.user.id);
    }
  }

  const select = new StringSelectMenuBuilder()
    .setCustomId('ticket_reason')
    .setPlaceholder('Choisis une raison...')
    .addOptions(TICKET_REASONS);

  const row = new ActionRowBuilder().addComponents(select);

  await interaction.reply({
    content: '📋 **Sélectionne la raison de ton ticket :**',
    components: [row],
    ephemeral: true,
  });
}

async function handleTicketReason(interaction) {
  const reason = interaction.values[0];
  const reasonLabel = REASON_LABELS[reason] || reason;
  const guild = interaction.guild;
  const user  = interaction.user;

  // Récupérer tous les rôles staff (dont 🎫 Support)
  const staffRoleIds = getStaffRoles(guild);

  const categoryId = config.TICKET_CATEGORY_ID;

  // Permissions de base : @everyone bloqué, user autorisé
  const permissionOverwrites = [
    {
      id: guild.id,
      deny: [PermissionFlagsBits.ViewChannel],
    },
    {
      id: user.id,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ReadMessageHistory,
      ],
    },
  ];

  // Ajouter chaque rôle staff avec accès complet
  for (const roleId of staffRoleIds) {
    permissionOverwrites.push({
      id: roleId,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ReadMessageHistory,
        PermissionFlagsBits.ManageMessages,
      ],
    });
  }

  let ticketChannel;
  try {
    ticketChannel = await guild.channels.create({
      name: `ticket-${user.username.toLowerCase().replace(/[^a-z0-9]/g, '')}`,
      type: ChannelType.GuildText,
      parent: categoryId || null,
      permissionOverwrites,
      topic: `Ticket de ${user.tag} — Raison: ${reasonLabel}`,
    });
  } catch (err) {
    console.error('[TICKET] Erreur création :', err.message);
    return interaction.update({
      content: '❌ Impossible de créer le ticket. Vérifie les permissions du bot.',
      components: [],
    });
  }

  openTickets.set(user.id, ticketChannel.id);

  // Mention des rôles staff dans le salon du ticket
  const mentions = staffRoleIds.map(id => `<@&${id}>`).join(' ');

  const ticketEmbed = new EmbedBuilder()
    .setTitle(`🎟️ Ticket — ${reasonLabel}`)
    .setDescription(
      `Bonjour ${user} ! L'équipe va te répondre dès que possible.\n\n` +
      `**Raison :** ${reasonLabel}\n\n` +
      `> Décris ton problème en détail ci-dessous.`
    )
    .setColor(0x5865F2)
    .setTimestamp()
    .setFooter({ text: `Ticket de ${user.tag}` });

  const closeRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('ticket_close')
      .setLabel('🔒 Fermer le ticket')
      .setStyle(ButtonStyle.Danger)
  );

  await ticketChannel.send({
    content: mentions || '',
    embeds: [ticketEmbed],
    components: [closeRow],
  });

  await interaction.update({
    content: `✅ Ton ticket a été créé : ${ticketChannel}`,
    components: [],
  });

  await sendLog(guild, 'TICKET_OPEN', {
    user,
    channel: ticketChannel,
    reason: reasonLabel,
  });
}

async function handleTicketClose(interaction) {
  const channel = interaction.channel;
  const guild   = interaction.guild;

  // Vérifier que c'est bien un ticket
  if (!channel.name.startsWith('ticket-')) {
    return interaction.reply({
      content: '❌ Cette commande ne fonctionne que dans un ticket.',
      ephemeral: true,
    });
  }

  let ticketOwnerTag = 'Inconnu';
  let ticketOwnerId  = null;
  for (const [userId, channelId] of openTickets.entries()) {
    if (channelId === channel.id) {
      ticketOwnerId  = userId;
      const owner    = guild.members.cache.get(userId);
      if (owner) ticketOwnerTag = owner.user.tag;
      break;
    }
  }

  if (ticketOwnerId) openTickets.delete(ticketOwnerId);

  await interaction.reply({
    content: '🔒 Fermeture du ticket dans 5 secondes...',
    ephemeral: true,
  });

  await sendLog(guild, 'TICKET_CLOSE', {
    user: ticketOwnerTag,
    closedBy: interaction.user,
    reason: 'Ticket fermé par le staff',
  });

  setTimeout(async () => {
    await channel.delete('Ticket fermé').catch(() => {});
  }, 5000);
}

module.exports = {
  postTicketEmbed,
  handleTicketOpen,
  handleTicketReason,
  handleTicketClose,
};
