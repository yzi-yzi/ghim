insert into public.decks (id, owner_id, kind, name, description, slug)
values (
  '10000000-0000-0000-0000-000000000001',
  null,
  'starter',
  'Ghim Starter',
  'Bộ từ khởi đầu để trải nghiệm vòng học cốt lõi.',
  'ghim-starter'
) on conflict (id) do nothing;
