# Déploiement OpenStack — GestionImmobiliere / Immo Dary

Guide pour déployer l'**API Node.js** + **SQL Server** sur OpenStack (Nova, Neutron, Cinder).

L'app **mobile** ne se déploie pas sur OpenStack : elle pointe vers l'IP publique (floating IP) de l'API.

---

## Architecture cible

```
[Téléphone Android]
        │  HTTPS ou HTTP (floating IP)
        ▼
┌─────────────────────────────────────┐
│  VM 1 — API (Ubuntu 22.04)          │
│  Node.js 20 + PM2                   │
│  Port 5000                          │
│  /uploads (volume Cinder)           │
└──────────────┬──────────────────────┘
               │ réseau privé (10.x)
               ▼
┌─────────────────────────────────────┐
│  VM 2 — BDD (Ubuntu 22.04)          │
│  SQL Server 2022 (Docker)          │
│  Port 1433 (interne seulement)      │
└─────────────────────────────────────┘
```

| Composant OpenStack | Usage |
|---------------------|--------|
| **Nova** | 2 instances (API + BDD) |
| **Neutron** | Réseau privé + floating IP sur l'API |
| **Security Groups** | 22 (SSH admin), 5000 (API public), 1433 (BDD → API only) |
| **Cinder** | Volume pour `uploads/` et données SQL |
| **Horizon** | Création manuelle des ressources (ou CLI) |

---

## Phase 0 — Prérequis

