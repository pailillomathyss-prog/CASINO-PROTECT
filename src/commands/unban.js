const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { sendLog } = require('../systems/logs');

async function execute(moderator, userId, reason, guild, reply) {
  const ban = await guild.bans.fetch(userId).catch(() => null);
  if (!ban) return reply('❌ Cet utilisateur n\'est pas banni.');

  await guild.members.unban(userId, `${moderator.tag} : ${reason}`);

  const embed = new EmbedBuilder()
    .setTitle('✅ Membre débanni')
    .setColor(0x00FF00)
    .addFields(
      { name: '👤 Utilisateur', value: `${ban.user.tag} (${userId})`, inline: true },
      { name: '🛡️ Modérateur', value: `${moderator.tag}`, inline: true },
      { name: '📝 Raison', value: reason }
    )
    .setTimestamp();

  await reply({ embeds: [embed] });
  await sendLog(guild, 'UNBAN', { target: ban.user.tag, targetId: userId, moderator, reason });
}

module.exports = {
  name: 'unban',
  description: 'Débannir un utilisateur par ID',
  usage: '!unban <ID> [raison]',
  permissions: [PermissionFlagsBits.BanMembers],

  data: new SlashCommandBuilder()
    .setName('unban')
    .setDescription('Débannir un utilisateur par ID')
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
    .addStringOption(o => o.setName('user_id').setDescription('ID de l\'utilisateur').setRequired(true))
    .addStringOption(o => o.setName('raison').setDescription('Raison').setRequired(false)),

  async run(message, args) {
    const userId = args[0];
    const reason = args.slice(1).join(' ') || 'Aucune raison fournie';
    if (!userId) return message.reply('❌ Fournis un ID. Ex: `!unban 123456789`');
    try {
      await execute(message.author, userId, reason, message.guild, r =>
        typeof r === 'string' ? message.reply(r) : message.reply(r)
      );
    } catch (err) { message.reply(`❌ ${err.message}`); }
  },

  async execute(interaction) {
    const userId = interaction.options.getString('user_id');
    const reason = interaction.options.getString('raison') || 'Aucune raison fournie';
    try {
      await execute(interaction.user, userId, reason, interaction.guild, r =>
        interaction.reply(typeof r === 'string' ? { content: r, ephemeral: true } : { ...r, ephemeral: true })
      );
    } catch (err) { interaction.reply({ content: `❌ ${err.message}`, ephemeral: true }); }
  },
};
