-- Ghim's authoritative learner-data schema.
-- Public is exposed through Supabase's Data API, so every table has RLS and
-- every role grant is explicit. Mutations that must be atomic are functions.

create schema if not exists private;

revoke all on schema private from public, anon, authenticated;
grant usage on schema private to service_role;

create table public.learners (
  id uuid primary key references auth.users (id) on delete restrict,
  display_name text,
  avatar_url text,
  timezone text not null default 'Asia/Ho_Chi_Minh',
  locale text not null default 'vi-VN',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deletion_requested_at timestamptz,
  constraint learners_timezone_not_blank check (btrim(timezone) <> ''),
  constraint learners_locale_not_blank check (btrim(locale) <> '')
);

create table public.lexical_units (
  id bigint generated always as identity primary key,
  canonical_form text not null,
  normalized_form text not null,
  kind text not null default 'word',
  language_code text not null default 'en',
  created_at timestamptz not null default now(),
  constraint lexical_units_canonical_form_not_blank check (btrim(canonical_form) <> ''),
  constraint lexical_units_normalized_form_not_blank check (btrim(normalized_form) <> ''),
  constraint lexical_units_kind_valid check (kind in ('word', 'phrasal_verb', 'idiom', 'compound', 'fixed_expression')),
  constraint lexical_units_language_english check (language_code = 'en'),
  constraint lexical_units_natural_key unique (language_code, normalized_form, kind)
);

create table public.lexical_senses (
  id bigint generated always as identity primary key,
  lexical_unit_id bigint not null references public.lexical_units (id) on delete restrict,
  part_of_speech text not null,
  definition_en text,
  sense_key text not null,
  created_at timestamptz not null default now(),
  constraint lexical_senses_part_of_speech_not_blank check (btrim(part_of_speech) <> ''),
  constraint lexical_senses_sense_key_not_blank check (btrim(sense_key) <> ''),
  constraint lexical_senses_natural_key unique (lexical_unit_id, sense_key),
  constraint lexical_senses_identity unique (id, lexical_unit_id)
);

create index lexical_senses_lexical_unit_id_idx on public.lexical_senses (lexical_unit_id);

create table public.lexical_evidence (
  id bigint generated always as identity primary key,
  lexical_sense_id bigint not null references public.lexical_senses (id) on delete restrict,
  source_name text not null,
  source_version text not null,
  source_record_id text,
  license_code text not null,
  evidence jsonb not null default '{}'::jsonb,
  imported_at timestamptz not null default now(),
  constraint lexical_evidence_source_not_blank check (btrim(source_name) <> '' and btrim(source_version) <> ''),
  constraint lexical_evidence_license_not_blank check (btrim(license_code) <> ''),
  constraint lexical_evidence_payload_object check (jsonb_typeof(evidence) = 'object'),
  constraint lexical_evidence_source_record_unique unique (source_name, source_version, source_record_id)
);

create index lexical_evidence_lexical_sense_id_idx on public.lexical_evidence (lexical_sense_id);

create table public.decks (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references public.learners (id) on delete restrict,
  kind text not null,
  name text not null,
  description text,
  slug text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  constraint decks_kind_valid check (kind in ('starter', 'personal')),
  constraint decks_name_not_blank check (btrim(name) <> ''),
  constraint decks_owner_matches_kind check (
    (kind = 'starter' and owner_id is null and slug is not null)
    or (kind = 'personal' and owner_id is not null and slug is null)
  ),
  constraint decks_starter_slug_unique unique (slug),
  constraint decks_identity_with_owner unique (id, owner_id),
  constraint decks_identity_with_kind unique (id, kind)
);

create index decks_owner_active_idx on public.decks (owner_id, created_at desc) where archived_at is null;

create table public.starter_deck_entries (
  deck_id uuid not null references public.decks (id) on delete restrict,
  deck_kind text not null default 'starter',
  lexical_sense_id bigint not null references public.lexical_senses (id) on delete restrict,
  position integer not null,
  curated_meaning_vi text not null,
  curated_context text not null,
  created_at timestamptz not null default now(),
  primary key (deck_id, lexical_sense_id),
  constraint starter_deck_entries_starter_only foreign key (deck_id, deck_kind)
    references public.decks (id, kind) on delete restrict,
  constraint starter_deck_entries_kind_fixed check (deck_kind = 'starter'),
  constraint starter_deck_entries_position_positive check (position > 0),
  constraint starter_deck_entries_meaning_not_blank check (btrim(curated_meaning_vi) <> ''),
  constraint starter_deck_entries_context_not_blank check (btrim(curated_context) <> ''),
  constraint starter_deck_entries_position_unique unique (deck_id, position)
);

create index starter_deck_entries_sense_idx on public.starter_deck_entries (lexical_sense_id);
create index starter_deck_entries_deck_kind_idx on public.starter_deck_entries (deck_id, deck_kind);

