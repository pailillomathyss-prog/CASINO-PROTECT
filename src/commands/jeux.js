const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
} = require('discord.js');
const { buildEconomyRow } = require('../systems/gacha');
const { SCRATCH_COST, GACHA_COST } = require('../systems/economy');

module.exports = {
  name: 'jeux',
  description: 'Poster le panneau de jeux dans un salon (Admin)',
  usage: '!jeux [#salon]',

  data: new SlashCommandBuilder()
    .setName('jeux')
    .setDescription('Poster le panneau de jeux casino dans un salon (Admin)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addChannelOption(o => o
      .setName('salon')
      .setDescription('Salon où poster le panneau (défaut : salon actuel)')
      .addChannelTypes(ChannelType.GuildText)
      .setRequired(false)
    ),

  async run(message, args) {
    if (!message.member.permissions.has(PermissionFlagsBits.Administrator))
      return message.reply('❌ Commande réservée aux administrateurs.');

    const target = message.mentions.channels.first() || message.channel;
    await postPanel(target);
    const confirm = await message.reply(`✅ Panneau de jeux posté dans ${target} !`);
    setTimeout(() => confirm.delete().catch(() => {}), 5000);
    await message.delete().catch(() => {});
  },

  async execute(interaction) {
    const target = interaction.options.getChannel('salon') || interaction.channel;
    await interaction.deferReply({ ephemeral: true });
    await postPanel(target);
    await interaction.editReply(`✅ Panneau de jeux posté dans ${target} !`);
  },
};

async function postPanel(channel) {
  const embed = new EmbedBuilder()
    .setTitle('🎰 CASINO')
    .setDescription(
      `Bienvenue ! Choisis ton activité :\n\n` +
      `🎴 **Ticket à gratter** — ${SCRATCH_COST} 💎\n` +
      `> Gratte 3 cases, gagne jusqu'à **500 💎**\n\n` +
      `🎲 **Gacha** — ${GACHA_COST} 💎\n` +
      `> Tire un rôle exclusif au hasard\n\n` +
      `💎 **Mon solde** — Gratuit\n` +
      `> Consulte tes diamants en temps réel\n\n` +
      `🎁 **Daily gratuit** — 1x par jour\n` +
      `> Récupère entre **50 et 200 💎** gratuitement`
    )
    .setColor(0xf1c40f)
    .setFooter({ text: 'Clique sur un bouton pour jouer !' })
    .setTimestamp();

  await channel.send({
    embeds: [embed],
    components: [
      new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('casino_start_scratch').setLabel('🎴 Ticket à gratter').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId('gacha_pull').setLabel('🎲 Gacha').setStyle(ButtonStyle.Primary),
      ),
      buildEconomyRow(),
    ],
  });
}
