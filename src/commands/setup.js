const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { postReglementEmbed } = require('../systems/reglement');
const { postTicketEmbed } = require('../systems/ticket');
const { setupChannelPermissions } = require('../systems/roleManager');
const config = require('../config');

async function runSetup(sub, guild, replyFn, targetChannel) {
  if (sub === 'reglement') {
    await postReglementEmbed(targetChannel);
    await replyFn(`✅ Embed règlement posté dans ${targetChannel} !`);
  } else if (sub === 'ticket') {
    await postTicketEmbed(targetChannel);
    await replyFn(`✅ Embed ticket posté dans ${targetChannel} !`);
  } else if (sub === 'permissions') {
    const { verifiedRole, success, errors } = await setupChannelPermissions(guild, config.REGLEMENT_CHANNEL_ID);
    const embed = new EmbedBuilder()
      .setTitle('🔒 Permissions configurées')
      .setColor(0x57F287)
      .setDescription(`Le serveur est en **mode vérification** !\nLes membres doivent accepter le règlement pour accéder aux salons.`)
      .addFields(
        { name: '✅ Rôle vérifié', value: `${verifiedRole}`, inline: true },
        { name: '📢 Salons modifiés', value: `${success}`, inline: true },
        { name: '❌ Erreurs', value: `${errors}`, inline: true },
        { name: '⚠️ Important', value: 'Le rôle du bot doit être **au-dessus** du rôle "✅ Vérifié" dans **Paramètres → Rôles**.' }
      )
      .setTimestamp();
    await replyFn({ embeds: [embed] });
  }
}

module.exports = {
  name: 'setup',
  description: 'Configurer le bot (admin uniquement)',
  usage: '!setup <reglement|ticket|permissions>',
  permissions: [PermissionFlagsBits.Administrator],

  data: new SlashCommandBuilder()
    .setName('setup')
    .setDescription('Configurer le bot (admin uniquement)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(s => s.setName('reglement').setDescription('Poster l\'embed règlement'))
    .addSubcommand(s => s.setName('ticket').setDescription('Poster l\'embed tickets'))
    .addSubcommand(s => s.setName('permissions').setDescription('Cacher les salons aux non-vérifiés')),

  async run(message, args) {
    const sub = args[0]?.toLowerCase();
    if (!sub || !['reglement', 'ticket', 'permissions'].includes(sub))
      return message.reply('❌ Utilise `!setup reglement`, `!setup ticket` ou `!setup permissions`');

    const getChannel = (id) => id ? message.guild.channels.cache.get(id) : message.channel;

    let targetChannel;
    if (sub === 'reglement') targetChannel = getChannel(config.REGLEMENT_CHANNEL_ID);
    if (sub === 'ticket') targetChannel = getChannel(config.TICKET_CHANNEL_ID);
    if (targetChannel === undefined && sub !== 'permissions')
      return message.reply('❌ Salon introuvable. Vérifie tes variables d\'environnement.');

    const processing = sub === 'permissions' ? await message.reply('⏳ Configuration en cours...') : null;
    try {
      await runSetup(sub, message.guild, r =>
        processing ? processing.edit(typeof r === 'string' ? r : { content: '', ...r }) : message.reply(r),
        targetChannel
      );
    } catch (err) {
      const msg = `❌ Erreur : ${err.message}`;
      processing ? processing.edit(msg) : message.reply(msg);
    }
  },

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    await interaction.deferReply({ ephemeral: true });

    const getChannel = (id) => id ? interaction.guild.channels.cache.get(id) : interaction.channel;
    let targetChannel;
    if (sub === 'reglement') targetChannel = getChannel(config.REGLEMENT_CHANNEL_ID);
    if (sub === 'ticket') targetChannel = getChannel(config.TICKET_CHANNEL_ID);

    try {
      await runSetup(sub, interaction.guild, r =>
        interaction.editReply(typeof r === 'string' ? { content: r } : r),
        targetChannel
      );
    } catch (err) {
      interaction.editReply(`❌ Erreur : ${err.message}`);
    }
  },
};
