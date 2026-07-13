# 🗄️ Distributed File Storage System

A production-grade distributed file storage system built from scratch — similar to Google Drive or Dropbox. Implements core distributed systems concepts including file chunking, 3x replication, heartbeat-based failure detection, automatic re-replication, and load balancing across a cluster of storage nodes.

[![Live Demo](https://img.shields.io/badge/Live%20Demo-Visit%20App-2563eb?style=for-the-badge)](https://your-app.vercel.app)
[![Backend](https://img.shields.io/badge/Backend-Railway-7c3aed?style=for-the-badge)](https://railway.app)
[![License](https://img.shields.io/badge/License-MIT-16a34a?style=for-the-badge)](LICENSE)

---

## 📸 Screenshots

| Login (Demo Mode) | File Explorer | Cluster Health |
|---|---|---|
| ![Login](docs/login.png) | ![Files](docs/files.png) | ![Cluster](docs/cluster.png) |

| Storage Usage | Visualization | Upload Flow |
|---|---|---|
| ![Storage](docs/storage.png) | ![Viz](docs/viz.png) | ![Upload](docs/upload.png) |

---

## 🚀 Quick Demo

**One-click demo — no registration needed:**

| Field | Value |
|---|---|
| Email | `demo@dfs.com` |
| Password | `demo1234` |

Click **"🚀 Try Live Demo"** on the login page.

---

## ✨ Features

### Distributed Systems
- **File Chunking** — Files split into 64 MB chunks (same as Google File System)
- **3x Replication** — Every chunk replicated across 3 storage nodes
- **SHA-256 Checksums** — Data integrity verification on every chunk
- **Heartbeat Mechanism** — Storage nodes ping metadata service every 5 seconds
- **Dead Node Detection** — Nodes missing 6 heartbeats marked dead automatically
- **Automatic Re-replication** — Under-replicated chunks detected and re-replicated
- **Load Balancing** — Chunks distributed by available free space (least-used-space strategy)
- **Fault Tolerance** — System survives 2 node failures and still serves files
- **ACID Transactions** — File + chunks + replicas created atomically

### Application
- **JWT Authentication** — Secure login with 7-day token expiry
- **File Upload** — Drag & drop with real-time progress bar
- **File Download** — Chunk-location-aware download plan
- **Soft Delete** — Files recoverable, deferred cleanup
- **Search** — Real-time file search
- **Demo Mode** — Pre-seeded data for instant exploration

### Monitoring & Security
- **Rate Limiting** — Per-route limits (10 auth/15min, 10 uploads/min)
- **Request Logging** — Structured JSON logs via Winston
- **Cluster Health Dashboard** — Live node status
- **Storage Usage Charts** — Per-node breakdown
- **Visualization** — Animated topology, chunk distribution, heartbeat monitor, upload flow

---

## 🏗️ Architecture

```
Browser (React)
      │
      │ HTTPS REST
      ▼
┌─────────────────────────────────┐
│         API Gateway :3000       │
│  Rate limiting · JWT · Logging  │
└────────────┬────────────────────┘
             │
     ┌───────┴────────┐
     ▼                ▼
┌─────────┐    ┌──────────────────────────────┐
│  Auth   │    │      Metadata Service :4001   │
│ Service │    │  Chunking · Replication · LB  │
│  :4002  │    │  Heartbeat Worker · Failure   │
└────┬────┘    └──────────┬───────────────────┘
     │                    │
     ▼                    │ gRPC
┌──────────┐    ┌─────────┼──────────┐
│PostgreSQL│    ▼         ▼          ▼
│  (Neon)  │ ┌──────┐ ┌──────┐ ┌──────┐
└──────────┘ │Node 1│ │Node 2│ │Node 3│
             │:6001 │ │:6002 │ │:6003 │
             └──────┘ └──────┘ └──────┘
              chunk    chunk    chunk
               files   files   files
```

### Upload Flow
```
1. Client → POST /api/files/initiate (filename, size)
2. API Gateway validates JWT
3. Metadata Service calculates chunks (size ÷ 64MB)
4. Load balancer picks 3 active nodes per chunk
5. Client sends chunk bytes to storage nodes via gRPC
6. Storage nodes write to disk, return SHA-256 checksum
7. Client → POST /api/files/:id/confirm (checksums)
8. Metadata Service saves replicas in ACID transaction
9. File marked active ✅
```

### Download Flow
```
1. Client → GET /api/files/:id/download-plan
2. Metadata Service returns ordered chunk list + node locations
3. Client fetches chunks from primary node (falls back to replica)
4. Checksum verified on each chunk
5. Chunks merged in order → original file reconstructed ✅
```

### Failure Detection
```
Every 5s  → Storage node sends heartbeat to metadata service
Every 10s → Heartbeat worker checks for missing heartbeats
After 30s → Node marked 'dead', replicas marked 'lost'
            Background worker finds under-replicated chunks
            Triggers re-replication to healthy nodes
```

---

## 🛠️ Tech Stack

| Layer | Technology | Why |
|---|---|---|
| Frontend | React + Vite | Fast build, component-based |
| API Gateway | Node.js + Express | Single entry point, JWT validation |
| Auth Service | Node.js + JWT + bcrypt | Stateless auth, secure hashing |
| Metadata Service | Node.js + Express | Business logic, chunking, replication |
| Storage Nodes | Node.js + gRPC | Binary protocol for chunk transfer |
| Database | PostgreSQL (Neon) | ACID transactions, relational metadata |
| Cache | Redis (Upstash) | Fast metadata lookups |
| Protocol | REST + gRPC | REST for client-facing, gRPC for node comms |
| Containers | Docker + Docker Compose | One-command local setup |
| Frontend Deploy | Vercel | Free, CDN, instant |
| Backend Deploy | Railway | Free tier, auto-deploy from GitHub |

---

## 📊 Database Schema

```
users
  id · email · password_hash · created_at

storage_nodes
  id · host · port · status · capacity_bytes · used_bytes · last_heartbeat_at

files
  id · owner_id → users · filename · size_bytes · total_chunks · status · deleted_at

chunks
  id · file_id → files · chunk_index · size_bytes · checksum · status

chunk_replicas
  id · chunk_id → chunks · storage_node_id → storage_nodes · is_primary · status
```

**Key design decisions:**
- `deleted_at` on files = soft delete (recoverable, deferred cleanup)
- `checksum` on chunks = SHA-256 fingerprint for corruption detection
- `status` on `chunk_replicas` = `active | lost | stale` for re-replication tracking
- All IDs are UUIDs (no sequential integers in distributed systems)
- `ON DELETE CASCADE` for referential integrity

---

## 📁 Project Structure

```
distributed-file-storage/
│
├── services/
│   ├── auth-service/          Node.js · JWT · bcrypt
│   │   └── src/
│   │       ├── config/        db.js · logger.js
│   │       ├── controllers/   auth.controller.js
│   │       ├── middleware/    asyncHandler · errorHandler
│   │       ├── repositories/  auth.repository.js
│   │       ├── routes/        auth.routes.js
│   │       └── services/      auth.service.js
│   │
│   ├── metadata-service/      Node.js · Chunking · Replication
│   │   └── src/
│   │       ├── config/        db.js · logger.js
│   │       ├── controllers/   file · node controllers
│   │       ├── grpc/          storageClient.js
│   │       ├── repositories/  file · node repositories
│   │       ├── routes/        file · node · health routes
│   │       ├── services/      file.service · node.service
│   │       └── workers/       heartbeatWorker.js
│   │
│   ├── api-gateway/           Node.js · Rate Limiting · Proxy
│   │   └── src/
│   │       ├── config/        logger.js
│   │       └── middleware/    authMiddleware · rateLimiter · requestLogger
│   │
│   └── storage-node/          Node.js · gRPC · SHA-256
│       └── src/
│           ├── grpc/          server.js
│           ├── services/      chunk.service.js
│           └── workers/       heartbeat.js
│
├── frontend/                  React + Vite
│   └── src/
│       ├── api/               index.js (axios client)
│       ├── components/        FileExplorer · FileUpload · ClusterHealth
│       │                      StorageUsage · Visualization · Sidebar
│       ├── context/           AuthContext.jsx
│       ├── pages/             Login · Register · Dashboard
│       └── styles/            global · auth · dashboard · files · cluster · viz
│
└── infrastructure/
    ├── docker-compose.yml     7 services + networking
    └── postgres/
        └── init.sql           Auto-run schema on first start
```

---

## 🔌 API Reference

### Auth Endpoints

| Method | URL | Auth | Description |
|---|---|---|---|
| POST | `/auth/register` | ❌ | Register new user |
| POST | `/auth/login` | ❌ | Login, get JWT |
| GET | `/auth/verify` | ✅ | Verify token (internal) |

### File Endpoints

| Method | URL | Auth | Description |
|---|---|---|---|
| GET | `/api/files` | ✅ | List my files |
| POST | `/api/files/initiate` | ✅ | Start upload, get chunk plan |
| POST | `/api/files/:id/confirm` | ✅ | Confirm upload complete |
| GET | `/api/files/:id/download-plan` | ✅ | Get chunk locations |
| DELETE | `/api/files/:id` | ✅ | Soft delete file |

### Node Endpoints

| Method | URL | Auth | Description |
|---|---|---|---|
| POST | `/api/nodes/register` | ❌ | Storage node registers itself |
| POST | `/api/nodes/:id/heartbeat` | ❌ | Node sends heartbeat |
| GET | `/api/nodes` | ✅ | List all nodes |

### Rate Limits

| Route | Limit |
|---|---|
| POST `/auth/register` | 10 requests / 15 minutes |
| POST `/auth/login` | 10 requests / 15 minutes |
| POST `/api/files/initiate` | 10 requests / 1 minute |
| GET `/api/files/*/download-plan` | 30 requests / 1 minute |
| All other routes | 100 requests / 15 minutes |
| GET `/health` | No limit |

---

## ⚙️ Environment Variables

### Auth Service
```env
PORT=4002
DB_HOST=localhost
DB_PORT=5432
DB_NAME=dfs_metadata
DB_USER=dfs_user
DB_PASSWORD=dfs_password
DB_SSL=false
JWT_SECRET=your_secret_key
JWT_EXPIRES_IN=7d
```

### Metadata Service
```env
PORT=4001
DB_HOST=localhost
DB_PORT=5432
DB_NAME=dfs_metadata
DB_USER=dfs_user
DB_PASSWORD=dfs_password
DB_SSL=false
CHUNK_SIZE_BYTES=67108864
REPLICATION_FACTOR=3
```

### API Gateway
```env
PORT=3000
AUTH_SERVICE_URL=http://auth-service:4002
METADATA_SERVICE_URL=http://metadata-service:4001
LOG_LEVEL=info
```

### Storage Node
```env
NODE_HOST=localhost
NODE_PORT=5001
GRPC_PORT=6001
CAPACITY_BYTES=10737418240
METADATA_SERVICE_URL=http://metadata-service:4001
STORAGE_DIR=./storage
```

---

## 🚀 Run Locally

### Prerequisites
- Docker Desktop
- Node.js 20+
- Git

### One Command Setup

```bash
# Clone
git clone https://github.com/YOUR_USERNAME/distributed-file-storage.git
cd distributed-file-storage

# Start all 7 services
cd infrastructure
docker-compose up --build
```

Wait 2-3 minutes. All services start automatically:

```
✅ PostgreSQL      :5432
✅ Redis           :6379
✅ Auth Service    :4002
✅ Metadata Service:4001
✅ API Gateway     :3000
✅ Storage Node 1  :6001
✅ Storage Node 2  :6002
✅ Storage Node 3  :6003
```

### Start Frontend

```bash
# New terminal
cd frontend
npm install
npm run dev

# Open browser
http://localhost:5173
```

### Stop Everything

```bash
cd infrastructure
docker-compose down
```

### Fresh Start (delete all data)

```bash
docker-compose down -v
docker-compose up --build
```

---

## 🧪 Test APIs

### Register
```bash
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@gmail.com","password":"password123"}'
```

### Login
```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@gmail.com","password":"password123"}'
```

### Check Nodes
```bash
curl http://localhost:3000/api/nodes \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Initiate Upload
```bash
curl -X POST http://localhost:3000/api/files/initiate \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"filename":"test.pdf","sizeBytes":5242880,"mimeType":"application/pdf"}'
```

---

## 🌐 Deployment

| Service | Platform | URL |
|---|---|---|
| Frontend | Vercel | https://dfs-xxx.vercel.app |
| API Gateway | Railway | https://api-gateway-xxx.railway.app |
| Auth Service | Railway | https://auth-service-xxx.railway.app |
| Metadata Service | Railway | https://metadata-service-xxx.railway.app |
| Storage Node 1 | Railway | https://storage-node-1-xxx.railway.app |
| Storage Node 2 | Railway | https://storage-node-2-xxx.railway.app |
| PostgreSQL | Neon | Free 0.5 GB |
| Redis | Upstash | Free 10k req/day |

---

## 📐 Distributed Systems Concepts

| Concept | Implementation |
|---|---|
| **Chunking** | Files split into 64 MB chunks (same as GFS) |
| **Replication** | Each chunk stored on 3 nodes (replication factor = 3) |
| **Consistency** | PostgreSQL ACID transactions for metadata |
| **Fault Tolerance** | Survives 2 simultaneous node failures |
| **Failure Detection** | Heartbeat every 5s, dead after 30s silence |
| **Load Balancing** | Least-used-space node selection |
| **Checksums** | SHA-256 per chunk for corruption detection |
| **Soft Delete** | Deferred cleanup, recoverable files |
| **Separation of Concerns** | Control plane (metadata) vs data plane (storage) |
| **Horizontal Scaling** | Add storage nodes without changing metadata service |

---

## 🔒 Security

- Passwords hashed with bcrypt (cost factor 12)
- JWT tokens with 7-day expiry
- Rate limiting per route (brute force protection)
- CORS headers on API gateway
- SSL/TLS for database connections (production)
- Soft delete prevents accidental data loss
- x-user-id header injection (users can't spoof identity)

---

## 📖 Why I Built This

This project demonstrates production-level distributed systems engineering:

- **Same architecture as GFS/HDFS** — metadata service + data nodes pattern
- **gRPC for binary transfer** — more efficient than REST + base64 for chunk data
- **ACID transactions** — upload either fully succeeds or fully rolls back
- **Operational database design** — proper indexing, foreign keys, soft deletes
- **Microservices** — each service independently deployable and scalable
- **Docker-first** — works identically on any machine with one command

> *"I chose PostgreSQL for metadata because it's relational — files have chunks, chunks have replicas, replicas belong to nodes. This foreign-key graph with cascading deletes and ACID guarantees maps naturally to a relational model, the same reason GFS and HDFS use relational stores for metadata."*

---

## 👨‍💻 Author

**Dilip Pal**
- GitHub: [@paldilip](https://github.com/paldilip202)
- LinkedIn: [linkedin.com/in/paldilip](https://linkedin.com/in/paldilip)

---

## 📄 License

MIT License — see [LICENSE](LICENSE) for details.

---

*Built with Node.js, React, PostgreSQL, gRPC, Docker — deployed on Railway + Vercel*