1. **Accès OpenStack** : Horizon URL + projet (tenant) + identifiants
2. **Quota** : au moins 2 vCPU, 4 Go RAM, 40 Go disque (recommandé : 2×2 vCPU, 2×4 Go)
3. **Image** : `Ubuntu 22.04 LTS` (cloud image)
4. **Clé SSH** : créer une keypair dans Horizon → télécharger `id_rsa`
5. **Sur ton PC** : [OpenStack CLI](https://docs.openstack.org/python-openstackclient/latest/) (optionnel) ou tout via Horizon

---

## Phase 1 — Réseau & sécurité (Horizon)

### 1.1 Réseau privé

- **Network** → Create Network → nom `immobiliere-net`
- Subnet : `10.0.10.0/24`, gateway `10.0.10.1`, DHCP activé

### 1.2 Router + Internet

- Lier le réseau au **router externe** du projet (External Network)
- Activer une **floating IP** (pool public)

### 1.3 Security groups

**`sg-api`** (sur VM API) :

| Direction | Protocole | Port | Source |
|-----------|-----------|------|--------|
| Ingress | TCP | 22 | Ton IP / bastion |
| Ingress | TCP | 5000 | `0.0.0.0/0` (ou restreindre) |
| Ingress | ICMP | — | admin |
| Egress | all | — | `0.0.0.0/0` |

**`sg-db`** (sur VM BDD) :

| Direction | Protocole | Port | Source |
|-----------|-----------|------|--------|
| Ingress | TCP | 22 | Ton IP |
| Ingress | TCP | 1433 | **sg-api** ou subnet `10.0.10.0/24` |
| Egress | all | — | `0.0.0.0/0` |

> Ne jamais exposer le port 1433 sur Internet.

---

## Phase 2 — VM Base de données

### 2.1 Créer l'instance

- Nom : `immobiliere-db`
- Image : Ubuntu 22.04
- Flavor : `m1.medium` (ou équivalent 2 vCPU / 4 Go)
- Réseau : `immobiliere-net` → IP privée ex. `10.0.10.20`
- Security group : `sg-db`
- Keypair : ta clé SSH
- **User data** : coller le contenu de `openstack/cloud-init-db.sh`

### 2.2 Volume Cinder (optionnel mais recommandé)

- Créer un volume 20 Go → attacher à `immobiliere-db`
- Monter sur `/data` (voir script cloud-init)

### 2.3 Après boot

```bash
ssh -i ta-cle.pem ubuntu@<IP_PRIVEE_via_bastion_ou_floating_temp>
docker ps   # mssql doit tourner
```

Initialiser le schéma (depuis la VM API ou en SSH sur la DB avec sqlcmd dans le conteneur) :

```bash
# Sur la VM DB
docker exec -it mssql /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P 'TonMotDePasseFort!' -C -Q "CREATE DATABASE RealEstateManagement"
# Copier schema.sql + seed-data.sql puis les exécuter
```

---

## Phase 3 — VM API

### 3.1 Créer l'instance

- Nom : `immobiliere-api`
- Même image / keypair
- Réseau : `immobiliere-net` → ex. `10.0.10.10`
- Security group : `sg-api`
- **Floating IP** : associer à cette instance
- **User data** : `openstack/cloud-init-api.sh` (éditer les variables en tête du fichier)

### 3.2 Déployer le code

**Option A — Git (recommandé pour le PFA)**

```bash
ssh ubuntu@<FLOATING_IP>
sudo mkdir -p /opt/immobiliere
sudo chown ubuntu:ubuntu /opt/immobiliere
cd /opt/immobiliere
git clone https://github.com/MedRahim/GestionImmobiliere.git .
cd backend
cp /opt/immobiliere/deploy/openstack/.env.production.example .env
nano .env   # DB_HOST=10.0.10.20, secrets JWT, etc.
npm ci --omit=dev
pm2 start src/app.js --name immobiliere-api
pm2 save
```

**Option B — Docker** (test local d'abord)

```bash
cd deploy/docker
cp ../openstack/.env.production.example .env
docker compose up -d --build
```

### 3.3 Vérifier

```bash
curl http://<FLOATING_IP>:5000/health
curl http://<FLOATING_IP>:5000/api
```

---

## Phase 4 — App mobile

1. Ouvrir `mobile/src/config/devNetwork.ts`
2. Mettre l'IP publique :

```ts
export const PRODUCTION_API_HOST = 'http://<FLOATING_IP>:5000';
```

3. Rebuild l'APK release avec l'URL production
4. Pour la soutenance : téléphone en 4G/Wi‑Fi → API accessible via floating IP

> En production réelle : ajouter **Nginx + HTTPS** (Let's Encrypt) devant le port 5000.

---

## Phase 5 — Checklist soutenance

- [ ] `GET /health` répond depuis Internet
- [ ] Login / register fonctionnent
- [ ] Liste des annonces charge depuis le téléphone
- [ ] Upload image fonctionne (`/uploads` persistant sur volume)
- [ ] BDD non accessible depuis Internet (test : `nmap` port 1433 depuis l'extérieur → fermé)
- [ ] `.env` jamais commité (secrets JWT, SA password)
- [ ] `JWT_SECRET` changé par rapport au dev

---

## Variables d'environnement (production)

Voir `openstack/.env.production.example`.

Points clés :

- `DB_USE_WINDOWS_AUTH=false` (obligatoire sur Linux)
- `DB_HOST=10.0.10.20` (IP **privée** de la VM BDD)
- `NODE_ENV=production`
- `CORS_ORIGIN=*` ou domaine de l'app

---

## Dépannage

| Problème | Solution |
|----------|----------|
| API ne démarre pas | `pm2 logs immobiliere-api` |
| Connexion BDD refusée | Vérifier security group 1433, `DB_HOST`, mot de passe SA |
| App mobile timeout | Floating IP ? Port 5000 ouvert ? Même URL dans `devNetwork.ts` ? |
| Images perdues au reboot | Monter un volume Cinder sur `/opt/immobiliere/backend/uploads` |

---

## Prochaines étapes (optionnel)

- **Nginx** reverse proxy + SSL
- **Heat** template pour automatiser les 2 VMs
- **Swift** pour stocker les images au lieu du disque local
- **GitHub Actions** → déploiement automatique sur push

---

## Commandes OpenStack CLI (référence)

```bash
# Charger les credentials (fichier openrc fourni par l'admin)
source openrc.sh

openstack server list
openstack floating ip create <EXTERNAL_NETWORK>
openstack server add floating ip immobiliere-api <FLOATING_IP>
```
