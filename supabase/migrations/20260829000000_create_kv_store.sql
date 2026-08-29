-- Project Vanta initial KV Store migration
CREATE TABLE IF NOT EXISTS kv_store_d346d9b8 (
  key TEXT NOT NULL PRIMARY KEY,
  value JSONB NOT NULL
);

-- Enable Row Level Security
ALTER TABLE kv_store_d346d9b8 ENABLE ROW LEVEL SECURITY;
