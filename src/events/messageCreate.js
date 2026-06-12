const { checkAntiLink } = require('../systems/antilink');
const { checkAntiSpam } = require('../systems/antispam');

const PREFIX = '!';

module.exports = {
  name: 'messageCreate',
  async execute(message, client) {
    if (!message.guild) return;
    if (message.author.bot) return;

    // ── Commandes préfixe ! ───────────────────────────────────────────────────
    if (message.content.startsWith(PREFIX)) {
      const args = message.content.slice(PREFIX.length).trim().split(/\s+/);
      const commandName = args.shift().toLowerCase();

      const command = client.commands.get(commandName);
      if (!command) return;

      // Vérification des permissions
      if (command.permissions && command.permissions.length > 0) {
        const missing = command.permissions.filter(
          perm => !message.member.permissions.has(perm)
        );
        if (missing.length > 0) {
          return message.reply('❌ Tu n\'as pas les permissions nécessaires pour cette commande.');
        }
      }

      try {
        await command.run(message, args, client);
      } catch (err) {
        console.error(`[CMD ERR] !${commandName} :`, err);
        message.reply('❌ Une erreur est survenue lors de l\'exécution de cette commande.').catch(() => {});
      }
      return;
    }

    // ── Protection automatique (uniquement si pas une commande) ───────────────
    const linkDetected = await checkAntiLink(message);
    if (linkDetected) return;

    await checkAntiSpam(message);
  },
};
