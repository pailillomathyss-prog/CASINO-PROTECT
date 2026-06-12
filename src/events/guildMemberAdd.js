const { checkAntiRaid } = require('../systems/antiraid');

module.exports = {
  name: 'guildMemberAdd',
  async execute(member) {
    await checkAntiRaid(member);
  },
};
