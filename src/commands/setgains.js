const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ChannelType } = require('discord.js');
const { set } = require('../systems/guildConfig');

module.exports = {
  name: 'setgains',
  description: 'Choisir le salon où les gains/pertes du casino sont affichés (Admin)',
  usage: '!setgains #salon',

  data: new SlashCommandBuilder()
    .setName('setgains')
    .setDescription('Choisir le salon gains/pertes du casino (Admin)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addChannelOption(o => o
      .setName('salon')
      .setDescription('Salon où les résultats seront postés')
      .addChannelTypes(ChannelType.GuildText)
      .setRequired(true)
    ),

  async run(message, args) {
    if (!message.member.permissions.has(PermissionFlagsBits.Administrator))
      return message.reply('❌ Commande réservée aux administrateurs.');

    const channel = message.mentions.channels.first();
    if (!channel) return message.reply('❌ Mentionne un salon : `!setgains #salon`');

    set(message.guild.id, 'gainsChannelId', channel.id);
    await message.reply({ embeds: [buildEmbed(channel)] });
    await message.delete().catch(() => {});
  },

  async execute(interaction) {
    const channel = interaction.options.getChannel('salon');
    set(interaction.guild.id, 'gainsChannelId', channel.id);
    await interaction.reply({ embeds: [buildEmbed(channel)], ephemeral: true });
  },
};

function buildEmbed(channel) {
  return new EmbedBuilder()
    .setTitle('📊 Salon gains/pertes configuré !')
    .setDescription(
      `Les résultats du casino seront désormais postés dans ${channel}.\n\n` +
      `> 🎴 Tickets à gratter\n` +
      `> 🎲 Tirages gacha\n\n` +
      `*Utilise à nouveau \`!setgains\` pour changer de salon.*`
    )
    .setColor(0x2ecc71)
    .setTimestamp();
}
