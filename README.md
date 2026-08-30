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

## Déploiement Render

Le fichier `render.yaml` déploie toute l’application depuis un seul Blueprint Render :

- `cinq-royaumes` est le site statique React servi par le CDN Render ;
- `cinq-royaumes-server` est le service Node.js qui maintient les connexions Socket.IO.

Dans le tableau de bord Render, crée un nouveau Blueprint depuis ce dépôt. Les variables `VITE_SERVER_HOST` et `CLIENT_HOST` sont alimentées automatiquement avec les hostnames publics des deux services. Aucune URL n’est à recopier manuellement.

Une fois le déploiement terminé, ouvre l’URL du service `cinq-royaumes`. L’endpoint `/health` du service `cinq-royaumes-server` doit répondre avec `{"status":"ok"}`.

En local, les variables de déploiement restent facultatives : Vite utilise son proxy vers `http://localhost:3001`.

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
