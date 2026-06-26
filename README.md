# Budgio

Application web de gestion budgétaire familiale. Permet à un ou plusieurs membres d'un foyer de suivre leurs dépenses et revenus mensuels, avec catégorisation, tableau de bord mensuel et gestion des membres.

---

## Architecture

**Monorepo Fullstack**

```
Budgio/
├── apps/
│   ├── api/          # NestJS — REST + OpenAPI (Swagger)
│   └── web/          # Next.js 15 + React 19
├── packages/
│   └── types/        # Types TypeScript partagés
├── caddy/
│   └── budgio.360home.ovh   # Config Caddy de production
├── docker-compose.yml        # Développement local
└── docker-compose.prod.yml   # Production (Raspi)
```

**Flux** : Browser → Caddy (reverse proxy, TLS) → Next.js (SSR) + NestJS API  
**Auth** : Google OAuth 2.0 → JWT (access 15m, refresh 7j) + blacklist Redis  
**DB** : PostgreSQL via Prisma ORM

```
budgio.360home.ovh
    ↓
Raspberry Pi 5
    ├── Caddy (TLS Let's Encrypt, reverse proxy natif)
    ├── budgio-web   (Next.js  :3000, localhost uniquement)
    ├── budgio-api   (NestJS   :3001, localhost uniquement)
    ├── budgio-db    (PostgreSQL :5432, interne Docker)
    └── budgio-cache (Redis     :6379, interne Docker)
```

---

## Stack technique