create table public.learner_starter_decks (
  learner_id uuid not null references public.learners (id) on delete restrict,
  starter_deck_id uuid not null,
  deck_kind text not null default 'starter',
  state text not null default 'active',
  adopted_at timestamptz not null default now(),
  removed_at timestamptz,
  primary key (learner_id, starter_deck_id),
  constraint learner_starter_decks_starter_only foreign key (starter_deck_id, deck_kind)
    references public.decks (id, kind) on delete restrict,
  constraint learner_starter_decks_kind_fixed check (deck_kind = 'starter'),
  constraint learner_starter_decks_state_valid check (state in ('active', 'removed')),
  constraint learner_starter_decks_lifecycle_valid check (
    (state = 'active' and removed_at is null)
    or (state = 'removed' and removed_at is not null)
  )
);

create index learner_starter_decks_starter_idx
  on public.learner_starter_decks (starter_deck_id, deck_kind);

create table public.vocabulary_items (
  id uuid primary key default gen_random_uuid(),
  learner_id uuid not null references public.learners (id) on delete restrict,
  lexical_unit_id bigint not null references public.lexical_units (id) on delete restrict,
  lexical_sense_id bigint not null,
  state text not null default 'ready',
  contextual_meaning_vi text not null,
  primary_context text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  constraint vocabulary_items_sense_matches_unit foreign key (lexical_sense_id, lexical_unit_id)
    references public.lexical_senses (id, lexical_unit_id) on delete restrict,
  constraint vocabulary_items_state_valid check (state in ('needs_confirmation', 'ready', 'archived')),
  constraint vocabulary_items_meaning_not_blank check (btrim(contextual_meaning_vi) <> ''),
  constraint vocabulary_items_context_not_blank check (btrim(primary_context) <> ''),
  constraint vocabulary_items_archive_matches_state check (
    (state = 'archived' and archived_at is not null)
    or (state <> 'archived' and archived_at is null)
  ),
  constraint vocabulary_items_identity_with_learner unique (id, learner_id)
);

create unique index vocabulary_items_active_sense_unique
  on public.vocabulary_items (learner_id, lexical_sense_id)
  where archived_at is null;
create index vocabulary_items_learner_state_idx on public.vocabulary_items (learner_id, state, created_at desc);
create index vocabulary_items_lexical_unit_id_idx on public.vocabulary_items (lexical_unit_id);
create index vocabulary_items_sense_unit_idx on public.vocabulary_items (lexical_sense_id, lexical_unit_id);

create table public.vocabulary_encounters (
  id uuid primary key default gen_random_uuid(),
  learner_id uuid not null references public.learners (id) on delete restrict,
  vocabulary_item_id uuid,
  requested_deck_id uuid,
  surface_form text not null,
  context_text text,
  source_url text,
  source_title text,
  capture_method text not null,
  enrichment_state text not null default 'pending',
  idempotency_key text not null,
  captured_at timestamptz not null default now(),
  linked_at timestamptz,
  constraint vocabulary_encounters_item_owner foreign key (vocabulary_item_id, learner_id)
    references public.vocabulary_items (id, learner_id) on delete restrict,
  constraint vocabulary_encounters_deck_owner foreign key (requested_deck_id, learner_id)
    references public.decks (id, owner_id) on delete restrict,
  constraint vocabulary_encounters_surface_not_blank check (btrim(surface_form) <> ''),
  constraint vocabulary_encounters_context_valid check (
    context_text is null
    or btrim(context_text) <> ''
  ),
  constraint vocabulary_encounters_extension_context_required check (
    capture_method = 'manual' or context_text is not null
  ),
  constraint vocabulary_encounters_method_valid check (capture_method in ('manual', 'extension', 'starter_deck')),
  constraint vocabulary_encounters_enrichment_state_valid check (enrichment_state in ('pending', 'processing', 'needs_confirmation', 'ready', 'failed')),
  constraint vocabulary_encounters_linked_consistent check (
    (vocabulary_item_id is null and linked_at is null)
    or (vocabulary_item_id is not null and linked_at is not null)
  ),
  constraint vocabulary_encounters_idempotency_not_blank check (btrim(idempotency_key) <> ''),
  constraint vocabulary_encounters_idempotency_unique unique (learner_id, idempotency_key),
  constraint vocabulary_encounters_identity_with_learner unique (id, learner_id)
);

create index vocabulary_encounters_item_owner_idx on public.vocabulary_encounters (vocabulary_item_id, learner_id);
create index vocabulary_encounters_deck_owner_idx on public.vocabulary_encounters (requested_deck_id, learner_id);
create index vocabulary_encounters_pending_idx on public.vocabulary_encounters (captured_at)
  where enrichment_state in ('pending', 'failed');

