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
| PWA | Manifest + Service Worker natif (cache-first static, network-first API) |
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
  ├── Transaction[]
  │     ├── amount             (> 0 = entrée, < 0 = sortie)
  │     ├── category?          → Category
  │     ├── date
  │     ├── attachmentUrl?
  │     ├── recurring?         → RecurringTransaction
  │     ├── goal?              → SavingsGoal (crée une GoalContribution automatique)
  │     └── createdBy          → User
  └── SavingsGoal[]
        ├── name, targetAmount, deadline?
        ├── isCompleted
        ├── GoalContribution[] (amount, note?, transactionId?)
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
| GET | `/households/:id/members/suggestions` | Utilisateurs Budgio non encore membres (ADMIN) |
| POST | `/households/:id/members` | Inviter un membre (ADMIN) |
| PATCH | `/households/:id/members/:memberId` | Changer le rôle d'un membre (ADMIN) |
| DELETE | `/households/:id/members/:memberId` | Retirer un membre (ADMIN) |
| GET | `/households/:id/history` | Journal d'activité du foyer |

### Catégories

| Méthode | Route | Description |
|---------|-------|-------------|
| GET | `/households/:id/categories` | Lister les catégories du foyer (triées par `order`) |
| POST | `/households/:id/categories` | Créer une catégorie (label + couleur) |
| PUT | `/households/:id/categories/reorder` | Réordonner les catégories (`{ items: [{ id, order }] }`) |
| PATCH | `/households/:id/categories/:categoryId` | Modifier une catégorie |
| DELETE | `/households/:id/categories/:categoryId` | Supprimer une catégorie (ADMIN) |

### Transactions

| Méthode | Route | Description |
|---------|-------|-------------|
| GET | `/households/:id/transactions` | Lister les transactions (`?year=&month=` optionnels, `?q=` pour recherche full-text) |
| GET | `/households/:id/transactions/annual` | Résumé des 12 mois d'une année (`?year=` requis) |
| GET | `/households/:id/transactions/stats` | Statistiques 12 mois glissants — solde, moyennes, top catégories |
| GET | `/households/:id/transactions/dashboard` | Tableau de bord mensuel (`?year=&month=` requis) |
| POST | `/households/:id/transactions` | Créer une transaction |
| PATCH | `/households/:id/transactions/:txId` | Modifier une transaction |
| DELETE | `/households/:id/transactions/:txId` | Supprimer une transaction |

Le dashboard retourne : `{ openingBalance, totalIn, totalOut, closingBalance, byCategory[] }`.

La vue annuelle retourne : `{ year, openingBalance, months[12], totalIn, totalOut, closingBalance }`.

La recherche (`?q=terme`) filtre par label (insensible à la casse) sur toutes les dates, limitée à 100 résultats.

La création d'une transaction avec `goalId` crée automatiquement une `GoalContribution` du même montant.

### Mouvements fixes (Recurring)

| Méthode | Route | Description |
|---------|-------|-------------|
| GET | `/households/:id/recurring` | Lister les mouvements fixes actifs (triés par `order`) |
| POST | `/households/:id/recurring` | Créer un mouvement fixe |
| POST | `/households/:id/recurring/replay-month` | Rejouer les occurrences du mois en cours jusqu'à aujourd'hui |
| PUT | `/households/:id/recurring/reorder` | Réordonner les mouvements fixes (`{ items: [{ id, order }] }`) |
| PATCH | `/households/:id/recurring/:recurringId` | Modifier un mouvement fixe |
| DELETE | `/households/:id/recurring/:recurringId` | Désactiver un mouvement fixe |

Fréquences disponibles : `DAILY`, `WEEKDAYS`, `WEEKLY`, `MONTHLY`, `YEARLY`.

L'onglet Fixe affiche une barre de répartition Entrées / Sorties avec les montants et le solde net mensuel.

### Objectifs d'épargne

