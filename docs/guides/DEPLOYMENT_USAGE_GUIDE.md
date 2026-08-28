# Regno AI - Deployment & Usage Guide

## Overview

This guide covers the complete workflow for running Regno AI in both development and production environments.

**Architecture:** Hybrid Gateway + Workers with optional service separation

```
                    ┌──────────────────────┐
                    │   Caddy Gateway      │
                    │   (TLS, Rate Limit)  │
                    └──────────┬───────────┘
                               │
          ┌────────────────────┼────────────────────┐
          │                    │                    │
          ▼                    ▼                    ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│   SvelteKit     │  │ Realtime Server │  │ Execution Svc   │
│   Main App      │  │  (SSE/Stream)   │  │   (Workers)     │
│     :5173       │  │     :3002       │  │     :3003       │
└────────┬────────┘  └────────┬────────┘  └────────┬────────┘
         │                    │                    │
         └────────────────────┼────────────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │     Redis       │
                    │     :6379       │
                    └─────────────────┘
```

---

## Development

### Prerequisites

```bash
# Required
node --version    # v22.x required
npm --version     # v10.x recommended
docker --version  # For Redis/Caddy containers

# Optional
pm2 --version     # For process management
```

### 1. Create / Setup

```bash
# Clone repository
git clone <repository-url>
cd chat

# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Edit .env with your configuration
# Required variables:
#   - MONGO_EXECUTION_URI
#   - CREDENTIALS_ENCRYPTION_SECRET
#   - JWT_SECRET
```

### 2. Build

```bash
# Generate version file (required before build)
npm run generate-version

# Development: No build needed (Vite handles it)
# For testing production build locally:
npm run build
```

### 3. Run

#### Option A: Simple Development (Recommended)

```bash
# Start Redis container
docker run -d --name redis -p 6379:6379 redis:7-alpine

# Start development server
npm run dev

# Access at http://localhost:5173
```

#### Option B: Full Development Stack (Docker Compose)

```bash
# Start Redis + Caddy containers
npm run docker:dev

# Start development server
npm run dev

# Access at:
#   - http://localhost:5173 (direct)
#   - http://localhost:8080 (via Caddy)
#   - http://localhost:8081 (Redis Commander)
```

#### Option C: Full Architecture (Separate Services)

Test the production architecture locally with separate Realtime and Execution services:

```bash
# 1. Install service dependencies (first time only)
npm run services:build:realtime

# 2. Start Redis + Caddy
npm run docker:dev

# 3. Switch to full-architecture Caddyfile
docker cp Caddyfile.dev.full $(docker ps -qf "name=caddy"):/etc/caddy/Caddyfile
docker exec $(docker ps -qf "name=caddy") caddy reload --config /etc/caddy/Caddyfile

# 4. Start services (3 separate terminals)

# Terminal 1: SvelteKit (without workers)
npm run dev:no-workers

# Terminal 2: Realtime Server (SSE/streaming)
npm run services:dev:realtime

# Terminal 3: Execution Service (workers)
npm run services:dev:execution
# Or equivalently:
npm run workers:dev

# Access at: http://localhost:8080 (via Caddy with routing)
```

**Note:** The Execution Service now runs directly from the main project using `src/worker-entry.ts`, which imports the real BullMQ workers. This ensures all workers have access to the complete application context (MongoDB, LLM services, Stage orchestrator, etc.).

**Service Ports:**
| Service | Port | Description |
|---------|------|-------------|
| SvelteKit | 5173 | Main app (ENABLE_WORKERS=false) |
| Realtime | 3002 | SSE/streaming endpoints |
| Execution | 3003 | BullMQ workers |
| Caddy | 8080 | Gateway (routes to services) |
| Redis | 6379 | Queues, pub/sub |

#### Option D: Development with Monitoring

```bash
# Start with loading monitor
npm run dev:monitor

# OR with auto-loading monitor
npm run dev:auto

# Analyze loading patterns
npm run loading:analyze
```

### Development Commands Reference

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite dev server |
| `npm run dev:monitor` | Dev with loading monitor |
| `npm run dev:auto` | Dev with auto-loading monitor |
| `npm run docker:dev` | Start dev containers (Redis, Caddy) |
| `npm run docker:dev:down` | Stop dev containers |
| `npm run docker:dev:logs` | View dev container logs |
| `npm run logs` | Start log server (separate terminal) |
| `npm run check` | TypeScript type checking |
| `npm run test` | Run tests |
| `npm run test:watch` | Run tests in watch mode |
| `npm run test:queues` | Run queue-specific tests |

