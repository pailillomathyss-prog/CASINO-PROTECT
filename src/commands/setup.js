const { PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { postReglementEmbed } = require('../systems/reglement');
const { postTicketEmbed } = require('../systems/ticket');
const { setupChannelPermissions } = require('../systems/roleManager');
const config = require('../config');

module.exports = {
  name: 'setup',
  description: 'Configurer le bot (admin uniquement)',
  usage: '!setup <reglement|ticket|permissions>',
  permissions: [PermissionFlagsBits.Administrator],

  async run(message, args) {
    const sub = args[0]?.toLowerCase();

    if (!sub || !['reglement', 'ticket', 'permissions'].includes(sub)) {
      return message.reply('❌ Utilise `!setup reglement`, `!setup ticket` ou `!setup permissions`');
    }

    if (sub === 'reglement') {
      const channel = config.REGLEMENT_CHANNEL_ID
        ? message.guild.channels.cache.get(config.REGLEMENT_CHANNEL_ID)
        : message.channel;
      if (!channel) return message.reply('❌ Salon règlement introuvable. Vérifie `REGLEMENT_CHANNEL_ID`.');
      await postReglementEmbed(channel);
      return message.reply(`✅ Embed règlement posté dans ${channel} !`);
    }

    if (sub === 'ticket') {
      const channel = config.TICKET_CHANNEL_ID
        ? message.guild.channels.cache.get(config.TICKET_CHANNEL_ID)
        : message.channel;
      if (!channel) return message.reply('❌ Salon ticket introuvable. Vérifie `TICKET_CHANNEL_ID`.');
      await postTicketEmbed(channel);
      return message.reply(`✅ Embed ticket posté dans ${channel} !`);
    }

    if (sub === 'permissions') {
      const processing = await message.reply('⏳ Configuration des permissions en cours, patiente...');

      try {
        const { verifiedRole, success, errors } = await setupChannelPermissions(
          message.guild,
          config.REGLEMENT_CHANNEL_ID
        );

        const embed = new EmbedBuilder()
          .setTitle('🔒 Permissions configurées')
          .setColor(0x57F287)
          .setDescription(
            `Le serveur est maintenant en **mode vérification** !\n\n` +
            `Les membres doivent accepter le règlement dans <#${config.REGLEMENT_CHANNEL_ID || 'salon règlement'}> pour accéder au serveur.`
          )
          .addFields(
            { name: '✅ Rôle vérifié', value: `${verifiedRole}`, inline: true },
            { name: '📢 Salons modifiés', value: `${success}`, inline: true },
            { name: '❌ Erreurs', value: `${errors}`, inline: true },
          )
          .addFields({
            name: '⚠️ Important',
            value: 'Vérifie que le rôle du bot est **au-dessus** du rôle "✅ Vérifié" dans **Paramètres → Rôles**.'
          })
          .setTimestamp();

        await processing.edit({ content: '', embeds: [embed] });
      } catch (err) {
        await processing.edit(`❌ Erreur lors de la configuration : ${err.message}`);
      }
    }
  },
};
