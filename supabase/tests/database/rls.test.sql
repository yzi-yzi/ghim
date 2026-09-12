begin;

create extension if not exists pgtap with schema extensions;
select plan(36);

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  (
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated', 'learner-a@example.test', '',
    '{"provider":"google","providers":["google"]}', '{}', now(), now()
  ),
  (
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated', 'learner-b@example.test', '',
    '{"provider":"google","providers":["google"]}', '{}', now(), now()
  );

update public.learners set display_name = 'Learner A'
where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
update public.learners set display_name = 'Learner B'
where id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

insert into public.decks (owner_id, kind, name) values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'personal', 'Reading');

insert into public.scheduler_policies (
  id, algorithm, algorithm_version, desired_retention, parameters,
  relearning_steps_seconds, active_from
) values (
  'fsrs-6-default-0.90-v1', 'fsrs', '6', 0.900, '{}'::jsonb,
  array[600], now()
);

insert into public.lexical_units (canonical_form, normalized_form, kind)
values ('retain', 'retain', 'word');

insert into public.lexical_senses (lexical_unit_id, part_of_speech, definition_en, sense_key)
select id, 'verb', 'continue to have', 'retain-v-1'
from public.lexical_units where normalized_form = 'retain';

insert into public.vocabulary_items (
  id, learner_id, lexical_unit_id, lexical_sense_id, contextual_meaning_vi, primary_context
)
select
  'aaaaaaaa-0000-4000-8000-000000000001',
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  unit.id,
  sense.id,
  'ghi nhớ và duy trì',
  'Spaced repetition helps learners retain vocabulary.'
from public.lexical_units unit
join public.lexical_senses sense on sense.lexical_unit_id = unit.id
where unit.normalized_form = 'retain';

insert into public.memory_tracks (
  id, learner_id, vocabulary_item_id, practice_direction, scheduler_policy_id, due_at
) values (
  'aaaaaaaa-0000-4000-8000-000000000002',
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  'aaaaaaaa-0000-4000-8000-000000000001',
  'recognition',
  'fsrs-6-default-0.90-v1',
  now()
);

set local role authenticated;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', true);
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa","role":"authenticated"}', true);

select results_eq($$select count(*) from public.learners$$, array[1::bigint], 'a Learner can read only their own profile');
select results_eq(
  $$select count(*) from public.learners where id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'$$,
  array[0::bigint],
  'a Learner cannot read another profile'
);
select ok(
  not has_table_privilege('authenticated', 'public.learners', 'update'),
  'browser-authenticated clients cannot mutate Learner profiles directly'
);
select ok(
  not has_table_privilege('authenticated', 'public.decks', 'insert')
    and not has_table_privilege('authenticated', 'public.decks', 'update'),
  'browser-authenticated clients cannot mutate Decks directly'
);

set local role service_role;

select ok(
  public.capture_vocabulary_encounter(
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'retained',
    'The archive retained its quiet atmosphere.', 'extension', 'capture-a-1',
    '2026-09-11T10:00:00Z', null, 'https://example.test/article', 'Example article'
  ) is not null,
  'the trusted Capture command stores an extension encounter'
);
select ok(
  public.capture_vocabulary_encounter(
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'retained',
    'The archive retained its quiet atmosphere.', 'extension', 'capture-a-1',
    '2026-09-11T10:00:00Z', null, 'https://example.test/article', 'Example article'
  ) is not null,
  'replaying the same Capture is idempotent'
);
select ok(
  public.capture_vocabulary_encounter(
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'sustain', null, 'manual',
    'capture-a-2', '2026-09-11T11:00:00Z', null, null, null
  ) is not null,
  'manual Capture accepts an optional sentence'
);
select throws_ok(
  $$select public.capture_vocabulary_encounter(
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'missing context', null, 'extension',
    'capture-a-3', '2026-09-11T12:00:00Z', null, null, null
  )$$,
  '22023',
  'context is required outside manual Capture',
  'extension Capture still requires source context'
);
select ok(
  public.adopt_starter_deck(
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    '10000000-0000-0000-0000-000000000001'
  ),
  'the API can lazily adopt a Starter Deck for a Learner'
);
select ok(
  public.commit_review_event(
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    'aaaaaaaa-0000-4000-8000-000000000002',
    0,
    'remembered',
    'fsrs-6-default-0.90-v1',
    jsonb_build_object(
      'scheduler_state', 'review', 'due_at', now() + interval '1 day',
      'stability', 1.5, 'difficulty', 5.0, 'scheduled_days', 1,
      'elapsed_days', 0, 'repetitions', 1, 'lapses', 0
    )
  ) is not null,
  'the trusted Review command commits a valid result'
);
select throws_ok(
  $$select public.commit_review_event(
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    'aaaaaaaa-0000-4000-8000-000000000002', 0, 'remembered',
    'fsrs-6-default-0.90-v1',
    '{"scheduler_state":"review","due_at":null,"stability":1,"difficulty":5,"scheduled_days":1,"elapsed_days":0,"repetitions":1,"lapses":0}'::jsonb
  )$$,
  '40001',
  'memory track version conflict',
  'a stale Review cannot overwrite newer scheduling state'
);

