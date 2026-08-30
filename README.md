# Cinq Royaumes

Jeu de rami multijoueur inspiré des règles classiques des 5 Rois. Le serveur Node.js est autoritaire : il contrôle le paquet, les tours, les combinaisons et les scores. Chaque navigateur reçoit uniquement sa main et les informations publiques des autres joueurs.

## Prérequis

- Node.js 22 ou plus récent
- pnpm 11

## Développement

```bash
pnpm install
pnpm dev
```

- Interface React : http://localhost:5173
- API Express : http://localhost:3001
- Santé du serveur : http://localhost:3001/health

Pour tester une partie, ouvre l’interface dans deux fenêtres privées distinctes. Crée une salle dans la première, puis rejoins son code dans la seconde.

## Déploiement

Netlify héberge l’interface React. Le serveur Socket.IO doit être hébergé séparément sur un service qui maintient les connexions WebSocket, par exemple Render. Les fonctions Netlify ne prennent pas en charge un serveur Socket.IO persistant.

### 1. Backend Render

Le fichier `render.yaml` décrit le service. Crée un Blueprint Render depuis ce dépôt et renseigne la variable d’environnement suivante :

```text
CLIENT_ORIGIN=https://ton-site.netlify.app
```

Plusieurs origines peuvent être séparées par des virgules. Une fois le service déployé, vérifie `https://ton-backend.onrender.com/health`.

### 2. Frontend Netlify

Importe le dépôt dans Netlify. Le fichier `netlify.toml` fournit déjà la commande de build, le dossier publié et la redirection SPA. Ajoute cette variable d’environnement dans Netlify :

```text
VITE_SERVER_URL=https://ton-backend.onrender.com
```

Déclenche ensuite un nouveau déploiement. En local, cette variable est facultative : Vite continue à utiliser son proxy vers `http://localhost:3001`.

## Vérification

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

## Organisation

- `apps/web` : React 19, Vite et client Socket.IO.
- `apps/server` : Express, Socket.IO, validation Zod et salles en mémoire.
- `packages/contracts` : contrats TypeScript partagés.
- `packages/game-engine` : paquet, combinaisons et scores sous forme de fonctions pures.

## Limites du MVP

Les parties sont conservées en mémoire et disparaissent au redémarrage du serveur. Cette version cible une seule instance backend et ne fournit ni comptes, ni matchmaking, ni bots. Une identité visuelle originale est utilisée et aucun contenu graphique propriétaire n’est inclus.