| Méthode | Route | Description |
|---------|-------|-------------|
| GET | `/households/:id/goals` | Lister les objectifs + progression calculée (triés par `order`) |
| POST | `/households/:id/goals` | Créer un objectif (name, targetAmount, deadline?) |
| PUT | `/households/:id/goals/reorder` | Réordonner les objectifs (`{ items: [{ id, order }] }`) |
| PATCH | `/households/:id/goals/:goalId` | Modifier ou marquer comme atteint |
| DELETE | `/households/:id/goals/:goalId` | Supprimer un objectif |
| POST | `/households/:id/goals/:goalId/contribute` | Ajouter une contribution manuelle |

Chaque objectif retourne : `{ savedAmount, percent, monthlyRecommended }`.

---

## Pages frontend

| Route | Description |
|-------|-------------|
| `/login` | Page de connexion — bouton Google OAuth |
| `/auth/callback` | Réception des tokens après OAuth |
| `/households` | Liste des foyers de l'utilisateur |
| `/households/[id]` | Détail d'un foyer — onglets Mouvements / Fixe / Objectifs / Stats / Membres |
| `/households/[id]/history` | Journal d'activité du foyer |
| `/households/[id]/settings` | Paramètres : renommer, catégories (drag & drop), membres, désactivation |
| `/profile` | Profil utilisateur — modifier le nom et le thème |

L'onglet **Mouvements** offre trois modes de navigation :
- **Vue mensuelle** (défaut) — KPIs, liste filtrée, répartition par catégorie
- **Vue annuelle** (📅) — tableau des 12 mois avec totaux annuels ; cliquer un mois ouvre la vue mensuelle correspondante
- **Recherche** (🔍) — recherche full-text en temps réel sur toutes les transactions du foyer, toutes périodes confondues

L'application est installable en tant que **PWA** (Progressive Web App) : icône sur l'écran d'accueil, mode plein écran, fonctionnement partiel hors ligne grâce au service worker (données API mises en cache sur les dernières requêtes réussies).

---

## Roadmap

### Budgets par catégorie ("enveloppes")

Définir un plafond mensuel par catégorie et visualiser l'avancement en temps réel.

**Objectif** : passer d'un outil de suivi passif à un outil de pilotage actif — savoir *avant* de dépasser, pas après.

**Modèle de données**

```prisma
model CategoryBudget {
  id          String    @id @default(cuid())
  householdId String
  categoryId  String
  amount      Float     // plafond mensuel en €
  month       Int?      // null = applicable tous les mois
  year        Int?
  household   Household @relation(...)
  category    Category  @relation(...)
  @@unique([householdId, categoryId, month, year])
}
```

**API**

| Méthode | Route | Description |
|---------|-------|-------------|
| PUT | `/households/:id/categories/:catId/budget` | Définir / mettre à jour le budget mensuel |
| DELETE | `/households/:id/categories/:catId/budget` | Supprimer le budget |

Le endpoint `/transactions/dashboard` sera enrichi avec `budget` et `spent` par catégorie.

**UI**

Barre de progression par catégorie dans le tableau de bord :

```
🛒 Courses    ████████░░  420 / 500 €   (84%)
🍽️ Restos     ██████████  198 / 150 €   ⚠️ dépassé
```

### Import de relevé bancaire (CSV)

Uploader le CSV exporté depuis sa banque pour éviter la saisie manuelle des transactions.

**Flux**

```
1. Upload CSV (Boursorama, LCL, Revolut…)
2. API parse + normalise (date, libellé, montant)
3. Suggestion de catégorie par matching sur le libellé
   (ex. "LIDL" → 🛒 Courses, "NETFLIX" → 📱 Abonnements)
4. Aperçu côté UI — tableau modifiable avant import
5. Confirmation → création en masse des transactions
```

**API**

| Méthode | Route | Description |
|---------|-------|-------------|
| POST | `/households/:id/transactions/import/preview` | Parse le CSV, retourne les lignes + catégories suggérées |
| POST | `/households/:id/transactions/import/confirm` | Insère les transactions validées (`createMany`) |

Les doublons sont détectés par empreinte `(date + montant + libellé)` avant insertion.

**UI**

Bouton "Importer un relevé" dans `MovementsPanel` → modal avec tableau ligne par ligne permettant d'ajuster la catégorie avant validation.

