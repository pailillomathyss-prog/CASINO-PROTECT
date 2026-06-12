# 🛡️ Bot de Protection Discord

Bot de modération et protection complet pour Discord, déployable sur **Railway**.

---

## ✨ Fonctionnalités

| Fonctionnalité | Description |
|---|---|
| `/ban` | Bannir un membre |
| `/unban` | Débannir un utilisateur par ID |
| `/mute` | Réduire au silence (1min → 7 jours) |
| `/unmute` | Retirer le mute |
| `/lock` | Verrouiller un salon |
| `/unlock` | Déverrouiller un salon |
| `/setup reglement` | Poster l'embed règlement |
| `/setup ticket` | Poster l'embed tickets |
| 📜 Règlement | Bouton "Est-tu prêt à parier ?" → attribution de rôle |
| 🎟️ Tickets | Création avec menu de raisons, réponses éphémères |
| 🔗 Anti-link | Supprime liens Discord, YouTube, TikTok, etc. |
| 🚫 Anti-spam | Timeout auto si >5 messages en 4 secondes |
| ⚠️ Anti-raid | Augmente le niveau de vérification si >8 joins en 10s |
| 📋 Logs | Toutes les actions loggées dans le salon configuré |

---

## 🚀 Déploiement sur Railway

### Étape 1 — Créer le bot Discord

1. Va sur [discord.com/developers/applications](https://discord.com/developers/applications)
2. Clique **New Application** → donne un nom
3. Va dans **Bot** → clique **Reset Token** → copie le token
4. Active les **Privileged Gateway Intents** :
   - ✅ `SERVER MEMBERS INTENT`
   - ✅ `MESSAGE CONTENT INTENT`
5. Va dans **OAuth2 → URL Generator** :
   - Scopes : `bot` + `applications.commands`
   - Permissions : `Administrator` (ou les permissions détaillées ci-dessous)
   - Copie l'URL et invite le bot sur ton serveur

### Étape 2 — Configurer les IDs

Active le **mode développeur** sur Discord :
`Paramètres → Avancé → Mode développeur`

Fais clic droit sur chaque élément pour copier l'ID :

| Variable | Comment l'obtenir |
|---|---|
| `DISCORD_TOKEN` | Discord Developer Portal → Bot → Token |
| `CLIENT_ID` | Developer Portal → General Information → Application ID |
| `GUILD_ID` | Clic droit sur ton serveur |
| `LOGS_CHANNEL_ID` | Clic droit sur `📋・logs` |
| `TICKET_CHANNEL_ID` | Clic droit sur `🎟️・ticket` |
| `TICKET_CATEGORY_ID` | Clic droit sur la catégorie des tickets |
| `REGLEMENT_CHANNEL_ID` | Clic droit sur `📜・règlement` |
| `VERIFIED_ROLE_ID` | Paramètres serveur → Rôles → clic droit sur le rôle |
| `STAFF_ROLE_ID` | Paramètres serveur → Rôles → clic droit sur le rôle staff |

### Étape 3 — Déployer sur Railway

1. Va sur [railway.app](https://railway.app) et connecte-toi
2. Clique **New Project → Deploy from GitHub repo**
3. Sélectionne ce dépôt (ou upload les fichiers)
4. Va dans **Variables** et ajoute toutes les variables du `.env.example`
5. **Important** : Dans les paramètres du service, définis le **Root Directory** sur `discord-bot`
6. Railway déploie automatiquement !

> 💡 **Tip** : Pour le stockage persistant des tickets, ajoute un **Volume** Railway monté sur `/app/data`

### Étape 4 — Déployer les commandes slash

Une fois le bot en ligne, dans le terminal Railway (ou localement avec ton `.env`) :

```bash
npm run deploy
```

Cette commande enregistre toutes les commandes `/` sur ton serveur.

### Étape 5 — Configurer les embeds

Dans Discord, utilise :
- `/setup reglement` → poste l'embed avec le bouton dans `📜・règlement`
- `/setup ticket` → poste l'embed avec le bouton dans `🎟️・ticket`

---

## 🔒 Permissions requises

Le bot a besoin des permissions suivantes :

- Gérer les membres
- Gérer les messages
- Gérer les salons
- Expulser des membres
- Bannir des membres
- Voir les salons
- Envoyer des messages
- Modérer les membres (timeout)
- Lire l'historique des messages

---

## 📁 Structure des fichiers

```
discord-bot/
├── src/
│   ├── index.js          → Démarrage du bot
│   ├── deploy.js         → Déploiement des commandes slash
│   ├── config.js         → Variables d'environnement
│   ├── commands/         → Commandes slash
│   │   ├── ban.js
│   │   ├── unban.js
│   │   ├── mute.js
│   │   ├── unmute.js
│   │   ├── lock.js
│   │   ├── unlock.js
│   │   └── setup.js
│   ├── events/           → Événements Discord
│   │   ├── ready.js
│   │   ├── interactionCreate.js
│   │   ├── messageCreate.js
│   │   └── guildMemberAdd.js
│   └── systems/          → Systèmes automatiques
│       ├── antilink.js
│       ├── antispam.js
│       ├── antiraid.js
│       ├── ticket.js
│       ├── reglement.js
│       └── logs.js
├── Dockerfile
├── railway.toml
├── package.json
└── .env.example
```
