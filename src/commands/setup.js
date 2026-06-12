const { PermissionFlagsBits } = require('discord.js');
const { postReglementEmbed } = require('../systems/reglement');
const { postTicketEmbed } = require('../systems/ticket');
const config = require('../config');

module.exports = {
  name: 'setup',
  description: 'Configurer les embeds du bot',
  usage: '!setup <reglement|ticket>',
  permissions: [PermissionFlagsBits.Administrator],

  async run(message, args) {
    const sub = args[0]?.toLowerCase();

    if (!sub || !['reglement', 'ticket'].includes(sub)) {
      return message.reply('❌ Utilise `!setup reglement` ou `!setup ticket`');
    }

    if (sub === 'reglement') {
      const channel = config.REGLEMENT_CHANNEL_ID
        ? message.guild.channels.cache.get(config.REGLEMENT_CHANNEL_ID)
        : message.channel;

      if (!channel) return message.reply('❌ Salon du règlement introuvable. Vérifie `REGLEMENT_CHANNEL_ID`.');
      await postReglementEmbed(channel);
      return message.reply(`✅ Embed du règlement posté dans ${channel} !`);
    }

    if (sub === 'ticket') {
      const channel = config.TICKET_CHANNEL_ID
        ? message.guild.channels.cache.get(config.TICKET_CHANNEL_ID)
        : message.channel;

      if (!channel) return message.reply('❌ Salon des tickets introuvable. Vérifie `TICKET_CHANNEL_ID`.');
      await postTicketEmbed(channel);
      return message.reply(`✅ Embed des tickets posté dans ${channel} !`);
    }
  },
};
