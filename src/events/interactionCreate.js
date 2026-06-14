const { EmbedBuilder } = require('discord.js');
const { handleReglementAccept }   = require('../systems/reglement');
const { handleTicketOpen, handleTicketReason, handleTicketClose } = require('../systems/ticket');
const { handleGiveawayEnter }     = require('../systems/giveaway');
const {
  handleCasinoStartScratch,
  handleScratchCell,
  handleScratchReplay,
  handleScratchClose,
} = require('../systems/scratchcard');
const { handleGachaPull }          = require('../systems/gacha');
const { getBalance, claimDaily, SCRATCH_COST, GACHA_COST } = require('../systems/economy');

module.exports = {
  name: 'interactionCreate',
  async execute(interaction, client) {

    // ── Slash Commands ────────────────────────────────────────────────────────
    if (interaction.isChatInputCommand()) {
      const command = client.commands.get(interaction.commandName);
      if (!command || !command.execute) return;
      try {
        await command.execute(interaction);
      } catch (err) {
        console.error(`[SLASH ERR] /${interaction.commandName} :`, err);
        const msg = { content: '❌ Une erreur est survenue.', ephemeral: true };
        if (interaction.replied || interaction.deferred) await interaction.followUp(msg).catch(() => {});
        else await interaction.reply(msg).catch(() => {});
      }
      return;
    }

    // ── Boutons ───────────────────────────────────────────────────────────────
    if (interaction.isButton()) {
      const id = interaction.customId;

      // ── Règlement & Tickets
      if (id === 'reglement_accept') return handleReglementAccept(interaction);
      if (id === 'ticket_open')      return handleTicketOpen(interaction);
      if (id === 'ticket_close')     return handleTicketClose(interaction);

      // ── Giveaway
      if (id === 'giveaway_enter')   return handleGiveawayEnter(interaction);

      // ── Casino : démarrage depuis le panneau
      if (id === 'casino_start_scratch') return handleCasinoStartScratch(interaction);

      // ── Casino : animation grattage dans le salon privé
      if (id === 'scratch_replay')  return handleScratchReplay(interaction);
      if (id === 'scratch_close')   return handleScratchClose(interaction);
      if (id.startsWith('scratch_cell_')) {
        return handleScratchCell(interaction, parseInt(id.split('_')[2]));
      }

      // ── Gacha
      if (id === 'gacha_pull') return handleGachaPull(interaction);

      // ── Économie (boutons présents sur tous les panneaux)
      if (id === 'casino_balance') {
        const balance = getBalance(interaction.user.id);
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setTitle('💎 Ton solde')
              .setDescription(
                `💎 **${balance} diamants**\n\n` +
                `🎴 Ticket à gratter : **${SCRATCH_COST} 💎**\n` +
                `🎲 Gacha : **${GACHA_COST} 💎**\n\n` +
                `> Utilise **🎁 Daily gratuit** pour en récupérer gratuitement !`
              )
              .setColor(0x3498db)
              .setTimestamp(),
          ],
          ephemeral: true,
        });
      }

      if (id === 'casino_daily') {
        const result = claimDaily(interaction.user.id);
        if (result.success) {
          return interaction.reply({
            embeds: [
              new EmbedBuilder()
                .setTitle('🎁 Daily récupéré !')
                .setDescription(
                  `Tu as récupéré **+${result.reward} 💎** !\n\n` +
                  `💰 Nouveau solde : **${result.balance} 💎**\n\n` +
                  `> Reviens demain pour en récupérer d'autres !`
                )
                .setColor(0x2ecc71)
                .setTimestamp(),
            ],
            ephemeral: true,
          });
        } else {
          const h = Math.floor(result.next / 3600000);
          const m = Math.floor((result.next % 3600000) / 60000);
          return interaction.reply({
            embeds: [
              new EmbedBuilder()
                .setTitle('⏰ Daily déjà récupéré')
                .setDescription(
                  `Tu as déjà récupéré ton daily aujourd'hui.\n\n` +
                  `⏳ Prochain dans : **${h}h ${m}m**\n` +
                  `💎 Solde actuel : **${getBalance(interaction.user.id)} 💎**`
                )
                .setColor(0xe74c3c),
            ],
            ephemeral: true,
          });
        }
      }
    }

    // ── Select Menus ──────────────────────────────────────────────────────────
    if (interaction.isStringSelectMenu()) {
      if (interaction.customId === 'ticket_reason') return handleTicketReason(interaction);
    }
  },
};
