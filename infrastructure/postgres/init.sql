-- This runs automatically on first Docker startup
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email         VARCHAR(255) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS storage_nodes (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  host              VARCHAR(255) NOT NULL,
  port              INTEGER NOT NULL,
  status            VARCHAR(20) NOT NULL DEFAULT 'active',
  capacity_bytes    BIGINT NOT NULL DEFAULT 0,
  used_bytes        BIGINT NOT NULL DEFAULT 0,
  last_heartbeat_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(host, port)
);

CREATE TABLE IF NOT EXISTS files (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  filename         VARCHAR(255) NOT NULL,
  size_bytes       BIGINT NOT NULL,
  chunk_size_bytes INTEGER NOT NULL,
  total_chunks     INTEGER NOT NULL,
  mime_type        VARCHAR(100),
  status           VARCHAR(20) NOT NULL DEFAULT 'uploading',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at       TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS chunks (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  file_id      UUID NOT NULL REFERENCES files(id) ON DELETE CASCADE,
  chunk_index  INTEGER NOT NULL,
  size_bytes   INTEGER NOT NULL,
  checksum     VARCHAR(64) NOT NULL,
  status       VARCHAR(20) NOT NULL DEFAULT 'pending',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(file_id, chunk_index)
);

CREATE TABLE IF NOT EXISTS chunk_replicas (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  chunk_id        UUID NOT NULL REFERENCES chunks(id) ON DELETE CASCADE,
  storage_node_id UUID NOT NULL REFERENCES storage_nodes(id),
  is_primary      BOOLEAN NOT NULL DEFAULT false,
  status          VARCHAR(20) NOT NULL DEFAULT 'active',
  stored_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(chunk_id, storage_node_id)
);

CREATE INDEX IF NOT EXISTS idx_files_owner_id ON files(owner_id);
CREATE INDEX IF NOT EXISTS idx_chunks_file_id ON chunks(file_id);
CREATE INDEX IF NOT EXISTS idx_replicas_chunk_id ON chunk_replicas(chunk_id);
CREATE INDEX IF NOT EXISTS idx_replicas_node_id ON chunk_replicas(storage_node_id);
CREATE INDEX IF NOT EXISTS idx_nodes_status ON storage_nodes(status);
CREATE INDEX IF NOT EXISTS idx_nodes_heartbeat ON storage_nodes(last_heartbeat_at);