### Development Environment Variables

```bash
# .env (development)

# Required
MONGO_EXECUTION_URI=mongodb://localhost:27017
MONGO_DB_NAME=regno
CREDENTIALS_ENCRYPTION_SECRET=dev-secret-key-change-in-production
JWT_SECRET=dev-jwt-secret-change-in-production

# Redis (optional - uses in-memory if not set)
REDIS_URL=redis://localhost:6379

# Workers (default: enabled in dev)
ENABLE_WORKERS=true

# Log Server (optional)
ENABLE_LOG_SERVER=true
VITE_ENABLE_LOG_SERVER=true
LOG_SERVER_PORT=3001
VITE_LOG_SERVER_URL=http://localhost:3001
```

---

## Production

### Prerequisites

```bash
# Required on production server
node --version    # v22.x
npm --version     # v10.x
docker --version  # v24.x+
docker compose --version  # v2.x

# Recommended
pm2 --version     # Process management
```

### 1. Deploy / Setup

#### Option A: Docker Compose (Recommended)

```bash
# Clone to production server
git clone <repository-url> /var/www/regno
cd /var/www/regno

# Copy and configure environment
cp .env.example .env
nano .env  # Edit production values

# Create required directories
mkdir -p logs
mkdir -p data/redis
```

#### Option B: PM2 Deployment

```bash
# Clone repository
git clone <repository-url> /var/www/regno
cd /var/www/regno

# Install dependencies
npm install

# Copy environment
cp .env.example .env
nano .env
```

### 2. Create / Configure

#### Production Environment Variables

```bash
# .env (production)

# ============================================
# Core Configuration
# ============================================
NODE_ENV=production

# MongoDB
MONGO_EXECUTION_URI=mongodb://mongo:27017
MONGO_DB_NAME=regno_prod
MONGO_EXECUTION_TTL_DAYS=30

# Security (CHANGE THESE!)
CREDENTIALS_ENCRYPTION_SECRET=<generate-32-char-random-string>
JWT_SECRET=<generate-64-char-random-string>

# ============================================
# Domain & TLS
# ============================================
DOMAIN=app.yourcompany.com
TLS_EMAIL=admin@yourcompany.com

# ============================================
# Service URLs (Docker internal)
# ============================================
SVELTEKIT_URL=sveltekit:5173
REALTIME_URL=realtime:3002
EXECUTION_URL=execution:3003
REDIS_URL=redis://redis:6379

# ============================================
# Workers
# ============================================
ENABLE_WORKERS=false  # Workers run in separate service

# Worker Concurrency
WORKER_CONCURRENCY_PIPELINE=3
WORKER_CONCURRENCY_STAGE=2
WORKER_CONCURRENCY_LLM=5
WORKER_CONCURRENCY_CORTEX=3
WORKER_CONCURRENCY_NOTIFICATION=10
WORKER_CONCURRENCY_SCHEDULED=2

# ============================================
# Rate Limiting
# ============================================
RATE_LIMIT_GLOBAL=100
RATE_LIMIT_API=60
RATE_LIMIT_LLM=20

# ============================================
# API Authentication
# ============================================
API_KEYS=key1,key2,key3
ALLOWED_ORIGINS=https://app.yourcompany.com
```

#### Generate Secure Secrets

```bash
# Generate encryption secret (32 chars)
openssl rand -hex 16

# Generate JWT secret (64 chars)
openssl rand -hex 32

# Generate API keys
openssl rand -hex 24
```

### 3. Build

#### Option A: Docker Build

```bash
# Build all Docker images
npm run docker:prod:build

# Or build individually
docker compose -f docker-compose.prod.yml build sveltekit
docker compose -f docker-compose.prod.yml build realtime
docker compose -f docker-compose.prod.yml build execution
```

#### Option B: Local Build + PM2

```bash
# Install dependencies
npm ci --production=false

# Build main application
npm run build

# Build services
npm run services:build

# This runs:
#   - services/realtime: npm install && npm run build
#   - services/execution: npm install && npm run build
```

### 4. Run

#### Option A: Docker Compose (Recommended)

```bash
# Start all production services
npm run docker:prod

# Or with explicit compose file
docker compose -f docker-compose.prod.yml up -d

# View logs
npm run docker:prod:logs

# Stop services
npm run docker:prod:down
```

