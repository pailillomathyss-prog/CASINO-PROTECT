const { handleReglementAccept }   = require('../systems/reglement');
const { handleTicketOpen, handleTicketReason, handleTicketClose } = require('../systems/ticket');
const { handleGiveawayEnter }     = require('../systems/giveaway');
const {
  handleCasinoStartScratch,
  handleScratchCell,
  handleScratchReplay,
  handleScratchClose,
} = require('../systems/scratchcard');
const { handleGachaPull } = require('../systems/gacha');

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

      // Règlement & Tickets
      if (id === 'reglement_accept')     return handleReglementAccept(interaction);
      if (id === 'ticket_open')          return handleTicketOpen(interaction);
      if (id === 'ticket_close')         return handleTicketClose(interaction);

      // Giveaway
      if (id === 'giveaway_enter')       return handleGiveawayEnter(interaction);

      // Casino — démarrage depuis le panneau (bouton sur l'embed posté par !casino scratch)
      if (id === 'casino_start_scratch') return handleCasinoStartScratch(interaction);

      // Casino — animation grattage dans le salon privé
      if (id === 'scratch_replay')       return handleScratchReplay(interaction);
      if (id === 'scratch_close')        return handleScratchClose(interaction);
      if (id.startsWith('scratch_cell_')) {
        const cellIndex = parseInt(id.split('_')[2]);
        return handleScratchCell(interaction, cellIndex);
      }

      // Gacha
      if (id === 'gacha_pull')           return handleGachaPull(interaction);
    }

    // ── Select Menus ──────────────────────────────────────────────────────────
    if (interaction.isStringSelectMenu()) {
      if (interaction.customId === 'ticket_reason') return handleTicketReason(interaction);
    }
  },
};
