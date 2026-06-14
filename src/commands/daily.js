const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');
const { claimDaily, getBalance } = require('../systems/economy');

module.exports = {
  name: 'daily',
  description: 'Récupère tes diamants quotidiens gratuits',
  usage: '!daily',

  data: new SlashCommandBuilder()
    .setName('daily')
    .setDescription('Récupère tes diamants quotidiens gratuits 💎'),

  async run(message) {
    const result = claimDaily(message.author.id);
    await message.reply({ embeds: [buildEmbed(message.author, result)] });
  },

  async execute(interaction) {
    const result = claimDaily(interaction.user.id);
    await interaction.reply({ embeds: [buildEmbed(interaction.user, result)] });
  },
};

function buildEmbed(user, result) {
  if (result.success) {
    return new EmbedBuilder()
      .setTitle('💎 Diamants quotidiens !')
      .setDescription(`${user} a récupéré **+${result.reward} 💎** !\n\n💰 Solde total : **${result.balance} 💎**`)
      .setColor(0xf1c40f)
      .setFooter({ text: 'Reviens demain pour en récupérer d\'autres !' })
      .setTimestamp();
  }

  const hours   = Math.floor(result.next / 3600000);
  const minutes = Math.floor((result.next % 3600000) / 60000);
  return new EmbedBuilder()
    .setTitle('⏰ Déjà récupéré !')
    .setDescription(
      `Tu as déjà récupéré tes diamants aujourd'hui.\n\n` +
      `⏳ Prochain daily dans : **${hours}h ${minutes}m**\n` +
      `💎 Solde actuel : **${getBalance(user.id)} 💎**`
    )
    .setColor(0xe74c3c);
}