**Services started:**
| Service | Port | Description |
|---------|------|-------------|
| redis | 6379 (internal) | Job queues, pub/sub, sessions |
| caddy | 80, 443 | TLS termination, routing, rate limiting |
| sveltekit | 5173 (internal) | Main application |
| realtime | 3002 (internal) | SSE/streaming server |
| execution | 3003 (internal) | Worker processes |

#### Option B: PM2 Process Manager

```bash
# Start all services
npm run pm2:start

# Or explicitly
pm2 start ecosystem.config.cjs

# View status
pm2 status

# View logs
npm run pm2:logs
# Or: pm2 logs

# Monitor resources
npm run pm2:monit
# Or: pm2 monit

# Restart all
npm run pm2:restart

# Stop all
npm run pm2:stop
```

**PM2 Processes:**
| Process | Instances | Description |
|---------|-----------|-------------|
| regno-sveltekit | 1 | Main application |
| regno-realtime | 1 | SSE server |
| regno-execution | 2 (cluster) | Worker processes |

#### Option C: Hybrid (Docker + PM2)

```bash
# Start Redis with Docker
docker run -d --name redis \
  -p 6379:6379 \
  -v redis-data:/data \
  redis:7-alpine redis-server --appendonly yes

# Start Caddy with Docker
docker run -d --name caddy \
  -p 80:80 -p 443:443 \
  -v ./Caddyfile.prod:/etc/caddy/Caddyfile \
  -v caddy-data:/data \
  -v caddy-config:/config \
  caddy:2-alpine

# Start application services with PM2
pm2 start ecosystem.config.cjs --env production
```

### Production Commands Reference

| Command | Description |
|---------|-------------|
| `npm run docker:prod` | Start all production containers |
| `npm run docker:prod:down` | Stop all production containers |
| `npm run docker:prod:logs` | View production container logs |
| `npm run docker:prod:build` | Build production Docker images |
| `npm run pm2:start` | Start all PM2 processes |
| `npm run pm2:stop` | Stop all PM2 processes |
| `npm run pm2:restart` | Restart all PM2 processes |
| `npm run pm2:logs` | View PM2 logs |
| `npm run pm2:monit` | PM2 resource monitor |
| `npm run services:build` | Build realtime + execution services |

---

## Scaling

### Scale Workers (PM2)

```bash
# Scale execution workers
pm2 scale regno-execution 4

# Scale realtime server (if needed)
pm2 scale regno-realtime 2
```

### Scale Workers (Docker)

```bash
# Scale execution service
docker compose -f docker-compose.prod.yml up -d --scale execution=4

# Scale realtime service
docker compose -f docker-compose.prod.yml up -d --scale realtime=2
```

### Worker Concurrency Tuning

```bash
# .env - Adjust per instance
WORKER_CONCURRENCY_PIPELINE=3   # CPU-intensive
WORKER_CONCURRENCY_STAGE=2      # AI reasoning
WORKER_CONCURRENCY_LLM=5        # IO-bound
WORKER_CONCURRENCY_CORTEX=3     # Vector operations
WORKER_CONCURRENCY_NOTIFICATION=10  # Light, fast
WORKER_CONCURRENCY_SCHEDULED=2  # Background tasks
```

---

## Health Checks

### Application Health

```bash
# Main application
curl http://localhost:5173/api/health

# Queue status
curl http://localhost:5173/api/queues/status
```

### Service Health (Production)

```bash
# Realtime server
curl http://localhost:3002/health

# Execution service
curl http://localhost:3003/health
curl http://localhost:3003/ready
curl http://localhost:3003/live

# Prometheus metrics
curl http://localhost:3003/metrics
```

### Docker Health

```bash
# Container status
docker compose -f docker-compose.prod.yml ps

# Container logs
docker compose -f docker-compose.prod.yml logs -f sveltekit
docker compose -f docker-compose.prod.yml logs -f realtime
docker compose -f docker-compose.prod.yml logs -f execution
```

---

## Monitoring

### Bull Board (Queue UI)

Access at: `https://your-domain.com/admin/queues`

Shows:
- Queue depths
- Job statuses
- Processing times
- Failed jobs with stack traces

### PM2 Monitoring

```bash
# Terminal UI
pm2 monit

# Web dashboard (requires pm2-plus)
pm2 plus
```

### Log Files

