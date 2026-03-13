# VPS Infrastructure Reference

_Created: 2026-03-14_
_Purpose: Reusable reference for the Netcup VPS automation stack_

---

## Server Details
- **Provider**: Netcup
- **OS**: Ubuntu 22.04.5 LTS (minimal)
- **Disk**: 128G physical (`/dev/vda`), root expanded to ~125G
- **Timezone**: Europe/Istanbul
- **User**: `furkan` (sudo + docker groups)
- **Firewall**: ufw — OpenSSH, 80, 443

## Installed Base Tools
curl, wget, git, ufw, ca-certificates, gnupg, lsb-release, unzip, nano

## Docker Setup
- Docker Engine + Docker Compose plugin
- Docker networks:
  - `web` — shared between Caddy, n8n, OpenClaw gateway
  - `openclaw_default` — internal OpenClaw services

## Service Layout

| Service | Location | Container | Port | Domain |
|---------|----------|-----------|------|--------|
| Caddy | `/opt/caddy` | caddy | 80, 443 | — |
| n8n | `/opt/n8n` | n8n | 5678 | flow.uygunayakkabi.com |
| OpenClaw | `/opt/openclaw` | openclaw-openclaw-gateway-1 | 18789 | agent.uygunayakkabi.com |

## Caddy Configuration (Caddyfile)
```
flow.uygunayakkabi.com {
    reverse_proxy n8n:5678
}

agent.uygunayakkabi.com {
    reverse_proxy openclaw-openclaw-gateway-1:18789
}
```

## DNS (Cloudflare)
- `flow` → A record → VPS IP
- `agent` → A record → VPS IP
- Cloudflare used for DNS only (not proxying VPS traffic)

## Known Operational Issues

### Docker Network Persistence
OpenClaw gateway container was manually connected to `web` network:
```bash
docker network connect web openclaw-openclaw-gateway-1
```
This does NOT survive container restart. Must be made persistent by adding `web` as an external network in OpenClaw's docker-compose.yml.

### Disk Expansion (already resolved)
Root partition was initially ~8.7G despite 128G disk. Fixed with:
```bash
growpart /dev/vda 1
resize2fs /dev/vda1
```

## SSH Access
```bash
ssh furkan@<VPS_IP>
```

## Useful Docker Commands
```bash
# Check all running containers
docker ps

# Check OpenClaw gateway health
docker inspect openclaw-openclaw-gateway-1 --format='{{.State.Health.Status}}'

# View OpenClaw logs
docker logs openclaw-openclaw-gateway-1 --tail 50

# View n8n logs
docker logs n8n --tail 50

# View Caddy logs
docker logs caddy --tail 50

# Restart all services
cd /opt/caddy && docker compose restart
cd /opt/n8n && docker compose restart
cd /opt/openclaw && docker compose restart
```
