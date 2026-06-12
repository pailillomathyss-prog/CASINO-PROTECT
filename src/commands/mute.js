const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { sendLog } = require('../systems/logs');

const DURATIONS = {
  '1m': 60 * 1000,
  '5m': 5 * 60 * 1000,
  '10m': 10 * 60 * 1000,
  '30m': 30 * 60 * 1000,
  '1h': 60 * 60 * 1000,
  '12h': 12 * 60 * 60 * 1000,
  '24h': 24 * 60 * 60 * 1000,
  '7j': 7 * 24 * 60 * 60 * 1000,
};

async function execute(moderator, target, dureeKey, reason, guild, reply) {
  const durationMs = DURATIONS[dureeKey];
  if (!target) return reply('❌ Membre introuvable.');
  if (!durationMs) return reply(`❌ Durée invalide. Utilise : ${Object.keys(DURATIONS).join(', ')}`);
  if (!target.moderatable) return reply('❌ Je ne peux pas muter ce membre.');

  await target.timeout(durationMs, `${moderator.tag} : ${reason}`);

  const embed = new EmbedBuilder()
    .setTitle('🔇 Membre mute')
    .setColor(0xFF8800)
    .addFields(
      { name: '👤 Membre', value: `${target.user.tag}`, inline: true },
      { name: '🛡️ Modérateur', value: `${moderator.tag}`, inline: true },
      { name: '⏱️ Durée', value: dureeKey, inline: true },
      { name: '📝 Raison', value: reason }
    )
    .setTimestamp();

  await reply({ embeds: [embed] });
  await sendLog(guild, 'MUTE', { target: target.user, moderator, duration: dureeKey, reason });
}

module.exports = {
  name: 'mute',
  description: 'Réduire au silence un membre',
  usage: '!mute @membre <1m|5m|10m|30m|1h|12h|24h|7j> [raison]',
  permissions: [PermissionFlagsBits.ModerateMembers],

  data: new SlashCommandBuilder()
    .setName('mute')
    .setDescription('Réduire au silence un membre')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption(o => o.setName('membre').setDescription('Membre à muter').setRequired(true))
    .addStringOption(o => o.setName('duree').setDescription('Durée').setRequired(true)
      .addChoices(
        { name: '1 minute', value: '1m' }, { name: '5 minutes', value: '5m' },
        { name: '10 minutes', value: '10m' }, { name: '30 minutes', value: '30m' },
        { name: '1 heure', value: '1h' }, { name: '12 heures', value: '12h' },
        { name: '24 heures', value: '24h' }, { name: '7 jours', value: '7j' }
      ))
    .addStringOption(o => o.setName('raison').setDescription('Raison').setRequired(false)),

  async run(message, args) {
    const target = message.mentions.members.first();
    const dureeKey = args[1]?.toLowerCase();
    const reason = args.slice(2).join(' ') || 'Aucune raison fournie';
    if (!target) return message.reply('❌ Mentionne un membre. Ex: `!mute @membre 10m spam`');
    if (target.id === message.author.id) return message.reply('❌ Tu ne peux pas te muter toi-même.');
    try {
      await execute(message.author, target, dureeKey, reason, message.guild, r =>
        typeof r === 'string' ? message.reply(r) : message.reply(r)
      );
    } catch (err) { message.reply(`❌ ${err.message}`); }
  },

  async execute(interaction) {
    const target = interaction.options.getMember('membre');
    const dureeKey = interaction.options.getString('duree');
    const reason = interaction.options.getString('raison') || 'Aucune raison fournie';
    if (target?.id === interaction.user.id) return interaction.reply({ content: '❌ Tu ne peux pas te muter toi-même.', ephemeral: true });
    try {
      await execute(interaction.user, target, dureeKey, reason, interaction.guild, r =>
        interaction.reply(typeof r === 'string' ? { content: r, ephemeral: true } : { ...r, ephemeral: true })
      );
    } catch (err) { interaction.reply({ content: `❌ ${err.message}`, ephemeral: true }); }
  },
};
