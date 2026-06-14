const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');
const { getBalance, SCRATCH_COST, GACHA_COST } = require('../systems/economy');

module.exports = {
  name: 'diamonds',
  description: 'Voir ton solde de diamants 💎',
  usage: '!diamonds [@membre]',

  data: new SlashCommandBuilder()
    .setName('diamonds')
    .setDescription('Voir ton solde de diamants 💎')
    .addUserOption(o => o.setName('membre').setDescription('Voir le solde d\'un autre membre').setRequired(false)),

  async run(message, args) {
    const target = message.mentions.users.first() || message.author;
    await message.reply({ embeds: [buildEmbed(target)] });
  },

  async execute(interaction) {
    const target = interaction.options.getUser('membre') || interaction.user;
    await interaction.reply({ embeds: [buildEmbed(target)], ephemeral: false });
  },
};

function buildEmbed(user) {
  const balance = getBalance(user.id);
  return new EmbedBuilder()
    .setAuthor({ name: user.tag, iconURL: user.displayAvatarURL() })
    .setTitle('💎 Solde de Diamants')
    .setDescription(
      `💎 **${balance} diamants**\n\n` +
      `**Coûts :**\n` +
      `• 🎴 Ticket à gratter : **${SCRATCH_COST} 💎**\n` +
      `• 🎲 Gacha : **${GACHA_COST} 💎**\n\n` +
      `> Utilise \`!daily\` pour gagner des diamants gratuits chaque jour !`
    )
    .setColor(0x3498db)
    .setTimestamp();
}