| Location | Content |
|----------|---------|
| `logs/sveltekit-out.log` | Main app stdout |
| `logs/sveltekit-error.log` | Main app errors |
| `logs/realtime-out.log` | SSE server stdout |
| `logs/realtime-error.log` | SSE server errors |
| `logs/execution-out.log` | Workers stdout |
| `logs/execution-error.log` | Workers errors |

---

## Backup

### Database Backup

```bash
# Manual backup
npm run backup

# Versioned backup
npm run backup:patch  # 1.0.0 -> 1.0.1
npm run backup:minor  # 1.0.0 -> 1.1.0
npm run backup:major  # 1.0.0 -> 2.0.0

# Auto backup (skip version prompt)
npm run backup:auto
```

### Redis Persistence

Redis is configured with AOF (Append Only File) persistence:
- Data saved to `data/redis/` (Docker)
- Survives container restarts

---

## Shutdown

### Development Shutdown

#### Option A: Simple Development

```bash
# Stop Vite dev server
# Press Ctrl+C in the terminal running npm run dev

# Stop Redis container
docker stop redis
docker rm redis  # Optional: remove container
```

#### Option B: Docker Compose Development

```bash
# Stop all dev containers (Redis, Caddy, Redis Commander)
npm run docker:dev:down

# Or explicitly
docker compose -f docker-compose.dev.yml down

# Stop and remove volumes (clears Redis data)
docker compose -f docker-compose.dev.yml down -v
```

#### Option C: Stop Log Server

```bash
# If running in separate terminal, press Ctrl+C
# Or find and kill the process
lsof -i :3001 | grep node | awk '{print $2}' | xargs kill
```

---

### Production Shutdown

#### Option A: Docker Compose (Graceful)

```bash
# Graceful shutdown (waits for jobs to complete)
npm run docker:prod:down

# Or explicitly
docker compose -f docker-compose.prod.yml down

# With timeout (default 10s, extend for long jobs)
docker compose -f docker-compose.prod.yml down --timeout 60

# Stop specific service only
docker compose -f docker-compose.prod.yml stop execution
docker compose -f docker-compose.prod.yml stop realtime
docker compose -f docker-compose.prod.yml stop sveltekit

# Stop and remove everything (including volumes - DATA LOSS!)
docker compose -f docker-compose.prod.yml down -v
```

#### Option B: PM2 (Graceful)

```bash
# Stop all services gracefully
npm run pm2:stop

# Or explicitly
pm2 stop all

# Stop specific service
pm2 stop regno-sveltekit
pm2 stop regno-realtime
pm2 stop regno-execution

# Delete from PM2 (removes from process list)
pm2 delete all

# Save PM2 state (for auto-restart on reboot)
pm2 save

# Kill PM2 daemon entirely
pm2 kill
```

#### Option C: Hybrid (Docker + PM2)

```bash
# Stop PM2 processes first (graceful worker shutdown)
pm2 stop all

# Then stop Docker services
docker stop caddy redis

# Remove containers
docker rm caddy redis
```

---

### Graceful Shutdown Behavior

#### Workers (Execution Service)

Workers are configured for graceful shutdown:

```javascript
// ecosystem.config.cjs
kill_timeout: 30000,  // 30 seconds to finish current jobs
wait_ready: true,
listen_timeout: 10000,
```

**What happens:**
1. SIGTERM sent to workers
2. Workers stop accepting new jobs
3. Current jobs complete (up to 30s timeout)
4. Workers exit cleanly
5. Incomplete jobs remain in queue for restart

#### Realtime Server (SSE Connections)

```javascript
// Graceful shutdown in services/realtime/src/index.ts
process.on('SIGTERM', async () => {
  // Stop accepting new connections
  server.close();
  // Close Redis connections
  await closeConnections();
  // Exit
  process.exit(0);
});
```

**What happens:**
1. Server stops accepting new SSE connections
2. Existing connections receive close event
3. Clients automatically reconnect after restart

#### Main Application (SvelteKit)

```javascript
// Graceful shutdown in hooks.server.ts
process.on('SIGTERM', async () => {
  await closeAllWorkers();  // If workers enabled
  await closeConnections(); // Redis connections
  process.exit(0);
});
```

---

### Emergency Shutdown

#### Force Kill (Use with Caution)

