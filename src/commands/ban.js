const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { sendLog } = require('../systems/logs');

async function execute(moderator, target, reason, guild, reply) {
  if (!target) return reply('❌ Membre introuvable.');
  if (!target.bannable) return reply('❌ Je ne peux pas bannir ce membre (rôle supérieur au mien).');

  await target.ban({ reason: `${moderator.tag} : ${reason}` });

  const embed = new EmbedBuilder()
    .setTitle('🔨 Membre banni')
    .setColor(0xFF0000)
    .addFields(
      { name: '👤 Membre', value: `${target.user.tag}`, inline: true },
      { name: '🛡️ Modérateur', value: `${moderator.tag}`, inline: true },
      { name: '📝 Raison', value: reason }
    )
    .setTimestamp();

  await reply({ embeds: [embed] });
  await sendLog(guild, 'BAN', { target: target.user, moderator, reason });
}

module.exports = {
  name: 'ban',
  description: 'Bannir un membre du serveur',
  usage: '!ban @membre [raison]',
  permissions: [PermissionFlagsBits.BanMembers],

  data: new SlashCommandBuilder()
    .setName('ban')
    .setDescription('Bannir un membre du serveur')
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
    .addUserOption(o => o.setName('membre').setDescription('Membre à bannir').setRequired(true))
    .addStringOption(o => o.setName('raison').setDescription('Raison').setRequired(false)),

  async run(message, args) {
    const target = message.mentions.members.first();
    const reason = args.slice(1).join(' ') || 'Aucune raison fournie';
    if (!target) return message.reply('❌ Mentionne un membre. Ex: `!ban @membre raison`');
    if (target.id === message.author.id) return message.reply('❌ Tu ne peux pas te bannir toi-même.');
    try {
      await execute(message.author, target, reason, message.guild, r =>
        typeof r === 'string' ? message.reply(r) : message.reply(r)
      );
    } catch (err) { message.reply(`❌ ${err.message}`); }
  },

  async execute(interaction) {
    const target = interaction.options.getMember('membre');
    const reason = interaction.options.getString('raison') || 'Aucune raison fournie';
    if (target?.id === interaction.user.id) return interaction.reply({ content: '❌ Tu ne peux pas te bannir toi-même.', ephemeral: true });
    try {
      await execute(interaction.user, target, reason, interaction.guild, r =>
        interaction.reply(typeof r === 'string' ? { content: r, ephemeral: true } : { ...r, ephemeral: true })
      );
    } catch (err) { interaction.reply({ content: `❌ ${err.message}`, ephemeral: true }); }
  },
};