### Alertes de dépassement de budget

Notifier les membres d'un foyer quand une catégorie dépasse son enveloppe ou quand un objectif est proche de son échéance.

**Déclencheurs**

| Événement | Condition |
|-----------|-----------|
| Dépassement de budget | Dépenses d'une catégorie > plafond mensuel |
| Seuil d'alerte | Dépenses atteignent 90 % du plafond |
| Objectif atteint | `savedAmount >= targetAmount` |
| Échéance proche | Deadline d'un objectif dans ≤ 30 jours et progression < 80 % |

**Canaux envisagés**

- **Email** : notification transactionnelle via un service SMTP (Resend, Mailgun…)
- **Web Push** : notifications navigateur via l'API Push + Service Worker (PWA)

**API**

| Méthode | Route | Description |
|---------|-------|-------------|
| GET | `/households/:id/alerts/preferences` | Préférences de notification du membre |
| PATCH | `/households/:id/alerts/preferences` | Activer / désactiver chaque type d'alerte |

Les alertes sont évaluées à chaque création / modification de transaction et à minuit via le scheduler NestJS existant.

### Solde de départ configurable

Permettre à chaque foyer de saisir le solde réel du compte bancaire à une date donnée, pour que les calculs de solde correspondent à la réalité et pas uniquement aux transactions saisies dans Budgio.

**Modèle de données**

```prisma
model BalanceSeed {
  id          String    @id @default(cuid())
  householdId String    @unique
  amount      Float     // solde réel à la date de référence
  date        DateTime  // date à partir de laquelle le solde est valide
  household   Household @relation(...)
}
```

**Impact sur le calcul de solde**

Le `openingBalance` du mois M devient :

```
openingBalance(M) = BalanceSeed.amount
  + Σ transactions entre BalanceSeed.date et début du mois M
```

Si aucun `BalanceSeed` n'est défini, comportement actuel inchangé (solde cumulé depuis la première transaction).

**UI**

Nouvelle entrée dans `/households/[id]/settings` : "Solde de référence" — champ montant + date de référence.

### Versements automatiques vers un objectif

Associer un mouvement fixe existant à un objectif d'épargne pour alimenter automatiquement la progression de l'objectif à chaque occurrence du mouvement.

**Modèle de données**

Ajout d'un lien optionnel `goalId` sur `RecurringTransaction` :

```prisma
model RecurringTransaction {
  // ...champs existants...
  goalId    String?
  goal      SavingsGoal? @relation(fields: [goalId], references: [id], onDelete: SetNull)
}
```

**Comportement**

Quand le scheduler génère une transaction depuis un mouvement fixe lié à un objectif, il crée automatiquement une `GoalContribution` du même montant — identique au comportement déjà en place pour les transactions manuelles avec `goalId`.

**UI**

Champ "Lier à un objectif" dans `AddRecurringModal`, visible uniquement pour les entrées (`amount > 0`).

### Export PDF / Excel

Permettre d'exporter les transactions d'un mois ou d'une année complète pour la comptabilité ou les déclarations fiscales.

**Formats**

| Format | Usage |
|--------|-------|
| CSV | Import dans Excel, Numbers, Google Sheets |
| PDF | Document imprimable avec récapitulatif mensuel |

**API**

| Méthode | Route | Description |
|---------|-------|-------------|
| GET | `/households/:id/transactions/export?format=csv&year=2026&month=6` | Export CSV du mois |
| GET | `/households/:id/transactions/export?format=csv&year=2026` | Export CSV de l'année |
| GET | `/households/:id/transactions/export?format=pdf&year=2026&month=6` | Export PDF du mois |

Le PDF inclut : en-tête foyer + période, tableau des transactions, récapitulatif Entrées / Sorties / Solde, répartition par catégorie.

**Librairies envisagées** : `papaparse` (CSV), `pdfmake` ou `@react-pdf/renderer` (PDF côté API).

**UI**

Bouton "Exporter" dans `MovementsPanel`, avec choix du format via un menu déroulant.

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
