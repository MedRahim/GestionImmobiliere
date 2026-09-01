# Immo Dary — Gestion Immobilière

Application mobile de gestion immobilière (PFA) : annonces vente/location, carte OpenStreetMap, messagerie, notifications, Guide IA (Groq), réservations Stripe.

**Dépôt :** [github.com/MedRahim/GestionImmobiliere](https://github.com/MedRahim/GestionImmobiliere)

## Stack

| Couche | Technologie |
|--------|-------------|
| Mobile | React Native 0.72 (Android) |
| API | Node.js, Express |
| Base | SQL Server |
| Déploiement | Docker, Azure VM |
| IA | Groq API (llama-3.1-8b-instant) |

## Structure

```
GestionImmobiliere/
├── backend/         API REST (auth, biens, messages, IA, réservations)
├── mobile/          Application React Native
├── database/        Schéma SQL + données de test
├── deploy/docker/   Stack Docker (SQL Server + API)
├── landing/         Site vitrine + APK (branche gh-pages)
└── docs/            Documentation projet
```

## Démarrage rapide

### Base de données

1. Créer la base `RealEstateManagement` dans SQL Server
2. Exécuter `database/schema.sql` puis `database/seed-data.sql`

### Backend

```powershell
cd backend
copy .env.example .env
npm install
npm run dev
```

Variables principales : `DB_*`, `JWT_SECRET`, `GROQ_API_KEY`, `GOOGLE_CLIENT_ID`.

### Mobile

```powershell
cd mobile
npm install
npm run android
```

APK release : `cd mobile/android && .\gradlew.bat assembleRelease`

### Docker (production locale)

```powershell
cd deploy/docker
docker compose up -d --build
```

## Production

- **API :** http://74.248.16.228:5000
- **Site / APK :** https://medrahim.github.io/GestionImmobiliere/

## Auteur

Med Rahim Ben Nejma — ESPRIT — Stage PLM-Ressources
