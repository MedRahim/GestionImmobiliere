# OpenStack local sur PC — disque C:

Architecture : **1 Controller + 1 Compute** (2 VMs VMware sur C:).

Guide complet : **`deploy/OPENSTACK_CONTROLLER_COMPUTE.md`**

## Chemins

| Quoi | Où |
|------|-----|
| VM Controller | `C:\OpenStack-VMs\openstack-controller\` |
| VM Compute | `C:\OpenStack-VMs\openstack-compute\` |
| Instances Immo Dary | Nova dans Horizon (API + BDD) |
| ISO Ubuntu | `D:\` ou `C:\OpenStack-VMs\ISO\` |
| Code app | `Stage 4éme Esprit\GestionImmobiliere\` |

## Ordre

```
1. 2 VMs VMware (controller 6Go/35Go + compute 4Go/25Go)
2. OpenStack via InstallGuide.pdf (controller puis compute)
3. Horizon → réseau + floating IP
4. 2 instances Nova : immobiliere-api + immobiliere-db
5. PRODUCTION_API_HOST dans devNetwork.ts
```

## Test local sans OpenStack

```powershell
cd deploy\docker
copy ..\openstack\.env.production.example .env
docker compose up -d --build
curl http://localhost:5000/health
```
