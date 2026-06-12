const { handleReglementAccept } = require('../systems/reglement');
const { handleTicketOpen, handleTicketReason, handleTicketClose } = require('../systems/ticket');

module.exports = {
  name: 'interactionCreate',
  async execute(interaction) {

    // ── Boutons ───────────────────────────────────────────────────────────────
    if (interaction.isButton()) {
      if (interaction.customId === 'reglement_accept') {
        return handleReglementAccept(interaction);
      }
      if (interaction.customId === 'ticket_open') {
        return handleTicketOpen(interaction);
      }
      if (interaction.customId === 'ticket_close') {
        return handleTicketClose(interaction);
      }
    }

    // ── Select Menus ──────────────────────────────────────────────────────────
    if (interaction.isStringSelectMenu()) {
      if (interaction.customId === 'ticket_reason') {
        return handleTicketReason(interaction);
      }
    }
  },
};
