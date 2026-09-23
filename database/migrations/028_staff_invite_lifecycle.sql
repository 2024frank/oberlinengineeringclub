-- Staff invitations for existing accounts, and expiry that is actually recorded.
--
-- An expired invitation must not block a new one for the same email. Postgres does not
-- allow now() in a partial-index predicate, so staff_invites_open_email_idx keeps
-- status='INVITED' and this trigger marks stale open invitations EXPIRED before another
-- invitation for that email becomes open.

-- Record invitations that expired before this migration.
update public.staff_invites set status='EXPIRED' where status='INVITED' and expires_at<=now();

create or replace function private.prepare_open_staff_invite()
returns trigger language plpgsql security definer set search_path='' as $$
begin
  -- Members can now be invited, so an invitation must not silently replace the role of
  -- someone who is already active staff. Super Admin changes that access from Manage.
  if exists(
    select 1 from auth.users u join public.admin_profiles ap on ap.user_id=u.id
    where lower(u.email)=lower(new.email) and ap.active and ap.status='ACTIVE'
  ) then raise exception 'STAFF_ALREADY_ACTIVE'; end if;
  update public.staff_invites set status='EXPIRED'
  where lower(email)=lower(new.email) and status='INVITED' and expires_at<=now() and id<>new.id;
  return new;
end;
$$;

drop trigger if exists staff_invites_prepare_open on public.staff_invites;
create trigger staff_invites_prepare_open
  before insert or update of status,token_hash,expires_at on public.staff_invites
  for each row when (new.status='INVITED')
  execute function private.prepare_open_staff_invite();

create or replace function public.accept_staff_invite(p_invite_id uuid, p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  v_invite public.staff_invites%rowtype;
  v_auth_email text;
begin
  select * into v_invite from public.staff_invites where id=p_invite_id for update;
  if not found then raise exception 'STAFF_INVITE_NOT_FOUND'; end if;
  if v_invite.status='REVOKED' then raise exception 'STAFF_INVITE_REVOKED'; end if;
  if v_invite.status='ACCEPTED' then raise exception 'STAFF_INVITE_USED'; end if;
  if v_invite.status='EXPIRED' then raise exception 'STAFF_INVITE_EXPIRED'; end if;
  if v_invite.expires_at<=now() then
    update public.staff_invites set status='EXPIRED' where id=p_invite_id;
    -- Raising here would roll the EXPIRED status back, so report the failure as data.
    return jsonb_build_object('error','STAFF_INVITE_EXPIRED');
  end if;
  if v_invite.status<>'INVITED' then raise exception 'STAFF_INVITE_INVALID_STATE'; end if;

  select lower(email) into v_auth_email from auth.users where id=p_user_id;
  if v_auth_email is null or v_auth_email<>lower(v_invite.email) then
    raise exception 'STAFF_INVITE_IDENTITY_MISMATCH';
  end if;
  if exists(select 1 from public.admin_profiles where user_id=p_user_id and active and status='ACTIVE') then
    raise exception 'STAFF_ALREADY_ACTIVE';
  end if;

  insert into public.admin_profiles(user_id,display_name,active,status)
  values(p_user_id,v_invite.display_name,true,'ACTIVE')
  on conflict(user_id) do update set
    display_name=excluded.display_name,
    active=true,
    status='ACTIVE';

  insert into public.role_assignments(user_id,role,scopes,can_publish)
  values(p_user_id,v_invite.role,v_invite.scopes,case when v_invite.role='EDITOR' then v_invite.can_publish else false end)
  on conflict(user_id) do update set
    role=excluded.role,
    scopes=excluded.scopes,
    can_publish=excluded.can_publish;

  update public.staff_invites set
    status='ACCEPTED',
    accepted_user_id=p_user_id,
    accepted_at=now()
  where id=p_invite_id;

  insert into public.audit_log(actor_id,action,entity_type,entity_id,after_snapshot)
  values(p_user_id,'STAFF_INVITE_ACCEPTED','staff_invite',p_invite_id::text,
    jsonb_build_object('email',v_invite.email,'role',v_invite.role,'scopes',v_invite.scopes));

  return jsonb_build_object('invite_id',p_invite_id,'role',v_invite.role);
end;
$$;

revoke all on function private.prepare_open_staff_invite() from public,anon,authenticated;
revoke all on function public.accept_staff_invite(uuid,uuid) from public,anon,authenticated;
grant execute on function public.accept_staff_invite(uuid,uuid) to service_role;
