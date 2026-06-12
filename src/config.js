require('dotenv').config();

module.exports = {
  TOKEN: process.env.DISCORD_TOKEN,
  CLIENT_ID: process.env.CLIENT_ID || '1514788470961475636',
  GUILD_ID: process.env.GUILD_ID || null,
  LOGS_CHANNEL_ID: process.env.LOGS_CHANNEL_ID || null,
  TICKET_CHANNEL_ID: process.env.TICKET_CHANNEL_ID || null,
  TICKET_CATEGORY_ID: process.env.TICKET_CATEGORY_ID || null,
  REGLEMENT_CHANNEL_ID: process.env.REGLEMENT_CHANNEL_ID || null,
  VERIFIED_ROLE_ID: process.env.VERIFIED_ROLE_ID || null,
  STAFF_ROLE_ID: process.env.STAFF_ROLE_ID || null,
};
