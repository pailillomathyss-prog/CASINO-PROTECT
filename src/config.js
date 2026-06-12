require('dotenv').config();

module.exports = {
  TOKEN: process.env.DISCORD_TOKEN,
  CLIENT_ID: process.env.CLIENT_ID,
  GUILD_ID: process.env.GUILD_ID,
  LOGS_CHANNEL_ID: process.env.LOGS_CHANNEL_ID,
  TICKET_CHANNEL_ID: process.env.TICKET_CHANNEL_ID,
  TICKET_CATEGORY_ID: process.env.TICKET_CATEGORY_ID,
  REGLEMENT_CHANNEL_ID: process.env.REGLEMENT_CHANNEL_ID,
  VERIFIED_ROLE_ID: process.env.VERIFIED_ROLE_ID,
  STAFF_ROLE_ID: process.env.STAFF_ROLE_ID,
};