create table public.deck_memberships (
  learner_id uuid not null references public.learners (id) on delete restrict,
  deck_id uuid not null,
  vocabulary_item_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (deck_id, vocabulary_item_id),
  constraint deck_memberships_deck_owner foreign key (deck_id, learner_id)
    references public.decks (id, owner_id) on delete restrict,
  constraint deck_memberships_item_owner foreign key (vocabulary_item_id, learner_id)
    references public.vocabulary_items (id, learner_id) on delete restrict
);

create index deck_memberships_learner_id_idx on public.deck_memberships (learner_id);
create index deck_memberships_deck_owner_idx on public.deck_memberships (deck_id, learner_id);
create index deck_memberships_item_owner_idx on public.deck_memberships (vocabulary_item_id, learner_id);

create table public.learning_materials (
  id uuid primary key default gen_random_uuid(),
  learner_id uuid not null references public.learners (id) on delete restrict,
  vocabulary_item_id uuid not null,
  material_type text not null,
  content jsonb not null,
  source_type text not null,
  provenance jsonb not null default '{}'::jsonb,
  version integer not null default 1,
  accepted_at timestamptz,
  superseded_at timestamptz,
  created_at timestamptz not null default now(),
  constraint learning_materials_item_owner foreign key (vocabulary_item_id, learner_id)
    references public.vocabulary_items (id, learner_id) on delete restrict,
  constraint learning_materials_type_valid check (material_type in ('meaning_vi', 'pronunciation', 'audio', 'example', 'word_forms', 'collocations', 'recognition_prompt', 'production_prompt')),
  constraint learning_materials_source_valid check (source_type in ('encounter', 'lexical_evidence', 'generated', 'curated', 'learner')),
  constraint learning_materials_content_object check (jsonb_typeof(content) = 'object'),
  constraint learning_materials_provenance_object check (jsonb_typeof(provenance) = 'object'),
  constraint learning_materials_version_positive check (version > 0),
  constraint learning_materials_lifecycle_valid check (superseded_at is null or accepted_at is not null),
  constraint learning_materials_identity_with_learner unique (id, learner_id),
  constraint learning_materials_version_unique unique (vocabulary_item_id, material_type, version)
);

create index learning_materials_item_active_idx on public.learning_materials (vocabulary_item_id, material_type)
  where superseded_at is null;
create index learning_materials_learner_id_idx on public.learning_materials (learner_id);
create index learning_materials_item_owner_idx on public.learning_materials (vocabulary_item_id, learner_id);

create table public.scheduler_policies (
  id text primary key,
  algorithm text not null,
  algorithm_version text not null,
  desired_retention numeric(4,3) not null,
  parameters jsonb not null,
  relearning_steps_seconds integer[] not null,
  active_from timestamptz not null,
  retired_at timestamptz,
  constraint scheduler_policies_id_not_blank check (btrim(id) <> ''),
  constraint scheduler_policies_algorithm_not_blank check (btrim(algorithm) <> '' and btrim(algorithm_version) <> ''),
  constraint scheduler_policies_retention_valid check (desired_retention > 0 and desired_retention < 1),
  constraint scheduler_policies_parameters_object check (jsonb_typeof(parameters) = 'object'),
  constraint scheduler_policies_relearning_steps_valid check (cardinality(relearning_steps_seconds) > 0)
);

create table public.memory_tracks (
  id uuid primary key default gen_random_uuid(),
  learner_id uuid not null references public.learners (id) on delete restrict,
  vocabulary_item_id uuid not null,
  practice_direction text not null,
  scheduler_policy_id text not null references public.scheduler_policies (id) on delete restrict,
  scheduler_state text not null default 'new',
  due_at timestamptz,
  stability double precision,
  difficulty double precision,
  scheduled_days integer not null default 0,
  elapsed_days integer not null default 0,
  repetitions integer not null default 0,
  lapses integer not null default 0,
  version bigint not null default 0,
  last_reviewed_at timestamptz,
  suspended_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint memory_tracks_item_owner foreign key (vocabulary_item_id, learner_id)
    references public.vocabulary_items (id, learner_id) on delete restrict,
  constraint memory_tracks_direction_valid check (practice_direction in ('recognition', 'production')),
  constraint memory_tracks_state_valid check (scheduler_state in ('new', 'learning', 'review', 'relearning')),
  constraint memory_tracks_counters_nonnegative check (scheduled_days >= 0 and elapsed_days >= 0 and repetitions >= 0 and lapses >= 0 and version >= 0),
  constraint memory_tracks_stability_positive check (stability is null or stability > 0),
  constraint memory_tracks_difficulty_valid check (difficulty is null or (difficulty >= 1 and difficulty <= 10)),
  constraint memory_tracks_item_direction_unique unique (vocabulary_item_id, practice_direction),
  constraint memory_tracks_identity_with_learner unique (id, learner_id)
);

