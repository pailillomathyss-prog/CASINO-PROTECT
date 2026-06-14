const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'help',
  description: 'Afficher toutes les commandes disponibles',
  usage: '!help',

  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Afficher toutes les commandes disponibles'),

  async run(message) {
    await message.reply({ embeds: [buildEmbed(message.author.tag)] });
  },

  async execute(interaction) {
    await interaction.reply({ embeds: [buildEmbed(interaction.user.tag)], ephemeral: true });
  },
};

function buildEmbed(tag) {
  return new EmbedBuilder()
    .setTitle('📋 Commandes du Bot')
    .setColor(0x5865F2)
    .setDescription('Préfixe `!` ou commandes `/` — Les jeux fonctionnent entièrement avec des boutons.')
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
        name: '🎰 Casino (Admin — placement des panneaux)',
        value: [
          '`!casino menu [#salon]` — Panneau tout-en-un (recommandé)',
          '`!casino scratch [#salon]` — Panneau ticket à gratter',
          '`!casino gacha [#salon]` — Panneau gacha',
          '`!casino gains [#salon]` — Panneau résultats',
          '`!gacha addrole @role commun/rare/epique/legendaire`',
          '`!gacha retirerole @role` — Retirer un rôle du gacha',
        ].join('\n'),
      },
      {
        name: '💎 Économie (Admin)',
        value: [
          '`!givediamonds [@membre] <montant>` — Donner/retirer des 💎',
          '> Ex : `!givediamonds @Joueur 500` ou `!givediamonds -100`',
        ].join('\n'),
      },
      {
        name: '🎁 Giveaway (Admin)',
        value: [
          '`!giveaway start <durée> <gagnants> <lot>` — Lancer un giveaway',
          '`!giveaway end <messageId>` — Terminer maintenant',
          '`!giveaway reroll <messageId>` — Reroller le gagnant',
        ].join('\n'),
      },
      {
        name: '📊 Sondages',
        value: [
          '`!sondage "Question" "Option 1" "Option 2"` — Créer un sondage',
          '`/sondage question:... options:Oui,Non duree:10m`',
        ].join('\n'),
      },
      {
        name: '⚙️ Configuration (Admin)',
        value: [
          '`!setup reglement` — Poster l\'embed règlement',
          '`!setup ticket` — Poster l\'embed tickets',
          '`!setup permissions` — Cacher les salons aux non-vérifiés',
        ].join('\n'),
      },
      {
        name: '🤖 Protection automatique',
        value: [
          '🔗 **Anti-link** — Discord, YouTube, TikTok, etc.',
          '🚫 **Anti-spam** — Timeout si +5 messages en 4s',
          '⚠️ **Anti-raid** — Vérification si +8 joins en 10s',
        ].join('\n'),
      },
      {
        name: '🎮 Jeux (boutons uniquement — aucune commande nécessaire)',
        value: [
          '🎴 **Ticket à gratter** — Salon privé, grattage case par case',
          '🎲 **Gacha** — Tirage de rôle avec rarités',
          '💎 **Solde** — Via bouton sur les panneaux',
          '🎁 **Daily** — Via bouton sur les panneaux (50–200 💎/jour)',
        ].join('\n'),
      },
    )
    .setFooter({ text: `Demandé par ${tag}` })
    .setTimestamp();
}
