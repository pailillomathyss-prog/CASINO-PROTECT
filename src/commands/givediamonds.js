const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { addDiamonds, getBalance } = require('../systems/economy');

module.exports = {
  name: 'givediamonds',
  description: 'Donner des diamants à un membre (Admin uniquement)',
  usage: '!givediamonds [@membre] <montant>',

  data: new SlashCommandBuilder()
    .setName('givediamonds')
    .setDescription('Donner des diamants à un membre (Admin uniquement)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addIntegerOption(o => o
      .setName('montant')
      .setDescription('Nombre de diamants à donner (négatif pour retirer)')
      .setRequired(true)
    )
    .addUserOption(o => o
      .setName('membre')
      .setDescription('Membre cible (défaut : toi-même)')
      .setRequired(false)
    ),

  async run(message, args) {
    if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return message.reply('❌ Commande réservée aux administrateurs.');
    }

    const target  = message.mentions.users.first() || message.author;
    const amount  = parseInt(args.find(a => !a.startsWith('<@')));

    if (isNaN(amount) || amount === 0) {
      return message.reply('❌ Usage : `!givediamonds [@membre] <montant>`\n> Ex : `!givediamonds @Joueur 500` ou `!givediamonds 200`');
    }

    const newBalance = addDiamonds(target.id, amount);
    await message.reply({ embeds: [buildEmbed(message.author, target, amount, newBalance)] });
  },

  async execute(interaction) {
    const amount  = interaction.options.getInteger('montant');
    const target  = interaction.options.getUser('membre') || interaction.user;

    const newBalance = addDiamonds(target.id, amount);
    await interaction.reply({ embeds: [buildEmbed(interaction.user, target, amount, newBalance)], ephemeral: true });
  },
};

function buildEmbed(admin, target, amount, newBalance) {
  const giving = amount > 0;
  return new EmbedBuilder()
    .setTitle(giving ? '💎 Diamants ajoutés !' : '💸 Diamants retirés !')
    .setDescription(
      `**Admin :** ${admin}\n` +
      `**Membre :** ${target}\n\n` +
      `${giving ? '➕' : '➖'} **${Math.abs(amount)} 💎** ${giving ? 'ajoutés' : 'retirés'}\n` +
      `💰 Nouveau solde de ${target.username} : **${newBalance} 💎**`
    )
    .setColor(giving ? 0x2ecc71 : 0xe74c3c)
    .setTimestamp();
}
