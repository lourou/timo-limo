-- Photo Batches
CREATE TABLE IF NOT EXISTS batches (
  id TEXT PRIMARY KEY,
  uploader_name TEXT NOT NULL,
  comment TEXT,
  timestamp INTEGER NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Photos
CREATE TABLE IF NOT EXISTS photos (
  id TEXT PRIMARY KEY,
  batch_id TEXT NOT NULL,
  original_url TEXT NOT NULL,
  thumbnail_url TEXT NOT NULL,
  uploader_name TEXT NOT NULL,
  comment TEXT,
  uploaded_at INTEGER NOT NULL,
  order_index INTEGER NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (batch_id) REFERENCES batches(id)
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_photos_uploaded_at ON photos(uploaded_at DESC);
CREATE INDEX IF NOT EXISTS idx_photos_batch_id ON photos(batch_id);
CREATE INDEX IF NOT EXISTS idx_batches_timestamp ON batches(timestamp DESC);