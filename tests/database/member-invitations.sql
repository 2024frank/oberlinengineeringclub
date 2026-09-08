-- Run with migration 022 inside a transaction which is always rolled back.
do $$
declare
  reviewer uuid := gen_random_uuid();
  member_id uuid := gen_random_uuid();
  other_id uuid := gen_random_uuid();
  request_id uuid;
  result jsonb;
  address text := 'oec-qa-' || member_id::text || '@oberlin.edu';
begin
  insert into auth.users(id,email,email_confirmed_at) values
    (reviewer,'oec-qa-'||reviewer::text||'@oberlin.edu',now()),
    (member_id,address,now()),
    (other_id,'oec-qa-'||other_id::text||'@oberlin.edu',now());
  insert into public.admin_profiles(user_id,display_name,active,status) values(reviewer,'QA officer',true,'ACTIVE');
  insert into public.role_assignments(user_id,role) values(reviewer,'ADMIN');

  begin
    perform public.prepare_member_invitation(address,'QA member',null);
    raise exception 'ASSERTION: null reviewer permitted';
  exception when others then
    if sqlerrm <> 'MEMBER_REVIEW_FORBIDDEN' then raise; end if;
  end;
  begin
    perform public.prepare_member_invitation(address,'QA member',other_id);
    raise exception 'ASSERTION: member may invite';
  exception when others then
    if sqlerrm <> 'MEMBER_REVIEW_FORBIDDEN' then raise; end if;
  end;
  if has_function_privilege('authenticated','public.prepare_member_invitation(text,text,uuid)','EXECUTE')
    or has_function_privilege('anon','public.prepare_member_invitation(text,text,uuid)','EXECUTE') then
    raise exception 'ASSERTION: public invitation RPC access';
  end if;

  result := public.prepare_member_invitation(upper(address),'QA member',reviewer);
  request_id := (result->>'request_id')::uuid;
  if result->>'status' <> 'REQUESTED' then raise exception 'ASSERTION: invitation skips verification'; end if;
  if exists(select 1 from public.member_profiles where user_id=member_id) then raise exception 'ASSERTION: premature profile'; end if;
  if not exists(select 1 from public.membership_requests where id=request_id and preapproved_by=reviewer and preapproved_at is not null) then raise exception 'ASSERTION: approval not saved'; end if;
  result := public.prepare_member_invitation(address,'QA member',reviewer);
  if (result->>'request_id')::uuid <> request_id then raise exception 'ASSERTION: duplicate invite'; end if;

  begin
    perform public.verify_membership_request(request_id,other_id);
    raise exception 'ASSERTION: wrong identity verified';
  exception when others then
    if sqlerrm <> 'MEMBERSHIP_IDENTITY_MISMATCH' then raise; end if;
  end;
  update auth.users set email_confirmed_at=null where id=member_id;
  begin
    perform public.verify_membership_request(request_id,member_id);
    raise exception 'ASSERTION: unconfirmed email verified';
  exception when others then
    if sqlerrm <> 'MEMBERSHIP_IDENTITY_MISMATCH' then raise; end if;
  end;
  update auth.users set email_confirmed_at=now() where id=member_id;
  result := public.verify_membership_request(request_id,member_id);
  if result->>'status' <> 'APPROVED' then raise exception 'ASSERTION: second approval required'; end if;
  if not exists(select 1 from public.member_profiles where user_id=member_id and status='APPROVED') then raise exception 'ASSERTION: profile missing'; end if;
  if exists(select 1 from public.role_assignments where user_id=member_id) then raise exception 'ASSERTION: invitation grants staff'; end if;
  result := public.verify_membership_request(request_id,member_id);
  if result->>'status' <> 'APPROVED' then raise exception 'ASSERTION: reopening verification fails'; end if;
  perform public.activate_member(member_id);
  result := public.verify_membership_request(request_id,member_id);
  if result->>'status' <> 'ACTIVE' then raise exception 'ASSERTION: active member was downgraded'; end if;

  update public.membership_requests set status='SUSPENDED' where id=request_id;
  begin
    perform public.prepare_member_invitation(address,'QA member',reviewer);
    raise exception 'ASSERTION: suspended account reopened';
  exception when others then
    if sqlerrm <> 'MEMBERSHIP_REQUEST_BLOCKED' then raise; end if;
  end;

  result := public.prepare_member_invitation('oec-qa-'||other_id::text||'@oberlin.edu','Second QA member',reviewer);
  update public.admin_profiles set active=false where user_id=reviewer;
  result := public.verify_membership_request((result->>'request_id')::uuid,other_id);
  if result->>'status' <> 'PENDING_APPROVAL' then raise exception 'ASSERTION: inactive officer grants membership'; end if;
end;
$$;
