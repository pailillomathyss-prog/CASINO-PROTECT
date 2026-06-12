const { EmbedBuilder } = require('discord.js');
const config = require('../config');

const COLORS = {
  BAN: 0xFF0000,
  UNBAN: 0x00FF00,
  MUTE: 0xFF8800,
  UNMUTE: 0x00FFAA,
  LOCK: 0xFF4444,
  UNLOCK: 0x44FF44,
  TICKET_OPEN: 0x5865F2,
  TICKET_CLOSE: 0x99AAB5,
  ANTILINK: 0xFFCC00,
  ANTISPAM: 0xFFAA00,
  ANTIRAID: 0xFF0000,
  REGLEMENT: 0x57F287,
};

async function sendLog(guild, type, data) {
  if (!config.LOGS_CHANNEL_ID) return;

  const channel = guild.channels.cache.get(config.LOGS_CHANNEL_ID);
  if (!channel) return;

  const embed = new EmbedBuilder()
    .setColor(COLORS[type] || 0x5865F2)
    .setTimestamp()
    .setFooter({ text: `📋 Logs • ${guild.name}` });

  switch (type) {
    case 'BAN':
      embed.setTitle('🔨 Membre Banni')
        .addFields(
          { name: '👤 Membre', value: `${data.target} (${data.target.id})`, inline: true },
          { name: '🛡️ Modérateur', value: `${data.moderator}`, inline: true },
          { name: '📝 Raison', value: data.reason || 'Aucune raison fournie', inline: false }
        );
      break;

    case 'UNBAN':
      embed.setTitle('✅ Membre Débanni')
        .addFields(
          { name: '👤 Utilisateur', value: `${data.target} (${data.targetId})`, inline: true },
          { name: '🛡️ Modérateur', value: `${data.moderator}`, inline: true },
          { name: '📝 Raison', value: data.reason || 'Aucune raison fournie', inline: false }
        );
      break;

    case 'MUTE':
      embed.setTitle('🔇 Membre Réduit au Silence')
        .addFields(
          { name: '👤 Membre', value: `${data.target} (${data.target.id})`, inline: true },
          { name: '🛡️ Modérateur', value: `${data.moderator}`, inline: true },
          { name: '⏱️ Durée', value: data.duration || 'Indéfinie', inline: true },
          { name: '📝 Raison', value: data.reason || 'Aucune raison fournie', inline: false }
        );
      break;

    case 'UNMUTE':
      embed.setTitle('🔊 Membre Démute')
        .addFields(
          { name: '👤 Membre', value: `${data.target} (${data.target.id})`, inline: true },
          { name: '🛡️ Modérateur', value: `${data.moderator}`, inline: true },
          { name: '📝 Raison', value: data.reason || 'Aucune raison fournie', inline: false }
        );
      break;

    case 'LOCK':
      embed.setTitle('🔒 Salon Verrouillé')
        .addFields(
          { name: '📢 Salon', value: `${data.channel}`, inline: true },
          { name: '🛡️ Modérateur', value: `${data.moderator}`, inline: true },
          { name: '📝 Raison', value: data.reason || 'Aucune raison fournie', inline: false }
        );
      break;

    case 'UNLOCK':
      embed.setTitle('🔓 Salon Déverrouillé')
        .addFields(
          { name: '📢 Salon', value: `${data.channel}`, inline: true },
          { name: '🛡️ Modérateur', value: `${data.moderator}`, inline: true }
        );
      break;

    case 'TICKET_OPEN':
      embed.setTitle('🎟️ Ticket Ouvert')
        .addFields(
          { name: '👤 Utilisateur', value: `${data.user} (${data.user.id})`, inline: true },
          { name: '📂 Salon', value: `${data.channel}`, inline: true },
          { name: '📝 Raison', value: data.reason, inline: false }
        );
      break;

    case 'TICKET_CLOSE':
      embed.setTitle('🔒 Ticket Fermé')
        .addFields(
          { name: '👤 Utilisateur', value: `${data.user}`, inline: true },
          { name: '🛡️ Fermé par', value: `${data.closedBy}`, inline: true },
          { name: '📝 Raison', value: data.reason || 'Fermé', inline: false }
        );
      break;

    case 'ANTILINK':
      embed.setTitle('🔗 Lien Supprimé')
        .addFields(
          { name: '👤 Auteur', value: `${data.author} (${data.author.id})`, inline: true },
          { name: '📢 Salon', value: `${data.channel}`, inline: true },
          { name: '🔗 Lien', value: `\`${data.link.substring(0, 200)}\``, inline: false }
        );
      break;

    case 'ANTISPAM':
      embed.setTitle('🚫 Spam Détecté')
        .addFields(
          { name: '👤 Auteur', value: `${data.author} (${data.author.id})`, inline: true },
          { name: '📢 Salon', value: `${data.channel}`, inline: true },
          { name: '⏱️ Sanction', value: 'Réduit au silence 5 minutes', inline: false }
        );
      break;

    case 'ANTIRAID':
      embed.setTitle('⚠️ RAID DÉTECTÉ')
        .setColor(0xFF0000)
        .addFields(
          { name: '🌊 Vagues détectées', value: `${data.count} jointures en moins de ${data.window}s`, inline: false },
          { name: '🛡️ Action', value: 'Niveau de vérification augmenté', inline: false }
        );
      break;

    case 'REGLEMENT':
      embed.setTitle('📜 Règlement Accepté')
        .addFields(
          { name: '👤 Utilisateur', value: `${data.user} (${data.user.id})`, inline: true },
          { name: '✅ Rôle attribué', value: `<@&${data.roleId}>`, inline: true }
        );
      break;
  }

  await channel.send({ embeds: [embed] }).catch(() => {});
}

module.exports = { sendLog };
