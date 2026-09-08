-- An officer can approve an invitation before email ownership is verified.
-- No profile or member access exists until the matching verified identity accepts it.
alter table public.membership_requests
  add column if not exists preapproved_by uuid references public.admin_profiles(user_id),
  add column if not exists preapproved_at timestamptz,
  add column if not exists last_email_sent_at timestamptz,
  add column if not exists last_email_error text;

create or replace function public.prepare_member_invitation(p_email text,p_display_name text,p_reviewer_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
  v_request public.membership_requests%rowtype;
  v_email text := lower(trim(p_email));
begin
  if not exists(select 1 from public.role_assignments ra join public.admin_profiles ap on ap.user_id=ra.user_id
    where ra.user_id=p_reviewer_id and ra.role in ('ADMIN','SUPER_ADMIN') and ap.active and ap.status='ACTIVE')
  then raise exception 'MEMBER_REVIEW_FORBIDDEN'; end if;
  if v_email is null or v_email !~ '^[^@[:space:]]+@oberlin[.]edu$' then raise exception 'OBERLIN_EMAIL_REQUIRED'; end if;

  insert into public.membership_requests(email,display_name)
  values(v_email,coalesce(nullif(trim(p_display_name),''),v_email))
  on conflict(lower(email)) do nothing;
  select * into v_request from public.membership_requests where lower(email)=v_email for update;
  if v_request.status in ('REJECTED','SUSPENDED') then raise exception 'MEMBERSHIP_REQUEST_BLOCKED'; end if;
  if v_request.status='PENDING_APPROVAL' then
    return public.approve_membership_request(v_request.id,p_reviewer_id,null);
  end if;
  if v_request.status in ('REQUESTED','EMAIL_VERIFIED') and v_request.preapproved_at is null then
    update public.membership_requests set preapproved_by=p_reviewer_id,preapproved_at=now(),updated_at=now() where id=v_request.id;
    insert into public.audit_log(actor_id,action,entity_type,entity_id,after_snapshot)
    values(p_reviewer_id,'MEMBERSHIP_INVITATION_APPROVED','membership_request',v_request.id::text,jsonb_build_object('email',v_email));
  end if;
  return jsonb_build_object('request_id',v_request.id,'email',v_email,'display_name',v_request.display_name,'status',v_request.status);
end;
$$;

create or replace function public.verify_membership_request(p_request_id uuid,p_user_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
  v_request public.membership_requests%rowtype;
  v_auth_email text;
begin
  select * into v_request from public.membership_requests where id=p_request_id for update;
  if not found then raise exception 'MEMBERSHIP_REQUEST_NOT_FOUND'; end if;
  select lower(email) into v_auth_email from auth.users where id=p_user_id and email_confirmed_at is not null;
  if v_auth_email is null or v_auth_email<>lower(v_request.email) then raise exception 'MEMBERSHIP_IDENTITY_MISMATCH'; end if;
  if v_auth_email !~ '^[^@[:space:]]+@oberlin[.]edu$' then raise exception 'OBERLIN_EMAIL_REQUIRED'; end if;
  -- Reopening a valid link is safe, but never reopens rejected or suspended accounts.
  if v_request.status in ('PENDING_APPROVAL','APPROVED','ACTIVE') and v_request.auth_user_id=p_user_id then
    return jsonb_build_object('request_id',p_request_id,'status',v_request.status);
  end if;
  if v_request.status not in ('REQUESTED','EMAIL_VERIFIED') then raise exception 'MEMBERSHIP_VERIFICATION_INVALID_STATE'; end if;
  update public.membership_requests set auth_user_id=p_user_id,status='PENDING_APPROVAL',
    email_verified_at=coalesce(email_verified_at,now()),updated_at=now() where id=p_request_id;
  insert into public.audit_log(actor_id,action,entity_type,entity_id,after_snapshot)
  values(p_user_id,'MEMBERSHIP_EMAIL_VERIFIED','membership_request',p_request_id::text,jsonb_build_object('email',v_request.email));
  -- Recheck that the inviting officer still has approval authority.
  if v_request.preapproved_at is not null and exists(
    select 1 from public.role_assignments ra join public.admin_profiles ap on ap.user_id=ra.user_id
    where ra.user_id=v_request.preapproved_by and ra.role in ('ADMIN','SUPER_ADMIN') and ap.active and ap.status='ACTIVE'
  ) then
    return public.approve_membership_request(p_request_id,v_request.preapproved_by,null);
  end if;
  return jsonb_build_object('request_id',p_request_id,'status','PENDING_APPROVAL');
end;
$$;

revoke all on function public.prepare_member_invitation(text,text,uuid) from public,anon,authenticated;
grant execute on function public.prepare_member_invitation(text,text,uuid) to service_role;
revoke all on function public.verify_membership_request(uuid,uuid) from public,anon,authenticated;
grant execute on function public.verify_membership_request(uuid,uuid) to service_role;
