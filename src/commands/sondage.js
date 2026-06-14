const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');

const LETTER_EMOJIS = ['🇦','🇧','🇨','🇩','🇪','🇫','🇬','🇭'];

module.exports = {
  name: 'sondage',
  description: 'Crée un sondage avec jusqu\'à 8 options',
  usage: '!sondage "Question" "Option 1" "Option 2" ...',

  data: new SlashCommandBuilder()
    .setName('sondage')
    .setDescription('Crée un sondage avec plusieurs options')
    .addStringOption(o => o.setName('question').setDescription('La question du sondage').setRequired(true))
    .addStringOption(o => o.setName('options').setDescription('Les options séparées par des virgules (ex: Oui,Non,Peut-être)').setRequired(true))
    .addStringOption(o => o.setName('duree').setDescription('Durée avant fermeture (ex: 10m, 2h, 1d) — optionnel').setRequired(false)),

  // Commande préfixe : !sondage "Question" "Option 1" "Option 2"
  async run(message, args) {
    const raw = message.content.slice(message.content.indexOf('sondage') + 7).trim();
    const parts = raw.match(/"([^"]+)"/g);

    if (!parts || parts.length < 3) {
      return message.reply('❌ Usage : `!sondage "Question" "Option 1" "Option 2" ["Option 3"...]`\n> Minimum 2 options, maximum 8.');
    }

    const question = parts[0].replace(/"/g, '');
    const options  = parts.slice(1).map(p => p.replace(/"/g, '')).slice(0, 8);

    await createPoll(message.channel, message.author, question, options, null);
    await message.delete().catch(() => {});
  },

  // Slash command : /sondage question:... options:Oui,Non duree:10m
  async execute(interaction) {
    const question = interaction.options.getString('question');
    const rawOpts  = interaction.options.getString('options');
    const duree    = interaction.options.getString('duree');

    const options = rawOpts.split(',').map(o => o.trim()).filter(Boolean).slice(0, 8);

    if (options.length < 2) {
      return interaction.reply({ content: '❌ Il faut au moins **2 options** séparées par des virgules.', ephemeral: true });
    }

    await interaction.reply({ content: '📊 Sondage créé !', ephemeral: true });
    await createPoll(interaction.channel, interaction.user, question, options, duree);
  },
};

async function createPoll(channel, author, question, options, duree) {
  const lines = options.map((opt, i) => `${LETTER_EMOJIS[i]} **${opt}**`).join('\n');

  let footer = `Sondage par ${author.tag}`;
  let endTime = null;

  if (duree) {
    const ms = parseDuration(duree);
    if (ms) {
      endTime = Date.now() + ms;
      footer += ` • Ferme dans ${formatDuration(ms)}`;
    }
  }

  const embed = new EmbedBuilder()
    .setTitle(`📊 ${question}`)
    .setDescription(lines + '\n\n> Réagis avec l\'emoji correspondant à ton choix !')
    .setColor(0x3498db)
    .setFooter({ text: footer })
    .setTimestamp();

  const msg = await channel.send({ embeds: [embed] });

  // Ajouter les réactions dans l'ordre
  for (let i = 0; i < options.length; i++) {
    await msg.react(LETTER_EMOJIS[i]).catch(() => {});
  }

  // Fermer le sondage après la durée
  if (endTime) {
    setTimeout(async () => {
      await msg.fetch().catch(() => null).then(async (m) => {
        if (!m) return;

        // Calculer les résultats
        const results = [];
        for (let i = 0; i < options.length; i++) {
          const reaction = m.reactions.cache.get(LETTER_EMOJIS[i]);
          const count = reaction ? reaction.count - 1 : 0; // -1 pour le bot
          results.push({ option: options[i], count, emoji: LETTER_EMOJIS[i] });
        }

        results.sort((a, b) => b.count - a.count);
        const total = results.reduce((acc, r) => acc + r.count, 0);

        const resultLines = results.map(r => {
          const pct = total > 0 ? Math.round((r.count / total) * 100) : 0;
          const bar = '█'.repeat(Math.floor(pct / 10)) + '░'.repeat(10 - Math.floor(pct / 10));
          return `${r.emoji} **${r.option}** — ${r.count} vote(s) (${pct}%)\n\`${bar}\``;
        }).join('\n\n');

        const closedEmbed = new EmbedBuilder()
          .setTitle(`📊 [FERMÉ] ${question}`)
          .setDescription(resultLines || 'Aucun vote.')
          .setColor(0x95a5a6)
          .setFooter({ text: `Sondage terminé • ${total} vote(s) au total` })
          .setTimestamp();

        await m.edit({ embeds: [closedEmbed] }).catch(() => {});
      });
    }, endTime - Date.now());
  }
}

function parseDuration(str) {
  const match = str.match(/^(\d+)(s|m|h|d)$/i);
  if (!match) return null;
  const val = parseInt(match[1]);
  const unit = match[2].toLowerCase();
  return val * { s: 1000, m: 60000, h: 3600000, d: 86400000 }[unit];
}

function formatDuration(ms) {
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}j`;
}