```bash
# Docker - force stop (may lose in-progress jobs)
docker compose -f docker-compose.prod.yml kill

# PM2 - force kill
pm2 kill

# Kill specific port
lsof -i :5173 | grep node | awk '{print $2}' | xargs kill -9
lsof -i :3002 | grep node | awk '{print $2}' | xargs kill -9
lsof -i :3003 | grep node | awk '{print $2}' | xargs kill -9
```

#### Recovery After Force Kill

```bash
# Check for orphaned jobs in Redis
redis-cli LLEN bull:pipeline-execution:active
redis-cli LLEN bull:stage-generation:active

# Jobs in 'active' state during crash will be retried
# BullMQ handles stalled job recovery automatically
```

---

### Maintenance Mode

#### Pause Workers (Keep API Running)

```bash
# Via API endpoint
curl -X POST http://localhost:5173/api/queues/status \
  -H "Content-Type: application/json" \
  -d '{"action": "pause"}'

# Resume workers
curl -X POST http://localhost:5173/api/queues/status \
  -H "Content-Type: application/json" \
  -d '{"action": "resume"}'
```

#### Drain Queues Before Shutdown

```bash
# Wait for all active jobs to complete
watch -n 5 'curl -s http://localhost:5173/api/queues/status | jq .queues[].active'

# When all show 0 active jobs, safe to shutdown
npm run docker:prod:down
```

---

### Shutdown Commands Quick Reference

| Environment | Command | Description |
|-------------|---------|-------------|
| Dev | `Ctrl+C` | Stop Vite dev server |
| Dev | `docker stop redis` | Stop Redis |
| Dev | `npm run docker:dev:down` | Stop all dev containers |
| Prod | `npm run docker:prod:down` | Graceful Docker shutdown |
| Prod | `npm run pm2:stop` | Graceful PM2 shutdown |
| Prod | `pm2 stop regno-execution` | Stop workers only |
| Prod | `docker compose down --timeout 60` | Extended graceful shutdown |
| Emergency | `pm2 kill` | Force kill PM2 |
| Emergency | `docker compose kill` | Force kill containers |

---

## Troubleshooting

### Common Issues

#### Redis Connection Failed

```bash
# Check Redis is running
docker ps | grep redis
# Or
redis-cli ping

# Check Redis URL in .env
echo $REDIS_URL
```

#### Workers Not Processing

```bash
# Check worker status
curl http://localhost:3003/status

# Check queue status
curl http://localhost:5173/api/queues/status

# View worker logs
pm2 logs regno-execution
# Or
docker compose -f docker-compose.prod.yml logs execution
```

#### SSE Connections Failing

```bash
# Check realtime server
curl http://localhost:3002/health

# Check Caddy routing
curl -v https://your-domain.com/api/queues/jobs/test/events
```

#### High Memory Usage

```bash
# Check PM2 memory
pm2 monit

# Restart workers to clear memory
pm2 restart regno-execution

# Adjust memory limits in ecosystem.config.cjs
# max_memory_restart: '4G'
```

### Debug Mode

```bash
# Enable debug logging
DEBUG=bullmq:* npm run dev

# Enable verbose queue logging
LOG_LEVEL=debug npm run dev
```

---

## Quick Reference

### Development Workflow

```bash
# 1. Setup
npm install
cp .env.example .env

# 2. Start Redis
docker run -d --name redis -p 6379:6379 redis:7-alpine

# 3. Run
npm run dev

# Access: http://localhost:5173
```

### Production Workflow

```bash
# 1. Deploy
git clone <repo> /var/www/regno && cd /var/www/regno

# 2. Configure
cp .env.example .env && nano .env

# 3. Build
npm run docker:prod:build

# 4. Run
npm run docker:prod

# Access: https://your-domain.com
```

---

## Related Documentation

| Document | Description |
|----------|-------------|
| [HYBRID_GATEWAY_WORKERS_ARCHITECTURE.md](../architecture/HYBRID_GATEWAY_WORKERS_ARCHITECTURE.md) | Full architecture details |
| [QUEUE_SYSTEM_ARCHITECTURE.md](../infrastructure/QUEUE_SYSTEM_ARCHITECTURE.md) | Queue system overview |
| [QUEUE_QUICKSTART.md](../infrastructure/QUEUE_QUICKSTART.md) | Queue quick start |
| [QUEUE_API_ENDPOINTS.md](../infrastructure/QUEUE_API_ENDPOINTS.md) | Queue API reference |

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | Dec 2024 | Initial deployment guide |
