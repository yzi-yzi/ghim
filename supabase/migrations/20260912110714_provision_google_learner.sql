-- Provision one private Learner profile for each verified Google identity.
-- Provider identity is authoritative in app_metadata; user_metadata is used
-- only for optional presentation fields and never for authorization.

create or replace function private.provision_google_learner()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_provider text := new.raw_app_meta_data ->> 'provider';
  v_display_name text := nullif(
    btrim(coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name')),
    ''
  );
  v_avatar_url text := nullif(btrim(new.raw_user_meta_data ->> 'avatar_url'), '');
begin
  if v_provider is distinct from 'google' then
    raise exception using
      errcode = '28000',
      message = 'Ghim requires a Google identity';
  end if;

  insert into public.learners (id, display_name, avatar_url)
  values (new.id, v_display_name, v_avatar_url)
  on conflict (id) do nothing;

  return new;
end;
$$;

revoke all on function private.provision_google_learner() from public, anon, authenticated;

create trigger provision_google_learner_after_auth_signup
after insert on auth.users
for each row execute function private.provision_google_learner();