create index memory_tracks_due_idx on public.memory_tracks (learner_id, due_at)
  where due_at is not null and suspended_at is null;
create index memory_tracks_item_owner_idx on public.memory_tracks (vocabulary_item_id, learner_id);
create index memory_tracks_scheduler_policy_id_idx on public.memory_tracks (scheduler_policy_id);

create table public.review_events (
  id uuid primary key default gen_random_uuid(),
  learner_id uuid not null references public.learners (id) on delete restrict,
  memory_track_id uuid not null,
  scheduler_policy_id text not null references public.scheduler_policies (id) on delete restrict,
  review_outcome text not null,
  reviewed_at timestamptz not null,
  learner_day date not null,
  track_version_before bigint not null,
  track_version_after bigint not null,
  prior_state jsonb not null,
  resulting_state jsonb not null,
  created_at timestamptz not null default now(),
  constraint review_events_track_owner foreign key (memory_track_id, learner_id)
    references public.memory_tracks (id, learner_id) on delete restrict,
  constraint review_events_outcome_valid check (review_outcome in ('forgot', 'remembered')),
  constraint review_events_versions_valid check (track_version_before >= 0 and track_version_after = track_version_before + 1),
  constraint review_events_prior_state_object check (jsonb_typeof(prior_state) = 'object'),
  constraint review_events_resulting_state_object check (jsonb_typeof(resulting_state) = 'object'),
  constraint review_events_track_version_unique unique (memory_track_id, track_version_after),
  constraint review_events_identity_with_learner unique (id, learner_id)
);

create index review_events_learner_day_idx on public.review_events (learner_id, learner_day, reviewed_at);
create index review_events_scheduler_policy_id_idx on public.review_events (scheduler_policy_id);
create index review_events_track_owner_idx on public.review_events (memory_track_id, learner_id);

create table public.review_event_corrections (
  id uuid primary key default gen_random_uuid(),
  learner_id uuid not null references public.learners (id) on delete restrict,
  review_event_id uuid not null,
  replacement_review_event_id uuid,
  reason text not null,
  created_at timestamptz not null default now(),
  constraint review_event_corrections_event_owner foreign key (review_event_id, learner_id)
    references public.review_events (id, learner_id) on delete restrict,
  constraint review_event_corrections_replacement_owner foreign key (replacement_review_event_id, learner_id)
    references public.review_events (id, learner_id) on delete restrict,
  constraint review_event_corrections_reason_not_blank check (btrim(reason) <> ''),
  constraint review_event_corrections_distinct check (replacement_review_event_id is null or replacement_review_event_id <> review_event_id),
  constraint review_event_corrections_event_unique unique (review_event_id)
);

create index review_event_corrections_learner_id_idx on public.review_event_corrections (learner_id);
create index review_event_corrections_event_owner_idx on public.review_event_corrections (review_event_id, learner_id);
create index review_event_corrections_replacement_owner_idx on public.review_event_corrections (replacement_review_event_id, learner_id);

create table public.outbox_events (
  id uuid primary key default gen_random_uuid(),
  learner_id uuid references public.learners (id) on delete restrict,
  event_type text not null,
  aggregate_type text not null,
  aggregate_id uuid not null,
  payload jsonb not null,
  available_at timestamptz not null default now(),
  locked_at timestamptz,
  locked_by text,
  attempt_count integer not null default 0,
  processed_at timestamptz,
  last_error_code text,
  created_at timestamptz not null default now(),
  constraint outbox_events_type_not_blank check (btrim(event_type) <> '' and btrim(aggregate_type) <> ''),
  constraint outbox_events_payload_object check (jsonb_typeof(payload) = 'object'),
  constraint outbox_events_attempts_nonnegative check (attempt_count >= 0),
  constraint outbox_events_lock_consistent check ((locked_at is null) = (locked_by is null)),
  constraint outbox_events_processing_consistent check (processed_at is null or locked_at is not null),
  constraint outbox_events_aggregate_unique unique (event_type, aggregate_type, aggregate_id)
);

create index outbox_events_claim_idx on public.outbox_events (available_at, created_at)
  where processed_at is null;
create index outbox_events_learner_id_idx on public.outbox_events (learner_id);

