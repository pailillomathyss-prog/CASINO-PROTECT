const { checkAntiLink } = require('../systems/antilink');
const { checkAntiSpam } = require('../systems/antispam');

module.exports = {
  name: 'messageCreate',
  async execute(message) {
    if (!message.guild) return;
    if (message.author.bot) return;

    // Anti-lien : si un lien est détecté, on stoppe (pas besoin de vérifier le spam)
    const linkDetected = await checkAntiLink(message);
    if (linkDetected) return;

    // Anti-spam
    await checkAntiSpam(message);
  },
};
