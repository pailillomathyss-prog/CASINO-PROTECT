const { Client, GatewayIntentBits, Partials, Collection, REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');
const config = require('./config');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildBans,
    GatewayIntentBits.GuildModeration,
  ],
  partials: [Partials.Message, Partials.Channel, Partials.GuildMember],
});

client.commands = new Collection();
const slashCommands = [];

// Charger les commandes (préfixe ! ET slash /)
const commandsPath = path.join(__dirname, 'commands');
for (const file of fs.readdirSync(commandsPath).filter(f => f.endsWith('.js'))) {
  const command = require(path.join(commandsPath, file));
  if (command.name) {
    client.commands.set(command.name, command);
    if (command.data) slashCommands.push(command.data.toJSON());
    console.log(`[CMD] Chargée : !${command.name}${command.data ? ' + /' + command.name : ''}`);
  }
}

// Charger les événements
const eventsPath = path.join(__dirname, 'events');
for (const file of fs.readdirSync(eventsPath).filter(f => f.endsWith('.js'))) {
  const event = require(path.join(eventsPath, file));
  if (event.once) {
    client.once(event.name, (...args) => event.execute(...args, client));
  } else {
    client.on(event.name, (...args) => event.execute(...args, client));
  }
  console.log(`[EVT] Chargé : ${event.name}`);
}

// Déployer les slash commands automatiquement au démarrage
client.once('ready', async () => {
  if (!config.CLIENT_ID || !config.GUILD_ID) {
    console.log('[SLASH] ⚠️  CLIENT_ID ou GUILD_ID non défini — slash commands non déployées.');
    return;
  }
  try {
    const rest = new REST().setToken(config.TOKEN);
    await rest.put(
      Routes.applicationGuildCommands(config.CLIENT_ID, config.GUILD_ID),
      { body: slashCommands }
    );
    console.log(`[SLASH] ✅ ${slashCommands.length} commande(s) slash déployée(s) sur le serveur.`);
  } catch (err) {
    console.error('[SLASH] ❌ Erreur de déploiement :', err.message);
  }
});

client.login(config.TOKEN).catch(err => {
  console.error('[ERREUR] Impossible de se connecter :', err.message);
  process.exit(1);
});
