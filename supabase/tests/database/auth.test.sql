begin;

create extension if not exists pgtap with schema extensions;
select plan(3);

select lives_ok(
  $$insert into auth.users (
    id, instance_id, aud, role, email, encrypted_password,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at
  ) values (
    'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated', 'google@example.test', '',
    '{"provider":"google","providers":["google"]}',
    '{"full_name":"Google Learner","avatar_url":"https://example.test/avatar.png"}',
    now(), now()
  )$$,
  'a verified Google identity provisions successfully'
);

select results_eq(
  $$select display_name, avatar_url from public.learners
    where id = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc'$$,
  $$values ('Google Learner'::text, 'https://example.test/avatar.png'::text)$$,
  'Google presentation metadata is copied into the private Learner profile'
);

select throws_ok(
  $$insert into auth.users (
    id, instance_id, aud, role, email, encrypted_password,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at
  ) values (
    'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated', 'other@example.test', '',
    '{"provider":"github","providers":["github"]}', '{}', now(), now()
  )$$,
  '28000',
  'Ghim requires a Google identity',
  'a non-Google signup cannot create a Ghim account'
);

select * from finish();
rollback;
