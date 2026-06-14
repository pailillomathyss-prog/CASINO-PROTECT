const { handleReglementAccept } = require('../systems/reglement');
const { handleTicketOpen, handleTicketReason, handleTicketClose } = require('../systems/ticket');
const { handleGiveawayEnter } = require('../systems/giveaway');
const { handleScratchPlay, handleScratchReplay, handleScratchClose } = require('../systems/scratchcard');
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
      if (interaction.customId === 'reglement_accept') return handleReglementAccept(interaction);
      if (interaction.customId === 'ticket_open')      return handleTicketOpen(interaction);
      if (interaction.customId === 'ticket_close')     return handleTicketClose(interaction);
      if (interaction.customId === 'giveaway_enter')   return handleGiveawayEnter(interaction);
      if (interaction.customId === 'scratch_play')     return handleScratchPlay(interaction);
      if (interaction.customId === 'scratch_replay')   return handleScratchReplay(interaction);
      if (interaction.customId === 'scratch_close')    return handleScratchClose(interaction);
      if (interaction.customId === 'gacha_pull')       return handleGachaPull(interaction);
    }

    // ── Select Menus ──────────────────────────────────────────────────────────
    if (interaction.isStringSelectMenu()) {
      if (interaction.customId === 'ticket_reason') return handleTicketReason(interaction);
    }
  },
};