| Couche | Choix |
|--------|-------|
| Backend | NestJS + TypeScript |
| ORM | Prisma |
| Base de données | PostgreSQL |
| Cache / blacklist tokens | Redis (ioredis) |
| Frontend | Next.js 15 + React 19 + Tailwind CSS |
| Validation | class-validator |
| Auth | Passport (Google OAuth) + JWT |
| OpenAPI | @nestjs/swagger (auto-généré) |
| Reverse proxy | Caddy (TLS automatique Let's Encrypt) |
| Containerisation | Docker + Docker Compose |

---

## Modèle de données

```
User
  ├── googleId, email, name, avatarUrl, theme
  └── RefreshToken[] (haché, expiry tracké)

Household
  ├── HouseholdMember[]        → User (role: ADMIN | MEMBER)
  ├── Category[]               (label, couleur hex)
  ├── HouseholdLog[]           (audit trail : event, meta, userId?)
  ├── RecurringTransaction[]
  │     ├── label, amount
  │     ├── frequency          (DAILY | WEEKDAYS | WEEKLY | MONTHLY | YEARLY)
  │     ├── dayOfWeek? / dayOfMonth? / month?
  │     ├── isActive, lastRunDate
  │     └── category? → Category
  └── Transaction[]
        ├── amount             (> 0 = entrée, < 0 = sortie)
        ├── category?          → Category
        ├── date
        ├── attachmentUrl?
        ├── recurring?         → RecurringTransaction
        └── createdBy          → User
```

---

## Routes API

Toutes les routes sont préfixées `/api`. Documentation interactive disponible sur `/api/docs`.

### Auth

| Méthode | Route | Description |
|---------|-------|-------------|
| GET | `/auth/google` | Initier la connexion Google OAuth |
| GET | `/auth/google/callback` | Callback OAuth — redirige vers le frontend avec les tokens |
| POST | `/auth/refresh` | Rafraîchir les tokens (body : `{ refreshToken }`) |
| POST | `/auth/logout` | Révoquer les tokens (JWT requis) |

### Utilisateur

| Méthode | Route | Description |
|---------|-------|-------------|
| GET | `/users/me` | Profil de l'utilisateur courant |
| PATCH | `/users/me` | Mettre à jour le profil (name, theme) |
| GET | `/users/me/households` | Liste des foyers de l'utilisateur |

### Foyers

| Méthode | Route | Description |
|---------|-------|-------------|
| POST | `/households` | Créer un foyer |
| GET | `/households/:id` | Détails du foyer + membres |
| PATCH | `/households/:id` | Renommer le foyer (ADMIN) |
| PATCH | `/households/:id/deactivate` | Désactiver le foyer (ADMIN) |
| POST | `/households/:id/members` | Inviter un membre par email (ADMIN) |
| PATCH | `/households/:id/members/:memberId` | Changer le rôle d'un membre (ADMIN) |
| DELETE | `/households/:id/members/:memberId` | Retirer un membre (ADMIN) |
| GET | `/households/:id/history` | Journal d'activité du foyer |

### Catégories

| Méthode | Route | Description |
|---------|-------|-------------|
| GET | `/households/:id/categories` | Lister les catégories du foyer |
| POST | `/households/:id/categories` | Créer une catégorie (label + couleur) |
| PATCH | `/households/:id/categories/:categoryId` | Modifier une catégorie |
| DELETE | `/households/:id/categories/:categoryId` | Supprimer une catégorie (ADMIN) |

### Transactions

| Méthode | Route | Description |
|---------|-------|-------------|
| GET | `/households/:id/transactions` | Lister les transactions (`?year=&month=` optionnels) |
| GET | `/households/:id/transactions/stats` | Statistiques 12 mois — solde, moyennes, top catégories |
| GET | `/households/:id/transactions/dashboard` | Tableau de bord mensuel (`?year=&month=` requis) |
| POST | `/households/:id/transactions` | Créer une transaction |
| PATCH | `/households/:id/transactions/:txId` | Modifier une transaction |
| DELETE | `/households/:id/transactions/:txId` | Supprimer une transaction |

Le dashboard retourne : `{ openingBalance, totalIn, totalOut, closingBalance, byCategory[] }`.

### Mouvements fixes (Recurring)

| Méthode | Route | Description |
|---------|-------|-------------|
| GET | `/households/:id/recurring` | Lister les mouvements fixes actifs |
| POST | `/households/:id/recurring` | Créer un mouvement fixe |
| POST | `/households/:id/recurring/replay-month` | Rejouer les occurrences du mois en cours jusqu'à aujourd'hui |
| PATCH | `/households/:id/recurring/:recurringId` | Modifier un mouvement fixe |
| DELETE | `/households/:id/recurring/:recurringId` | Désactiver un mouvement fixe |

Fréquences disponibles : `DAILY`, `WEEKDAYS`, `WEEKLY`, `MONTHLY`, `YEARLY`.

---

## Pages frontend

| Route | Description |
|-------|-------------|
| `/login` | Page de connexion — bouton Google OAuth |
| `/auth/callback` | Réception des tokens après OAuth |
| `/households` | Liste des foyers de l'utilisateur |
| `/households/[id]` | Détail d'un foyer — onglets Mouvements / Fixe / Stats / Membres |
| `/households/[id]/history` | Journal d'activité du foyer |
| `/households/[id]/settings` | Paramètres : renommer, catégories, membres, désactivation |
| `/profile` | Profil utilisateur — modifier le nom et le thème |

---

## Démarrage local

```bash
# Prérequis : Docker, Node.js 20+

# 1. Cloner le dépôt
git clone <repo> budgio && cd budgio

# 2. Variables d'environnement
cp .env.example .env
# Renseigner GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, les secrets JWT

# 3. Démarrer PostgreSQL + Redis
docker compose up -d postgres redis

# 4. Migrations
cd apps/api && npx prisma migrate dev && cd ../..

# 5. Démarrer en développement
npm run dev
```

**URLs locales :**
- Frontend : http://localhost:3000
- API : http://localhost:3001
- Swagger : http://localhost:3001/api/docs

---

## Production — Raspberry Pi

Le site tourne sur `budgio.360home.ovh`. Caddy est installé nativement sur le Raspi et gère le TLS Let's Encrypt. Les conteneurs applicatifs n'exposent leurs ports que sur `localhost`.

### Déploiement

```bash
# 1. Sur le Raspi — copier le bloc Caddy
sudo cp caddy/budgio.360home.ovh /etc/caddy/sites/budgio.360home.ovh
# (ou l'ajouter dans /etc/caddy/Caddyfile via import)
sudo systemctl reload caddy

# 2. Créer le fichier d'environnement de production
cp .env.prod.example .env.prod
nano .env.prod   # remplir toutes les valeurs

# Générer les secrets JWT :
openssl rand -base64 48   # → JWT_ACCESS_SECRET
openssl rand -base64 48   # → JWT_REFRESH_SECRET

# 3. Construire et démarrer
docker compose -f docker-compose.prod.yml up -d --build

# 4. Suivi des logs
docker compose -f docker-compose.prod.yml logs -f
```

### Mise à jour

```bash
git pull
docker compose -f docker-compose.prod.yml up -d --build
```

### Variables d'environnement de production

| Variable | Description |
|----------|-------------|
| `POSTGRES_USER` | Utilisateur PostgreSQL |
| `POSTGRES_PASSWORD` | Mot de passe PostgreSQL |
| `POSTGRES_DB` | Nom de la base |
| `JWT_ACCESS_SECRET` | Secret du token d'accès |
| `JWT_REFRESH_SECRET` | Secret du token de rafraîchissement |
| `JWT_ACCESS_EXPIRES_IN` | Durée du token d'accès (ex : `15m`) |
| `JWT_REFRESH_EXPIRES_IN` | Durée du token de rafraîchissement (ex : `7d`) |
| `GOOGLE_CLIENT_ID` | Client ID Google OAuth |
| `GOOGLE_CLIENT_SECRET` | Client Secret Google OAuth |
| `GOOGLE_CALLBACK_URL` | `https://budgio.360home.ovh/api/auth/google/callback` |
| `NEXT_PUBLIC_API_URL` | `https://budgio.360home.ovh` |

> Les migrations Prisma (`prisma migrate deploy`) s'exécutent automatiquement au démarrage du conteneur API.