insert into public.deck_memberships (learner_id, deck_id, vocabulary_item_id)
select 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', id, 'aaaaaaaa-0000-4000-8000-000000000001'
from public.decks where owner_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

insert into public.learning_materials (
  learner_id, vocabulary_item_id, material_type, content, source_type, accepted_at
) values (
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  'aaaaaaaa-0000-4000-8000-000000000001',
  'meaning_vi', '{"text":"ghi nhớ và duy trì"}', 'learner', now()
);

insert into public.review_event_corrections (learner_id, review_event_id, reason)
select learner_id, id, 'test correction ledger'
from public.review_events where learner_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

insert into public.enrichment_runs (
  id, learner_id, vocabulary_encounter_id, provider, model, schema_version,
  status, output, started_at, completed_at
)
select
  'aaaaaaaa-0000-4000-8000-000000000003', learner_id, id, 'fixture',
  'fixture-v1', '1', 'succeeded', '{"meaning_vi":"duy trì"}', now(), now()
from public.vocabulary_encounters where idempotency_key = 'capture-a-1';

insert into public.entitlement_usage_events (
  learner_id, usage_kind, quantity, successful_enrichment_id, idempotency_key
) values (
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'successful_enrichment', 1,
  'aaaaaaaa-0000-4000-8000-000000000003', 'usage-a-1'
);

insert into public.motivation_events (
  learner_id, event_kind, xp_delta, learner_day, review_event_id, idempotency_key
)
select learner_id, 'review_completed', 10, learner_day, id, 'motivation-a-1'
from public.review_events where learner_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

insert into public.learner_day_rollups (
  learner_id, learner_day, due_at_day_start, due_completed, honest_reviews, xp_earned, completed_at
) values (
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  (now() at time zone 'Asia/Ho_Chi_Minh')::date,
  1, 1, 1, 10, now()
);

set local role authenticated;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', true);
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa","role":"authenticated"}', true);

select results_eq($$select count(*) from public.vocabulary_encounters$$, array[2::bigint], 'Capture retries create two distinct encounters, not duplicates');
select results_eq(
  $$select captured_at from public.vocabulary_encounters where idempotency_key = 'capture-a-1'$$,
  $$values ('2026-09-11T10:00:00Z'::timestamptz)$$,
  'Capture preserves the original encounter timestamp'
);
select results_eq($$select count(*) from public.learner_starter_decks$$, array[1::bigint], 'Learner can read their Starter Deck selection');
select results_eq($$select count(*) from public.vocabulary_items$$, array[1::bigint], 'Learner can read their Vocabulary Items');
select results_eq($$select count(*) from public.deck_memberships$$, array[1::bigint], 'Learner can read their Deck Memberships');
select results_eq($$select count(*) from public.learning_materials$$, array[1::bigint], 'Learner can read their Learning Material');
select results_eq($$select count(*) from public.memory_tracks$$, array[1::bigint], 'Learner can read their Memory Tracks');
select results_eq($$select count(*) from public.review_events$$, array[1::bigint], 'Learner can read their Review Events');
select results_eq($$select count(*) from public.review_event_corrections$$, array[1::bigint], 'Learner can read their Review corrections');
select results_eq($$select count(*) from public.enrichment_runs$$, array[1::bigint], 'Learner can read their enrichment status');
select results_eq($$select count(*) from public.entitlement_usage_events$$, array[1::bigint], 'Learner can read their entitlement usage');
select results_eq($$select count(*) from public.motivation_events$$, array[1::bigint], 'Learner can read their motivation ledger');
select results_eq($$select count(*) from public.learner_day_rollups$$, array[1::bigint], 'Learner can read their Learner Day projection');

select set_config('request.jwt.claim.sub', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', true);
select set_config('request.jwt.claims', '{"sub":"bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb","role":"authenticated"}', true);

select results_eq($$select count(*) from public.vocabulary_encounters$$, array[0::bigint], 'another Learner cannot read captured context');
select results_eq($$select count(*) from public.learner_starter_decks$$, array[0::bigint], 'another Learner cannot read Starter Deck selections');
select results_eq($$select count(*) from public.vocabulary_items$$, array[0::bigint], 'another Learner cannot read Vocabulary Items');
select results_eq($$select count(*) from public.deck_memberships$$, array[0::bigint], 'another Learner cannot read Deck Memberships');
select results_eq($$select count(*) from public.learning_materials$$, array[0::bigint], 'another Learner cannot read Learning Material');
select results_eq($$select count(*) from public.memory_tracks$$, array[0::bigint], 'another Learner cannot read Memory Tracks');
select results_eq($$select count(*) from public.review_events$$, array[0::bigint], 'another Learner cannot read Review Events');
select results_eq($$select count(*) from public.review_event_corrections$$, array[0::bigint], 'another Learner cannot read Review corrections');
select results_eq($$select count(*) from public.enrichment_runs$$, array[0::bigint], 'another Learner cannot read enrichment status');
select results_eq($$select count(*) from public.entitlement_usage_events$$, array[0::bigint], 'another Learner cannot read entitlement usage');
select results_eq($$select count(*) from public.motivation_events$$, array[0::bigint], 'another Learner cannot read motivation ledger');
select results_eq($$select count(*) from public.learner_day_rollups$$, array[0::bigint], 'another Learner cannot read Learner Day projections');

select * from finish();
rollback;