create table public.enrichment_runs (
  id uuid primary key default gen_random_uuid(),
  learner_id uuid not null references public.learners (id) on delete restrict,
  vocabulary_encounter_id uuid not null,
  provider text not null,
  model text not null,
  schema_version text not null,
  attempt_number integer not null default 1,
  status text not null default 'queued',
  output jsonb,
  error_code text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  constraint enrichment_runs_encounter_owner foreign key (vocabulary_encounter_id, learner_id)
    references public.vocabulary_encounters (id, learner_id) on delete restrict,
  constraint enrichment_runs_provider_not_blank check (btrim(provider) <> '' and btrim(model) <> '' and btrim(schema_version) <> ''),
  constraint enrichment_runs_attempt_positive check (attempt_number > 0),
  constraint enrichment_runs_status_valid check (status in ('queued', 'running', 'succeeded', 'failed', 'discarded')),
  constraint enrichment_runs_output_object check (output is null or jsonb_typeof(output) = 'object'),
  constraint enrichment_runs_timestamps_valid check (completed_at is null or started_at is not null),
  constraint enrichment_runs_attempt_unique unique (vocabulary_encounter_id, attempt_number),
  constraint enrichment_runs_identity_with_learner unique (id, learner_id)
);

create index enrichment_runs_learner_id_idx on public.enrichment_runs (learner_id);
create index enrichment_runs_encounter_idx on public.enrichment_runs (vocabulary_encounter_id, created_at desc);
create index enrichment_runs_encounter_owner_idx on public.enrichment_runs (vocabulary_encounter_id, learner_id);

create table public.entitlement_usage_events (
  id uuid primary key default gen_random_uuid(),
  learner_id uuid not null references public.learners (id) on delete restrict,
  usage_kind text not null,
  quantity integer not null,
  successful_enrichment_id uuid,
  occurred_at timestamptz not null default now(),
  idempotency_key text not null,
  constraint entitlement_usage_events_kind_valid check (usage_kind in ('successful_enrichment')),
  constraint entitlement_usage_events_quantity_positive check (quantity > 0),
  constraint entitlement_usage_events_enrichment_required check (
    usage_kind <> 'successful_enrichment' or successful_enrichment_id is not null
  ),
  constraint entitlement_usage_events_enrichment_owner foreign key (successful_enrichment_id, learner_id)
    references public.enrichment_runs (id, learner_id) on delete restrict,
  constraint entitlement_usage_events_key_not_blank check (btrim(idempotency_key) <> ''),
  constraint entitlement_usage_events_idempotency_unique unique (learner_id, idempotency_key)
);

create index entitlement_usage_events_month_idx on public.entitlement_usage_events (learner_id, occurred_at);
create index entitlement_usage_events_enrichment_owner_idx on public.entitlement_usage_events (successful_enrichment_id, learner_id);

create table public.motivation_events (
  id uuid primary key default gen_random_uuid(),
  learner_id uuid not null references public.learners (id) on delete restrict,
  event_kind text not null,
  xp_delta integer not null default 0,
  learner_day date not null,
  review_event_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now(),
  idempotency_key text not null,
  constraint motivation_events_review_owner foreign key (review_event_id, learner_id)
    references public.review_events (id, learner_id) on delete restrict,
  constraint motivation_events_kind_valid check (event_kind in ('review_completed', 'daily_completed', 'badge_awarded', 'adjustment')),
  constraint motivation_events_review_required check (
    event_kind <> 'review_completed' or review_event_id is not null
  ),
  constraint motivation_events_metadata_object check (jsonb_typeof(metadata) = 'object'),
  constraint motivation_events_key_not_blank check (btrim(idempotency_key) <> ''),
  constraint motivation_events_idempotency_unique unique (learner_id, idempotency_key)
);

create index motivation_events_day_idx on public.motivation_events (learner_id, learner_day, occurred_at);
create index motivation_events_review_owner_idx on public.motivation_events (review_event_id, learner_id);

create table public.learner_day_rollups (
  learner_id uuid not null references public.learners (id) on delete restrict,
  learner_day date not null,
  due_at_day_start integer not null default 0,
  due_completed integer not null default 0,
  honest_reviews integer not null default 0,
  xp_earned integer not null default 0,
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (learner_id, learner_day),
  constraint learner_day_rollups_counts_nonnegative check (
    due_at_day_start >= 0 and due_completed >= 0 and honest_reviews >= 0 and xp_earned >= 0
  ),
  constraint learner_day_rollups_completion_valid check (
    completed_at is null or due_completed >= due_at_day_start
  )
);

create or replace function private.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function private.validate_learner_timezone()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if not exists (select 1 from pg_catalog.pg_timezone_names where name = new.timezone) then
    raise exception using errcode = '22023', message = 'timezone must be a valid IANA timezone';
  end if;
  return new;
end;
$$;

create trigger learners_validate_timezone
before insert or update of timezone on public.learners
for each row execute function private.validate_learner_timezone();

create trigger learners_set_updated_at
before update on public.learners
for each row execute function private.set_updated_at();

create trigger decks_set_updated_at
before update on public.decks
for each row execute function private.set_updated_at();

create trigger vocabulary_items_set_updated_at
before update on public.vocabulary_items
for each row execute function private.set_updated_at();

