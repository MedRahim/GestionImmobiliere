# Branches Git — PFA Gestion Immobiliere

Chaque fonctionnalite est poussee sur une **branche separee**, puis fusionnee dans `main` quand c'est le bon moment du planning.

## Branches

| Branche | Contenu | Statut |
|---------|---------|--------|
| `main` | README + base de donnees | en ligne |
| `feature/api-auth` | API Node.js — authentification JWT | a pousser |
| `feature/api-annonces` | API biens immobiliers (CRUD) | a venir |
| `feature/mobile-login` | App React Native — login / inscription | a venir |
| `feature/mobile-accueil` | Ecrans landing + accueil | a venir |
| `feature/mobile-recherche` | Recherche et filtres | a venir |
| `feature/mobile-carte` | Carte interactive OSM | a venir |
| `feature/mobile-messages` | Messagerie | a venir |
| `feature/mobile-notifications` | Notifications | a venir |
| `feature/mobile-profil` | Profil utilisateur | a venir |

## Workflow

```powershell
cd "c:\Users\MedRa\OneDrive\Bureau\Stage 4éme Esprit\GestionImmobiliere"

# 1. Creer la branche depuis main
git checkout main
git pull
git checkout -b feature/nom-feature

# 2. Ajouter seulement les fichiers de cette etape
git add ...
git commit -m "message court"
git push -u origin feature/nom-feature

# 3. Sur GitHub : Pull Request → Merge dans main (quand pret)

# 4. Revenir sur main en local
git checkout main
git pull
```

## Regles

- **Ne pas tout pousser d'un coup** — une branche = une etape du cahier des charges
- Messages de commit **courts** : `api auth`, `api annonces`, `app mobile login`...
- Auteur : **MedRahim** uniquement
- Le code complet reste en local ; seule une partie part sur GitHub a chaque branche

## Prochaine etape

Branche `feature/api-auth` — backend JWT (register, login, refresh, logout, /me)
