const { SlashCommandBuilder } = require('discord.js');
const { openScratchChannel, sendScratchCard } = require('../systems/scratchcard');
const { getBalance, hasFunds, SCRATCH_COST } = require('../systems/economy');

module.exports = {
  name: 'gratter',
  description: 'Ouvre un ticket à gratter dans un salon privé',
  usage: '!gratter',

  data: new SlashCommandBuilder()
    .setName('gratter')
    .setDescription('Ouvre un ticket à gratter (coût : 20 💎)'),

  async run(message) {
    if (!hasFunds(message.author.id, SCRATCH_COST)) {
      return message.reply(
        `❌ Tu n'as pas assez de 💎 !\n` +
        `💎 Ton solde : **${getBalance(message.author.id)} 💎** | Requis : **${SCRATCH_COST} 💎**\n` +
        `> Utilise \`!daily\` pour récupérer des diamants gratuits.`
      );
    }

    const { channel, isNew } = await openScratchChannel(message.guild, message.author);

    if (!isNew) {
      return message.reply(`🎴 Tu as déjà un salon ouvert : ${channel}`);
    }

    await sendScratchCard(channel, message.author);
    await message.reply(`🎴 Ton salon de grattage est prêt : ${channel}`);
  },

  async execute(interaction) {
    if (!hasFunds(interaction.user.id, SCRATCH_COST)) {
      return interaction.reply({
        content:
          `❌ Tu n'as pas assez de 💎 !\n` +
          `💎 Ton solde : **${getBalance(interaction.user.id)} 💎** | Requis : **${SCRATCH_COST} 💎**\n` +
          `> Utilise \`/daily\` pour récupérer des diamants gratuits.`,
        ephemeral: true,
      });
    }

    const { channel, isNew } = await openScratchChannel(interaction.guild, interaction.user);

    if (!isNew) {
      return interaction.reply({ content: `🎴 Tu as déjà un salon ouvert : ${channel}`, ephemeral: true });
    }

    await sendScratchCard(channel, interaction.user);
    await interaction.reply({ content: `🎴 Ton salon de grattage est prêt : ${channel}`, ephemeral: true });
  },
};
