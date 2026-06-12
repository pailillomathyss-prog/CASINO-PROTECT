const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { sendLog } = require('../systems/logs');

async function execute(moderator, channel, guild, reply) {
  await channel.permissionOverwrites.edit(guild.id, { SendMessages: null });

  const embed = new EmbedBuilder()
    .setTitle('🔓 Salon déverrouillé')
    .setDescription(`Ce salon a été déverrouillé par ${moderator}.`)
    .setColor(0x44FF44)
    .setTimestamp();

  await reply({ embeds: [embed] });
  await sendLog(guild, 'UNLOCK', { channel, moderator });
}

module.exports = {
  name: 'unlock',
  description: 'Déverrouiller le salon actuel',
  usage: '!unlock',
  permissions: [PermissionFlagsBits.ManageChannels],

  data: new SlashCommandBuilder()
    .setName('unlock')
    .setDescription('Déverrouiller le salon actuel')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

  async run(message) {
    try {
      await execute(message.author, message.channel, message.guild, r =>
        typeof r === 'string' ? message.reply(r) : message.reply(r)
      );
    } catch (err) { message.reply(`❌ ${err.message}`); }
  },

  async execute(interaction) {
    try {
      await execute(interaction.user, interaction.channel, interaction.guild, r =>
        interaction.reply(typeof r === 'string' ? { content: r, ephemeral: false } : r)
      );
    } catch (err) { interaction.reply({ content: `❌ ${err.message}`, ephemeral: true }); }
  },
};
