begin;

create extension if not exists pgtap with schema extensions;
select plan(26);

select has_table('public', 'learners', 'learners table exists');
select has_table('public', 'decks', 'decks table exists');
select has_table('public', 'learner_starter_decks', 'lazy Starter Deck adoption table exists');
select has_table('public', 'lexical_units', 'lexical units table exists');
select has_table('public', 'lexical_senses', 'lexical senses table exists');
select has_table('public', 'vocabulary_items', 'vocabulary items table exists');
select has_table('public', 'vocabulary_encounters', 'vocabulary encounters table exists');
select has_table('public', 'learning_materials', 'learning materials table exists');
select has_table('public', 'memory_tracks', 'memory tracks table exists');
select has_table('public', 'review_events', 'review events table exists');
select has_table('public', 'outbox_events', 'outbox table exists');
select has_table('public', 'enrichment_runs', 'enrichment runs table exists');
select has_table('public', 'entitlement_usage_events', 'entitlement ledger exists');
select has_table('public', 'motivation_events', 'motivation ledger exists');
select has_table('public', 'learner_day_rollups', 'learner day projection exists');
select col_is_pk('public', 'learners', 'id', 'learner identity is the auth user identity');
select has_function(
  'private',
  'provision_google_learner',
  array[]::text[],
  'Google signup has one server-owned Learner provisioning boundary'
);
select has_trigger(
  'auth',
  'users',
  'provision_google_learner_after_auth_signup',
  'auth signup provisions the Learner atomically'
);
select ok(
  not has_function_privilege(
    'authenticated',
    'private.provision_google_learner()',
    'execute'
  ),
  'browser-authenticated clients cannot invoke Learner provisioning'
);
select has_function(
  'public',
  'capture_vocabulary_encounter',
  array['uuid', 'text', 'text', 'text', 'text', 'timestamp with time zone', 'uuid', 'text', 'text'],
  'capture has an atomic command boundary'
);
select has_function(
  'public',
  'adopt_starter_deck',
  array['uuid', 'uuid'],
  'Starter Deck adoption has an atomic command boundary'
);
select has_function(
  'public',
  'commit_review_event',
  array['uuid', 'uuid', 'bigint', 'text', 'text', 'jsonb'],
  'review commit has an atomic command boundary'
);
select has_function(
  'private',
  'claim_outbox_events',
  array['text', 'integer'],
  'workers have an atomic outbox claim boundary'
);
select ok(
  not has_function_privilege(
    'authenticated',
    'public.capture_vocabulary_encounter(uuid,text,text,text,text,timestamp with time zone,uuid,text,text)',
    'execute'
  ),
  'browser-authenticated clients cannot invoke authoritative Capture'
);
select ok(
  not has_function_privilege(
    'authenticated',
    'public.commit_review_event(uuid,uuid,bigint,text,text,jsonb)',
    'execute'
  ),
  'browser-authenticated clients cannot forge authoritative Reviews'
);
select ok(
  not has_table_privilege('authenticated', 'public.outbox_events', 'select'),
  'browser-authenticated clients cannot read the internal outbox'
);

select * from finish();
rollback;
