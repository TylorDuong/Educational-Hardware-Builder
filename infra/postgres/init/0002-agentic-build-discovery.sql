-- Agentic Build Discovery persistence. All writes are made by the application API.

CREATE TABLE IF NOT EXISTS source_policies (
  id text NOT NULL,
  revision integer NOT NULL CHECK (revision > 0),
  enabled boolean NOT NULL DEFAULT true,
  source_class text NOT NULL CHECK (source_class IN ('documentation', 'vendor_catalog')),
  allowed_url_patterns jsonb NOT NULL,
  allowed_facts jsonb NOT NULL,
  refresh_interval_hours integer NOT NULL CHECK (refresh_interval_hours > 0),
  max_staleness_hours integer NOT NULL CHECK (max_staleness_hours >= refresh_interval_hours),
  terms jsonb NOT NULL,
  cad_asset_rules jsonb,
  offer_rules jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (id, revision),
  CHECK (id ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  CHECK (jsonb_typeof(allowed_url_patterns) = 'array'),
  CHECK (jsonb_array_length(allowed_url_patterns) > 0),
  CHECK (jsonb_typeof(allowed_facts) = 'array'),
  CHECK (jsonb_array_length(allowed_facts) > 0),
  CHECK (jsonb_typeof(terms) = 'object'),
  CHECK (source_class <> 'vendor_catalog' OR offer_rules IS NOT NULL),
  CHECK (source_class <> 'documentation' OR offer_rules IS NULL)
);

CREATE TABLE IF NOT EXISTS source_documents (
  id uuid PRIMARY KEY,
  source_policy_id text NOT NULL,
  source_policy_revision integer NOT NULL,
  external_id text NOT NULL,
  canonical_url text NOT NULL,
  title text NOT NULL,
  locator text NOT NULL,
  content_hash text NOT NULL,
  license text NOT NULL,
  terms_status text NOT NULL CHECK (terms_status IN ('public-documentation', 'public-catalog', 'redistribution-permitted')),
  fetched_at timestamptz NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (source_policy_id, source_policy_revision) REFERENCES source_policies (id, revision),
  UNIQUE (source_policy_id, source_policy_revision, external_id, content_hash),
  CHECK (canonical_url ~ '^https://'),
  CHECK (length(trim(title)) > 0),
  CHECK (length(trim(locator)) > 0),
  CHECK (content_hash ~ '^[A-Fa-f0-9]{64}$'),
  CHECK (length(trim(license)) > 0),
  CHECK (expires_at >= fetched_at)
);

CREATE TABLE IF NOT EXISTS source_document_chunks (
  id uuid PRIMARY KEY,
  source_document_id uuid NOT NULL REFERENCES source_documents(id) ON DELETE CASCADE,
  external_id text NOT NULL,
  content text NOT NULL,
  citation jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (source_document_id, external_id),
  CHECK (length(trim(content)) > 0),
  CHECK (jsonb_typeof(citation) = 'object'),
  CHECK (citation ? 'sourceUrl' AND citation ? 'locator' AND citation ? 'title')
);

CREATE TABLE IF NOT EXISTS ingestion_runs (
  id uuid PRIMARY KEY,
  source_policy_id text NOT NULL,
  source_policy_revision integer NOT NULL,
  idempotency_key text NOT NULL,
  status text NOT NULL CHECK (status IN ('received', 'processing', 'accepted', 'rejected', 'partial_failure')),
  accepted_count integer NOT NULL DEFAULT 0 CHECK (accepted_count >= 0),
  rejected_count integer NOT NULL DEFAULT 0 CHECK (rejected_count >= 0),
  retryable boolean NOT NULL DEFAULT false,
  error_details jsonb NOT NULL DEFAULT '[]'::jsonb,
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  FOREIGN KEY (source_policy_id, source_policy_revision) REFERENCES source_policies (id, revision),
  UNIQUE (source_policy_id, source_policy_revision, idempotency_key),
  CHECK (length(trim(idempotency_key)) > 0),
  CHECK (jsonb_typeof(error_details) = 'array'),
  CHECK (completed_at IS NULL OR completed_at >= started_at)
);

CREATE TABLE IF NOT EXISTS catalog_offers (
  id uuid PRIMARY KEY,
  part_id uuid NOT NULL REFERENCES parts_catalog(id),
  source_document_id uuid NOT NULL REFERENCES source_documents(id),
  external_id text NOT NULL,
  provider text NOT NULL,
  provider_sku text NOT NULL,
  purchase_url text NOT NULL,
  availability text NOT NULL CHECK (availability IN ('in_stock', 'out_of_stock', 'backorder', 'unknown')),
  price numeric(12, 2),
  currency char(3),
  observed_at timestamptz NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (source_document_id, external_id),
  UNIQUE (part_id, provider, provider_sku, observed_at),
  CHECK (purchase_url ~ '^https://'),
  CHECK (length(trim(provider)) > 0),
  CHECK (length(trim(provider_sku)) > 0),
  CHECK ((price IS NULL AND currency IS NULL) OR (price > 0 AND currency ~ '^[A-Z]{3}$')),
  CHECK (expires_at >= observed_at)
);

CREATE TABLE IF NOT EXISTS compatibility_records (
  id uuid PRIMARY KEY,
  source_part_id uuid NOT NULL REFERENCES parts_catalog(id),
  target_part_id uuid NOT NULL REFERENCES parts_catalog(id),
  relation text NOT NULL CHECK (relation IN ('compatible', 'alternative', 'incompatible')),
  citation jsonb NOT NULL,
  validity_state text NOT NULL CHECK (validity_state IN ('valid', 'deprecated', 'rejected')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (source_part_id, target_part_id, relation),
  CHECK (source_part_id <> target_part_id),
  CHECK (jsonb_typeof(citation) = 'object'),
  CHECK (citation ? 'sourceUrl' AND citation ? 'locator' AND citation ? 'title')
);

CREATE TABLE IF NOT EXISTS discovery_requests (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users(id),
  learner_mode text NOT NULL CHECK (learner_mode IN ('beginner', 'intermediate')),
  prompt text NOT NULL,
  budget jsonb,
  inventory_part_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  constraints jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL CHECK (status IN ('queued', 'safety-screened', 'intent-validated', 'retrieving', 'catalog-matched', 'generating', 'validating', 'ready', 'blocked', 'error')),
  safety_outcome text CHECK (safety_outcome IN ('approved', 'blocked', 'review_required')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (length(trim(prompt)) > 0),
  CHECK (budget IS NULL OR jsonb_typeof(budget) = 'object'),
  CHECK (jsonb_typeof(inventory_part_ids) = 'array'),
  CHECK (jsonb_typeof(constraints) = 'array'),
  CHECK (status <> 'blocked' OR safety_outcome = 'blocked')
);

CREATE TABLE IF NOT EXISTS discovery_operations (
  id uuid PRIMARY KEY,
  discovery_request_id uuid NOT NULL REFERENCES discovery_requests(id) ON DELETE CASCADE,
  status text NOT NULL CHECK (status IN ('queued', 'safety', 'intent', 'retrieving', 'catalog', 'generating', 'validating', 'solver', 'complete', 'blocked', 'error')),
  progress_percent numeric(5, 2) CHECK (progress_percent >= 0 AND progress_percent <= 100),
  message text NOT NULL,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (length(trim(message)) > 0),
  CHECK (status <> 'error' OR error_message IS NOT NULL)
);

CREATE TABLE IF NOT EXISTS build_intents (
  id uuid PRIMARY KEY,
  discovery_request_id uuid NOT NULL UNIQUE REFERENCES discovery_requests(id) ON DELETE CASCADE,
  normalized_goal text NOT NULL,
  capabilities jsonb NOT NULL DEFAULT '[]'::jsonb,
  exclusions jsonb NOT NULL DEFAULT '[]'::jsonb,
  retrieval_terms jsonb NOT NULL,
  safety_decision jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (length(trim(normalized_goal)) > 0),
  CHECK (jsonb_typeof(capabilities) = 'array'),
  CHECK (jsonb_typeof(exclusions) = 'array'),
  CHECK (jsonb_typeof(retrieval_terms) = 'array' AND jsonb_array_length(retrieval_terms) > 0),
  CHECK (jsonb_typeof(safety_decision) = 'object')
);

CREATE TABLE IF NOT EXISTS build_proposals (
  id uuid PRIMARY KEY,
  discovery_request_id uuid NOT NULL REFERENCES discovery_requests(id) ON DELETE CASCADE,
  build_intent_id uuid NOT NULL REFERENCES build_intents(id),
  summary text NOT NULL,
  safety_decision jsonb NOT NULL,
  bill_of_materials jsonb NOT NULL,
  citations jsonb NOT NULL,
  freshness text NOT NULL CHECK (freshness IN ('fresh', 'stale')),
  selected boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (length(trim(summary)) > 0),
  CHECK (jsonb_typeof(safety_decision) = 'object'),
  CHECK (jsonb_typeof(bill_of_materials) = 'array'),
  CHECK (jsonb_typeof(citations) = 'array' AND jsonb_array_length(citations) > 0)
);

CREATE TABLE IF NOT EXISTS generated_builds (
  id uuid PRIMARY KEY,
  proposal_id uuid NOT NULL UNIQUE REFERENCES build_proposals(id) ON DELETE CASCADE,
  status text NOT NULL CHECK (status IN ('draft', 'validated', 'workshop_active', 'complete', 'rejected')),
  lesson jsonb NOT NULL,
  troubleshooting jsonb NOT NULL DEFAULT '[]'::jsonb,
  symbolic_mating_selections jsonb NOT NULL DEFAULT '[]'::jsonb,
  citations jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (jsonb_typeof(lesson) = 'object'),
  CHECK (jsonb_typeof(troubleshooting) = 'array'),
  CHECK (jsonb_typeof(symbolic_mating_selections) = 'array'),
  CHECK (jsonb_typeof(citations) = 'array' AND jsonb_array_length(citations) > 0)
);

CREATE INDEX IF NOT EXISTS source_documents_policy_url_idx
  ON source_documents (source_policy_id, source_policy_revision, canonical_url);
CREATE INDEX IF NOT EXISTS source_documents_freshness_idx
  ON source_documents (expires_at, fetched_at DESC);
CREATE INDEX IF NOT EXISTS ingestion_runs_status_started_idx
  ON ingestion_runs (status, started_at DESC);
CREATE INDEX IF NOT EXISTS catalog_offers_part_freshness_idx
  ON catalog_offers (part_id, expires_at DESC, observed_at DESC);
CREATE INDEX IF NOT EXISTS compatibility_records_lookup_idx
  ON compatibility_records (source_part_id, target_part_id, validity_state);
CREATE INDEX IF NOT EXISTS discovery_requests_user_created_idx
  ON discovery_requests (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS discovery_operations_request_created_idx
  ON discovery_operations (discovery_request_id, created_at);
CREATE INDEX IF NOT EXISTS build_proposals_request_created_idx
  ON build_proposals (discovery_request_id, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS build_proposals_one_selected_per_request_idx
  ON build_proposals (discovery_request_id) WHERE selected;
CREATE INDEX IF NOT EXISTS generated_builds_status_idx
  ON generated_builds (status, created_at DESC);
