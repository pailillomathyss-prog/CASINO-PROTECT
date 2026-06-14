const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { startGiveaway, endGiveaway, rerollGiveaway, parseDuration } = require('../systems/giveaway');

module.exports = {
  name: 'giveaway',
  description: 'Gérer les giveaways',
  usage: '!giveaway start <durée> <nb_gagnants> <lot> | !giveaway end <msgId> | !giveaway reroll <msgId>',

  data: new SlashCommandBuilder()
    .setName('giveaway')
    .setDescription('Gérer les giveaways')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .addSubcommand(sub => sub
      .setName('start')
      .setDescription('Lancer un giveaway')
      .addStringOption(o => o.setName('lot').setDescription('Ce que les participants peuvent gagner').setRequired(true))
      .addStringOption(o => o.setName('duree').setDescription('Durée (ex: 10m, 2h, 1d)').setRequired(true))
      .addIntegerOption(o => o.setName('gagnants').setDescription('Nombre de gagnants (défaut: 1)').setMinValue(1).setMaxValue(10).setRequired(false))
    )
    .addSubcommand(sub => sub
      .setName('end')
      .setDescription('Terminer un giveaway maintenant')
      .addStringOption(o => o.setName('message_id').setDescription('ID du message giveaway').setRequired(true))
    )
    .addSubcommand(sub => sub
      .setName('reroll')
      .setDescription('Reroller le gagnant d\'un giveaway')
      .addStringOption(o => o.setName('message_id').setDescription('ID du message giveaway').setRequired(true))
    ),

  // Commande préfixe
  async run(message, args) {
    const sub = args[0]?.toLowerCase();

    // Permission : staff only
    if (!message.member.permissions.has(PermissionFlagsBits.ManageMessages)) {
      return message.reply('❌ Tu n\'as pas la permission d\'utiliser cette commande.');
    }

    if (!sub || sub === 'start') {
      // !giveaway start 1h 2 Nitro Classic
      // !giveaway 1h 2 Nitro Classic (sans "start")
      const durationStr  = sub === 'start' ? args[1] : args[0];
      const winnersCount = sub === 'start' ? parseInt(args[2]) : parseInt(args[1]);
      const prize        = sub === 'start'
        ? args.slice(3).join(' ')
        : args.slice(2).join(' ');

      if (!durationStr || !prize) {
        return message.reply(
          '❌ Usage : `!giveaway start <durée> <nb_gagnants> <lot>`\n' +
          '> Exemple : `!giveaway start 1h 1 Nitro Classic`'
        );
      }

      const durationMs = parseDuration(durationStr);
      if (!durationMs) {
        return message.reply('❌ Durée invalide. Exemples : `30m`, `2h`, `1d`');
      }

      await startGiveaway(message.channel, {
        prize,
        winners  : isNaN(winnersCount) ? 1 : winnersCount,
        durationMs,
        hostedBy : message.author,
      });
      await message.delete().catch(() => {});

    } else if (sub === 'end') {
      const messageId = args[1];
      if (!messageId) return message.reply('❌ Usage : `!giveaway end <messageId>`');
      const result = await endGiveaway(messageId, message.guild, message.channel);
      if (!result) message.reply('❌ Giveaway introuvable.').then(m => setTimeout(() => m.delete().catch(() => {}), 5000));

    } else if (sub === 'reroll') {
      const messageId = args[1];
      if (!messageId) return message.reply('❌ Usage : `!giveaway reroll <messageId>`');
      const winner = await rerollGiveaway(messageId, message.guild, message.channel);
      if (!winner) message.reply('❌ Giveaway introuvable ou aucun participant.');
    } else {
      message.reply('❌ Sous-commande inconnue. Utilise : `start`, `end`, `reroll`');
    }
  },

  // Slash command
  async execute(interaction) {
    const sub = interaction.options.getSubcommand();

    if (sub === 'start') {
      const prize      = interaction.options.getString('lot');
      const durationStr= interaction.options.getString('duree');
      const winners    = interaction.options.getInteger('gagnants') || 1;

      const durationMs = parseDuration(durationStr);
      if (!durationMs) {
        return interaction.reply({ content: '❌ Durée invalide. Exemples : `30m`, `2h`, `1d`', ephemeral: true });
      }

      await interaction.reply({ content: '🎁 Giveaway lancé !', ephemeral: true });
      await startGiveaway(interaction.channel, {
        prize, winners, durationMs, hostedBy: interaction.user,
      });

    } else if (sub === 'end') {
      const messageId = interaction.options.getString('message_id');
      await interaction.deferReply({ ephemeral: true });
      const result = await endGiveaway(messageId, interaction.guild, interaction.channel);
      await interaction.editReply(result ? '✅ Giveaway terminé !' : '❌ Giveaway introuvable.');

    } else if (sub === 'reroll') {
      const messageId = interaction.options.getString('message_id');
      await interaction.deferReply({ ephemeral: true });
      const winner = await rerollGiveaway(messageId, interaction.guild, interaction.channel);
      await interaction.editReply(winner ? `✅ Nouveau gagnant : <@${winner}> !` : '❌ Impossible de reroller.');
    }
  },
};
