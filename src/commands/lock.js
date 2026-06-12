const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { sendLog } = require('../systems/logs');

async function execute(moderator, channel, reason, guild, reply) {
  await channel.permissionOverwrites.edit(guild.id, { SendMessages: false });

  const embed = new EmbedBuilder()
    .setTitle('🔒 Salon verrouillé')
    .setDescription(`Ce salon a été verrouillé par ${moderator}.`)
    .setColor(0xFF4444)
    .addFields({ name: '📝 Raison', value: reason })
    .setTimestamp();

  await reply({ embeds: [embed] });
  await sendLog(guild, 'LOCK', { channel, moderator, reason });
}

module.exports = {
  name: 'lock',
  description: 'Verrouiller le salon actuel',
  usage: '!lock [raison]',
  permissions: [PermissionFlagsBits.ManageChannels],

  data: new SlashCommandBuilder()
    .setName('lock')
    .setDescription('Verrouiller le salon actuel')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
    .addStringOption(o => o.setName('raison').setDescription('Raison').setRequired(false)),

  async run(message, args) {
    const reason = args.join(' ') || 'Aucune raison fournie';
    try {
      await execute(message.author, message.channel, reason, message.guild, r =>
        typeof r === 'string' ? message.reply(r) : message.reply(r)
      );
    } catch (err) { message.reply(`❌ ${err.message}`); }
  },

  async execute(interaction) {
    const reason = interaction.options.getString('raison') || 'Aucune raison fournie';
    try {
      await execute(interaction.user, interaction.channel, reason, interaction.guild, r =>
        interaction.reply(typeof r === 'string' ? { content: r, ephemeral: false } : r)
      );
    } catch (err) { interaction.reply({ content: `❌ ${err.message}`, ephemeral: true }); }
  },
};
