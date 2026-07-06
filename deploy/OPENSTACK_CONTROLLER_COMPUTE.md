# OpenStack — 1 Controller + 1 Compute (sur C:)

Architecture **2 nœuds** pour ton PFA : un **controller** (cerveau) + un **compute** (exécute les VMs du projet).

```
[PC Windows — C:\OpenStack-VMs]
│
├── VMware VM 1 : openstack-controller  (Horizon, Keystone, Nova API, Neutron, Glance…)
│
└── VMware VM 2 : openstack-compute     (Nova-compute — lance les instances Immo Dary)
         │
         └── Instances Nova (après install) :
                 ├── immobiliere-api  (Node.js)
                 └── immobiliere-db   (SQL Server Docker)
```

---

## Dossiers sur C:

```
C:\OpenStack-VMs\
├── openstack-controller\    ← VM 1 — disque .vmdk ici
├── openstack-compute\       ← VM 2 — disque .vmdk ici
├── ImmoDary-VMs\            ← notes / exports (optionnel)
├── ISO\                     ← ISO Ubuntu (copie depuis D: si besoin)
└── README.md
```

**ISO Ubuntu 24.04** : peut rester sur **D:** — pointer VMware vers ce chemin à la création.

---

## Specs VMware (PC 20 Go RAM, ~60 Go libre C:)

| VM | Rôle | RAM | Disque (dynamique) | CPU | Dossier |
|----|------|-----|-------------------|-----|---------|
| **openstack-controller** | Controller | **6 Go** | **35 Go** | 2 | `C:\OpenStack-VMs\openstack-controller` |
| **openstack-compute** | Compute | **4 Go** | **25 Go** | 2 | `C:\OpenStack-VMs\openstack-compute` |

**Total** : ~10 Go RAM pour les 2 VMs + Windows → ferme Chrome, Android emulator, etc. pendant les tests.

---

## Réseau VMware (important)

Chaque VM a **2 cartes réseau** :

| Interface | VMware | Usage |
|-----------|--------|--------|
| **ens33** (ex.) | NAT | Internet (apt, docker pull, git) |
| **ens34** (ex.) | Host-only ou Custom VMnet | Réseau **management** entre controller ↔ compute |

Exemple d’IP statiques (à adapter selon ton InstallGuide.pdf) :

| Machine | Management | Accès |
|---------|------------|--------|
| Controller | `192.168.56.10` | Horizon `http://192.168.56.10/dashboard` |
| Compute | `192.168.56.11` | SSH admin |

> Utilise les **mêmes** noms d’hôte et IP que ton **InstallGuide.pdf** (controller / compute).

---

## Phase 1 — Créer les 2 VMs (VMware)

### VM Controller

1. **Create New Virtual Machine** → Ubuntu 64-bit, ISO 24.04
2. Folder : `C:\OpenStack-VMs\openstack-controller`
3. RAM 6144 Mo, disque 35 Go, 2 CPU
4. Réseau : **NAT** + **Host-only** (ajouter 2e adaptateur dans VM Settings)
5. Hostname Linux : `controller` (ou selon guide)
6. Installer **Ubuntu Server 24.04**

### VM Compute

1. Même ISO, folder : `C:\OpenStack-VMs\openstack-compute`
2. RAM 4096 Mo, disque 25 Go, 2 CPU
3. **Mêmes** réglages réseau (NAT + Host-only)
4. Hostname : `compute`