create trigger memory_tracks_set_updated_at
before update on public.memory_tracks
for each row execute function private.set_updated_at();

create or replace function private.prevent_mutation()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  raise exception using errcode = '55000', message = format('%I is append-only', tg_table_name);
end;
$$;

create trigger review_events_are_append_only
before update or delete on public.review_events
for each row execute function private.prevent_mutation();

create trigger review_event_corrections_are_append_only
before update or delete on public.review_event_corrections
for each row execute function private.prevent_mutation();

create trigger entitlement_usage_events_are_append_only
before update or delete on public.entitlement_usage_events
for each row execute function private.prevent_mutation();

create trigger motivation_events_are_append_only
before update or delete on public.motivation_events
for each row execute function private.prevent_mutation();

create or replace function public.capture_vocabulary_encounter(
  p_learner_id uuid,
  p_surface_form text,
  p_context_text text,
  p_capture_method text,
  p_idempotency_key text,
  p_captured_at timestamptz,
  p_requested_deck_id uuid,
  p_source_url text,
  p_source_title text
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_encounter public.vocabulary_encounters%rowtype;
  v_context_text text := nullif(btrim(p_context_text), '');
begin
  if p_learner_id is null or not exists (select 1 from public.learners where id = p_learner_id) then
    raise exception using errcode = '23503', message = 'learner profile required';
  end if;

  if p_surface_form is null or btrim(p_surface_form) = ''
    or p_idempotency_key is null or btrim(p_idempotency_key) = ''
    or p_captured_at is null
    or p_captured_at > clock_timestamp() + interval '5 minutes' then
    raise exception using errcode = '22023', message = 'invalid Capture identity or timestamp';
  end if;

  if p_capture_method <> 'manual' and v_context_text is null then
    raise exception using errcode = '22023', message = 'context is required outside manual Capture';
  end if;

  if p_requested_deck_id is not null and not exists (
    select 1 from public.decks
    where id = p_requested_deck_id
      and owner_id = p_learner_id
      and kind = 'personal'
      and archived_at is null
  ) then
    raise exception using errcode = '42501', message = 'requested deck is unavailable';
  end if;

  insert into public.vocabulary_encounters (
    learner_id, requested_deck_id, surface_form, context_text, source_url,
    source_title, capture_method, idempotency_key, captured_at
  ) values (
    p_learner_id, p_requested_deck_id, p_surface_form, v_context_text, p_source_url,
    p_source_title, p_capture_method, p_idempotency_key, p_captured_at
  )
  on conflict (learner_id, idempotency_key) do nothing
  returning * into v_encounter;

  if not found then
    select * into strict v_encounter
    from public.vocabulary_encounters
    where learner_id = p_learner_id and idempotency_key = p_idempotency_key;

    if v_encounter.surface_form is distinct from p_surface_form
      or v_encounter.context_text is distinct from v_context_text
      or v_encounter.capture_method is distinct from p_capture_method
      or v_encounter.captured_at is distinct from p_captured_at
      or v_encounter.requested_deck_id is distinct from p_requested_deck_id
      or v_encounter.source_url is distinct from p_source_url
      or v_encounter.source_title is distinct from p_source_title then
      raise exception using errcode = '23505', message = 'idempotency key reused with different capture data';
    end if;
    return v_encounter.id;
  end if;

  insert into public.outbox_events (
    learner_id, event_type, aggregate_type, aggregate_id, payload
  ) values (
    p_learner_id,
    'capture.enrichment_requested',
    'vocabulary_encounter',
    v_encounter.id,
    jsonb_build_object('vocabulary_encounter_id', v_encounter.id)
  );

  return v_encounter.id;
end;
$$;

create or replace function public.adopt_starter_deck(
  p_learner_id uuid,
  p_starter_deck_id uuid
)
returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if p_learner_id is null or not exists (select 1 from public.learners where id = p_learner_id) then
    raise exception using errcode = '23503', message = 'learner profile required';
  end if;

  if not exists (
    select 1 from public.decks
    where id = p_starter_deck_id and kind = 'starter' and archived_at is null
  ) then
    raise exception using errcode = '22023', message = 'starter deck is unavailable';
  end if;

  insert into public.learner_starter_decks (
    learner_id, starter_deck_id, state, adopted_at, removed_at
  ) values (
    p_learner_id, p_starter_deck_id, 'active', clock_timestamp(), null
  )
  on conflict (learner_id, starter_deck_id) do update set
    state = 'active',
    adopted_at = excluded.adopted_at,
    removed_at = null;

  return true;
end;
$$;

create or replace function private.memory_track_state_json(
  p_track public.memory_tracks
)
returns jsonb
language plpgsql
stable
security invoker
set search_path = ''
as $$
begin
  return jsonb_build_object(
    'scheduler_state', p_track.scheduler_state,
    'due_at', p_track.due_at,
    'stability', p_track.stability,
    'difficulty', p_track.difficulty,
    'scheduled_days', p_track.scheduled_days,
    'elapsed_days', p_track.elapsed_days,
    'repetitions', p_track.repetitions,
    'lapses', p_track.lapses,
    'version', p_track.version,
    'last_reviewed_at', p_track.last_reviewed_at,
    'suspended_at', p_track.suspended_at
  );
end;
$$;

create or replace function public.commit_review_event(
  p_learner_id uuid,
  p_memory_track_id uuid,
  p_expected_version bigint,
  p_review_outcome text,
  p_scheduler_policy_id text,
  p_resulting_state jsonb
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_track public.memory_tracks%rowtype;
  v_result_track public.memory_tracks%rowtype;
  v_event_id uuid := gen_random_uuid();
  v_reviewed_at timestamptz := clock_timestamp();
  v_learner_day date;
  v_prior_state jsonb;
  v_result_state jsonb;
begin
  if p_review_outcome not in ('forgot', 'remembered')
    or p_resulting_state is null
    or jsonb_typeof(p_resulting_state) <> 'object'
    or not (p_resulting_state ?& array[
      'scheduler_state', 'due_at', 'stability', 'difficulty', 'scheduled_days',
      'elapsed_days', 'repetitions', 'lapses'
    ]) then
    raise exception using errcode = '22023', message = 'invalid review result';
  end if;

  select (v_reviewed_at at time zone learner.timezone)::date
  into v_learner_day
  from public.learners as learner
  where learner.id = p_learner_id;

  if not found then
    raise exception using errcode = '23503', message = 'learner profile required';
  end if;

  select * into v_track
  from public.memory_tracks
  where id = p_memory_track_id and learner_id = p_learner_id
  for update;

  if not found then
    raise exception using errcode = '42501', message = 'memory track is unavailable';
  end if;

  if v_track.version <> p_expected_version then
    raise exception using errcode = '40001', message = 'memory track version conflict';
  end if;

  if v_track.scheduler_policy_id <> p_scheduler_policy_id then
    raise exception using errcode = '22023', message = 'scheduler policy mismatch';
  end if;

  v_prior_state := private.memory_track_state_json(v_track);

  update public.memory_tracks set
    scheduler_state = p_resulting_state->>'scheduler_state',
    due_at = (p_resulting_state->>'due_at')::timestamptz,
    stability = (p_resulting_state->>'stability')::double precision,
    difficulty = (p_resulting_state->>'difficulty')::double precision,
    scheduled_days = (p_resulting_state->>'scheduled_days')::integer,
    elapsed_days = (p_resulting_state->>'elapsed_days')::integer,
    repetitions = (p_resulting_state->>'repetitions')::integer,
    lapses = (p_resulting_state->>'lapses')::integer,
    version = version + 1,
    last_reviewed_at = v_reviewed_at
  where id = v_track.id
  returning * into v_result_track;

  v_result_state := private.memory_track_state_json(v_result_track);

  insert into public.review_events (
    id, learner_id, memory_track_id, scheduler_policy_id, review_outcome,
    reviewed_at, learner_day, track_version_before, track_version_after,
    prior_state, resulting_state
  ) values (
    v_event_id, p_learner_id, v_track.id, p_scheduler_policy_id, p_review_outcome,
    v_reviewed_at, v_learner_day, v_track.version, v_result_track.version,
    v_prior_state, v_result_state
  );

  insert into public.outbox_events (
    learner_id, event_type, aggregate_type, aggregate_id, payload
  ) values (
    p_learner_id,
    'review.recorded',
    'review_event',
    v_event_id,
    jsonb_build_object('review_event_id', v_event_id)
  );

  return v_event_id;
end;
$$;

create or replace function private.claim_outbox_events(
  p_worker_id text,
  p_limit integer default 25
)
returns setof public.outbox_events
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if p_worker_id is null or btrim(p_worker_id) = '' or p_limit < 1 or p_limit > 100 then
    raise exception using errcode = '22023', message = 'invalid outbox claim request';
  end if;

  return query
  with claimable as (
    select id
    from public.outbox_events
    where processed_at is null
      and available_at <= now()
      and (locked_at is null or locked_at < now() - interval '5 minutes')
    order by available_at, created_at
    for update skip locked
    limit p_limit
  )
  update public.outbox_events as event set
    locked_at = now(),
    locked_by = p_worker_id,
    attempt_count = event.attempt_count + 1
  from claimable
  where event.id = claimable.id
  returning event.*;
end;
$$;

revoke all on function public.capture_vocabulary_encounter(uuid, text, text, text, text, timestamptz, uuid, text, text) from public, anon, authenticated;
revoke all on function public.adopt_starter_deck(uuid, uuid) from public, anon, authenticated;
revoke all on function public.commit_review_event(uuid, uuid, bigint, text, text, jsonb) from public, anon, authenticated;
revoke all on function private.claim_outbox_events(text, integer) from public, anon, authenticated;

grant execute on function public.capture_vocabulary_encounter(uuid, text, text, text, text, timestamptz, uuid, text, text) to service_role;
grant execute on function public.adopt_starter_deck(uuid, uuid) to service_role;
grant execute on function public.commit_review_event(uuid, uuid, bigint, text, text, jsonb) to service_role;
grant execute on function private.claim_outbox_events(text, integer) to service_role;

alter table public.learners enable row level security;
alter table public.lexical_units enable row level security;
alter table public.lexical_senses enable row level security;
alter table public.lexical_evidence enable row level security;
alter table public.decks enable row level security;
alter table public.starter_deck_entries enable row level security;
alter table public.learner_starter_decks enable row level security;
alter table public.vocabulary_items enable row level security;
alter table public.vocabulary_encounters enable row level security;
alter table public.deck_memberships enable row level security;
alter table public.learning_materials enable row level security;
alter table public.scheduler_policies enable row level security;
alter table public.memory_tracks enable row level security;
alter table public.review_events enable row level security;
alter table public.review_event_corrections enable row level security;
alter table public.outbox_events enable row level security;
alter table public.enrichment_runs enable row level security;
alter table public.entitlement_usage_events enable row level security;
alter table public.motivation_events enable row level security;
alter table public.learner_day_rollups enable row level security;

create policy learners_select_own on public.learners for select to authenticated
  using ((select auth.uid()) = id);

create policy lexical_units_read_all on public.lexical_units for select to anon, authenticated using (true);
create policy lexical_senses_read_all on public.lexical_senses for select to anon, authenticated using (true);
create policy lexical_evidence_read_all on public.lexical_evidence for select to anon, authenticated using (true);
create policy scheduler_policies_read_all on public.scheduler_policies for select to authenticated using (true);

create policy decks_read_visible on public.decks for select to anon, authenticated
  using (owner_id is null or owner_id = (select auth.uid()));
create policy starter_deck_entries_read_all on public.starter_deck_entries for select to anon, authenticated using (true);
create policy learner_starter_decks_read_own on public.learner_starter_decks for select to authenticated
  using (learner_id = (select auth.uid()));

create policy vocabulary_items_read_own on public.vocabulary_items for select to authenticated
  using (learner_id = (select auth.uid()));
create policy vocabulary_encounters_read_own on public.vocabulary_encounters for select to authenticated
  using (learner_id = (select auth.uid()));
create policy deck_memberships_read_own on public.deck_memberships for select to authenticated
  using (learner_id = (select auth.uid()));
create policy learning_materials_read_own on public.learning_materials for select to authenticated
  using (learner_id = (select auth.uid()));
create policy memory_tracks_read_own on public.memory_tracks for select to authenticated
  using (learner_id = (select auth.uid()));
create policy review_events_read_own on public.review_events for select to authenticated
  using (learner_id = (select auth.uid()));
create policy review_event_corrections_read_own on public.review_event_corrections for select to authenticated
  using (learner_id = (select auth.uid()));
create policy enrichment_runs_read_own on public.enrichment_runs for select to authenticated
  using (learner_id = (select auth.uid()));
create policy entitlement_usage_events_read_own on public.entitlement_usage_events for select to authenticated
  using (learner_id = (select auth.uid()));
create policy motivation_events_read_own on public.motivation_events for select to authenticated
  using (learner_id = (select auth.uid()));
create policy learner_day_rollups_read_own on public.learner_day_rollups for select to authenticated
  using (learner_id = (select auth.uid()));
create policy outbox_events_deny_learner_access on public.outbox_events for all to authenticated
  using (false) with check (false);

grant usage on schema public to anon, authenticated, service_role;
grant select on public.lexical_units, public.lexical_senses, public.lexical_evidence,
  public.decks, public.starter_deck_entries to anon;
grant select on all tables in schema public to authenticated;
grant all on all tables in schema public to service_role;
grant usage, select on all sequences in schema public to service_role;

revoke insert, update, delete, truncate, references, trigger on public.review_events from authenticated;
revoke insert, update, delete, truncate, references, trigger on public.memory_tracks from authenticated;
revoke insert, update, delete, truncate, references, trigger on public.vocabulary_encounters from authenticated;
revoke all on public.outbox_events from authenticated, anon;

alter default privileges in schema public revoke all on tables from anon, authenticated;
alter default privileges in schema public revoke all on sequences from anon, authenticated;
alter default privileges in schema public revoke execute on functions from public, anon, authenticated;
