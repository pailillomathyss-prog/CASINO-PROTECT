const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { postReglementEmbed } = require('../systems/reglement');
const { postTicketEmbed } = require('../systems/ticket');
const config = require('../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setup')
    .setDescription('Configurer les embeds du bot (admin uniquement)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(sub =>
      sub.setName('reglement').setDescription('Poster l\'embed du règlement dans 📜・règlement')
    )
    .addSubcommand(sub =>
      sub.setName('ticket').setDescription('Poster l\'embed des tickets dans 🎟️・ticket')
    ),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();

    if (sub === 'reglement') {
      const channelId = config.REGLEMENT_CHANNEL_ID;
      const channel = channelId
        ? interaction.guild.channels.cache.get(channelId)
        : interaction.channel;

      if (!channel) {
        return interaction.reply({
          content: '❌ Salon du règlement introuvable. Vérifie REGLEMENT_CHANNEL_ID dans ta config.',
          ephemeral: true,
        });
      }

      await postReglementEmbed(channel);
      await interaction.reply({ content: `✅ Embed du règlement posté dans ${channel} !`, ephemeral: true });
    }

    if (sub === 'ticket') {
      const channelId = config.TICKET_CHANNEL_ID;
      const channel = channelId
        ? interaction.guild.channels.cache.get(channelId)
        : interaction.channel;

      if (!channel) {
        return interaction.reply({
          content: '❌ Salon des tickets introuvable. Vérifie TICKET_CHANNEL_ID dans ta config.',
          ephemeral: true,
        });
      }

      await postTicketEmbed(channel);
      await interaction.reply({ content: `✅ Embed des tickets posté dans ${channel} !`, ephemeral: true });
    }
  },
};
