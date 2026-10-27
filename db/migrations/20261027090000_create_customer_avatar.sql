-- migrate:up

-- Profile P3: the person's photo, re-encoded by the application to a square
-- WebP without metadata. One per account. The row owns the stored object, so
-- the storage deletion trigger queues the file whenever the row goes (replaced,
-- removed, or deleted with the account) and the sweep deletes it 30 days later.
CREATE TABLE app.customer_avatar (
  id uuid PRIMARY KEY,
  customer_account_id uuid NOT NULL UNIQUE
    REFERENCES app.customer_account(id) ON DELETE CASCADE,
  storage_key text NOT NULL UNIQUE
    CHECK (storage_key ~ '^avatars/[0-9a-f-]{36}/[0-9a-f-]{36}\.webp$'),
  byte_size integer NOT NULL CHECK (byte_size BETWEEN 1 AND 1048576),
  edge_px integer NOT NULL CHECK (edge_px BETWEEN 200 AND 1024),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER customer_avatar_enqueue_deletion
  AFTER DELETE ON app.customer_avatar
  FOR EACH ROW EXECUTE FUNCTION app.enqueue_storage_object_deletion('customer-avatar');

-- migrate:down

DROP TABLE IF EXISTS app.customer_avatar;
