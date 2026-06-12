const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'help',
  description: 'Afficher toutes les commandes disponibles',
  usage: '!help',
  permissions: [],

  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Afficher toutes les commandes disponibles'),

  async run(message) {
    const embed = buildEmbed(message.author.tag);
    await message.reply({ embeds: [embed] });
  },

  async execute(interaction) {
    const embed = buildEmbed(interaction.user.tag);
    await interaction.reply({ embeds: [embed], ephemeral: true });
  },
};

function buildEmbed(tag) {
  return new EmbedBuilder()
    .setTitle('📋 Commandes du Bot')
    .setColor(0x5865F2)
    .setDescription('Préfixe `!` ou commandes `/`')
    .addFields(
      {
        name: '🔨 Modération',
        value: [
          '`!ban` `/ban` — Bannir un membre',
          '`!unban` `/unban` — Débannir par ID',
          '`!mute` `/mute` — Muter (1m → 7j)',
          '`!unmute` `/unmute` — Démuter',
          '`!lock` `/lock` — Verrouiller le salon',
          '`!unlock` `/unlock` — Déverrouiller',
        ].join('\n'),
      },
      {
        name: '⚙️ Configuration (Admin)',
        value: [
          '`!setup reglement` `/setup reglement` — Poster l\'embed règlement',
          '`!setup ticket` `/setup ticket` — Poster l\'embed tickets',
          '`!setup permissions` `/setup permissions` — Cacher les salons aux non-vérifiés',
        ].join('\n'),
      },
      {
        name: '🤖 Protection automatique',
        value: [
          '🔗 **Anti-link** — Discord, YouTube, TikTok, etc.',
          '🚫 **Anti-spam** — Timeout si +5 messages en 4s',
          '⚠️ **Anti-raid** — Vérification si +8 joins en 10s',
        ].join('\n'),
      }
    )
    .setFooter({ text: `Demandé par ${tag}` })
    .setTimestamp();
}