### Après install (les deux VMs)

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y openssh-server curl git vim net-tools
```

Configurer IP statiques sur l’interface **management** (netplan) — voir guide PDF.

Vérifier depuis le controller :

```bash
ping 192.168.56.11   # compute
```

---

## Phase 2 — Installer OpenStack (InstallGuide.pdf)

Suivre ton **InstallGuide.pdf** dans cet ordre :

1. **Controller d’abord** — Keystone, Glance, Nova (controller), Neutron, Horizon…
2. **Compute ensuite** — installer `nova-compute`, rejoindre le controller
3. Vérifier dans Horizon : **Admin → Compute → Hypervisors** → le nœud **compute** apparaît

### Checklist OpenStack OK

- [ ] Horizon ouvre et login admin fonctionne
- [ ] Hypervisor **compute** = **up**
- [ ] Tu peux créer une **test instance** (cirros) qui passe à **Active**

---

## Phase 3 — Réseau OpenStack pour Immo Dary

Dans **Horizon** (sur le controller) :

### 3.1 Réseau privé

- Network → Create → `immobiliere-net`
- Subnet : `10.0.10.0/24`, gateway `10.0.10.1`, DHCP ON

### 3.2 Router + Floating IP

- Lier au réseau externe du projet
- Allouer une **floating IP** (pool public)

### 3.3 Security groups

**sg-api** (instance API) :

| Ingress | Port | Source |
|---------|------|--------|
| TCP | 22 | ton IP |
| TCP | 5000 | `0.0.0.0/0` |

**sg-db** (instance BDD) :

| Ingress | Port | Source |
|---------|------|--------|
| TCP | 22 | ton IP |
| TCP | 1433 | subnet `10.0.10.0/24` seulement |

---

## Phase 4 — Déployer Immo Dary (2 instances Nova)

Les instances tournent sur le **compute**, pas sur les VMs VMware OpenStack.

| Instance | IP privée | User data | Rôle |
|----------|-----------|-----------|------|
| `immobiliere-db` | `10.0.10.20` | `deploy/openstack/cloud-init-db.sh` | SQL Server Docker |
| `immobiliere-api` | `10.0.10.10` | `deploy/openstack/cloud-init-api.sh` | Node.js + PM2 |

1. Créer **db** d’abord, attendre SQL prêt
2. Créer **api**, floating IP sur l’API
3. SSH sur API :

```bash
git clone https://github.com/MedRahim/GestionImmobiliere.git /opt/immobiliere
cd /opt/immobiliere/backend
cp deploy/openstack/.env.production.example .env
# Éditer : DB_HOST=10.0.10.20, JWT_SECRET, DB_PASSWORD
npm ci --omit=dev
pm2 start src/app.js --name immobiliere-api
```

4. Initialiser BDD : `database/schema.sql` + `seed-data.sql` (voir `deploy/scripts/init-database.sh`)

5. Test :

```bash
curl http://<FLOATING_IP>:5000/health
```

---

## Phase 5 — App mobile

`mobile/src/config/devNetwork.ts` :

```ts
export const PRODUCTION_API_HOST = 'http://<FLOATING_IP>:5000';
```

Rebuild APK release → téléphone en Wi‑Fi/4G.

---

## Résumé pour l’encadreur

> « J’ai déployé OpenStack sur **deux nœuds** : un **controller** (services de gestion et Horizon) et un **compute** (exécution des VMs). L’application Immo Dary est déployée en **deux instances** sur ce cloud : une pour l’API Node.js et une pour SQL Server, avec floating IP sur l’API. »

---

## Dépannage

| Problème | Piste |
|----------|--------|
| Compute pas visible | Réseau management, `nova-compute` service, firewall |
| Pas assez de RAM | Fermer apps Windows ; flavor `m1.tiny` pour tests |
| Disque C plein | Disques **dynamiques** ; ne pas allouer 80 Go fixes |
| 2 VMs VMware lentes | Normal sur 20 Go — snapshots avant gros changements |

---

## Fichiers projet liés

| Fichier | Rôle |
|---------|------|
| `deploy/OPENSTACK.md` | Déploiement API + BDD (détail) |
| `deploy/openstack/cloud-init-api.sh` | Bootstrap VM API |
| `deploy/openstack/cloud-init-db.sh` | Bootstrap VM BDD |
| `deploy/openstack/.env.production.example` | Variables prod |
| `deploy/docker/docker-compose.yml` | Test local avant cloud |
