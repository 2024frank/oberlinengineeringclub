-- An admin can appoint an active member from a real project-interest request.
-- This grants project access only, never club membership or staff permissions.
alter table public.project_applications add column if not exists reviewed_by_admin_id uuid references public.admin_profiles(user_id) on delete set null;
alter table public.submissions add column if not exists approved_project_id uuid references public.projects(id) on delete set null;
alter table public.submissions add column if not exists approved_project_user_id uuid references public.member_profiles(user_id) on delete set null;

create or replace function public.approve_project_interest_as_lead(p_source text,p_request_id uuid,p_project_id uuid default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
  v_admin uuid := (select auth.uid());
  v_application public.project_applications%rowtype;
  v_submission public.submissions%rowtype;
  v_member public.member_profiles%rowtype;
  v_project public.projects%rowtype;
  v_project_id uuid;
  v_already boolean := false;
begin
  if v_admin is null or not coalesce(private.is_admin_or_super(),false) then
    raise exception 'PROJECT_LEAD_APPROVAL_FORBIDDEN';
  end if;

  if p_source='application' then
    select * into v_application from public.project_applications where id=p_request_id for update;
    if not found then raise exception 'PROJECT_INTEREST_NOT_FOUND'; end if;
    v_project_id := v_application.project_id;
    if p_project_id is not null and p_project_id<>v_project_id then raise exception 'PROJECT_MISMATCH'; end if;
    v_already := v_application.status='ACCEPTED' and v_application.reviewed_by_admin_id is not null;
    if v_application.status<>'PENDING' and not v_already then raise exception 'PROJECT_INTEREST_NOT_PENDING'; end if;
    select * into v_member from public.member_profiles where user_id=v_application.applicant_user_id and status='ACTIVE' for share;
  elsif p_source='submission' then
    select * into v_submission from public.submissions where id=p_request_id and type='join_project' for update;
    if not found then raise exception 'PROJECT_INTEREST_NOT_FOUND'; end if;
    v_already := v_submission.status='approved' and v_submission.approved_project_id is not null;
    if v_submission.status not in ('new','reviewed') and not v_already then raise exception 'PROJECT_INTEREST_NOT_PENDING'; end if;
    v_project_id := coalesce(v_submission.approved_project_id,p_project_id);
    if v_already and p_project_id is distinct from v_project_id then raise exception 'PROJECT_MISMATCH'; end if;
    select * into v_member from public.member_profiles
      where lower(oberlin_email)=lower(trim(v_submission.email)) and status='ACTIVE' for share;
  else
    raise exception 'PROJECT_INTEREST_SOURCE_INVALID';
  end if;
  if v_member.user_id is null then raise exception 'ACTIVE_MEMBER_REQUIRED'; end if;
  select * into v_project from public.projects where id=v_project_id and publication_state='published' for no key update;
  if not found then raise exception 'PUBLISHED_PROJECT_REQUIRED'; end if;

  if v_already then
    -- A retry must not restore a lead whose access was subsequently removed.
    if not exists(select 1 from public.project_memberships where project_id=v_project_id and user_id=v_member.user_id and role='LEAD' and status='ACTIVE') then
      raise exception 'PROJECT_INTEREST_ALREADY_REVIEWED';
    end if;
  else
    insert into public.project_memberships(project_id,user_id,role,status)
    values(v_project_id,v_member.user_id,'LEAD','ACTIVE')
    on conflict(project_id,user_id) do update set role='LEAD',status='ACTIVE',updated_at=now();

    if p_source='application' then
      update public.project_applications set status='ACCEPTED',reviewed_by_admin_id=v_admin,
        reviewed_at=now(),decision_note='Approved as project lead',updated_at=now() where id=p_request_id;
    else
      update public.submissions set status='approved',approved_project_id=v_project_id,
        approved_project_user_id=v_member.user_id where id=p_request_id;
    end if;

    insert into public.member_notifications(user_id,kind,title,body,action_url)
    values(v_member.user_id,'PROJECT_LEAD_APPROVED','You are a project lead',
      'You were approved to lead "'||v_project.title||'". You can now invite teammates and review applications.',
      '/member/teams/'||v_project_id::text);
    insert into public.audit_log(actor_id,action,entity_type,entity_id,after_snapshot)
    values(v_admin,'PROJECT_LEAD_APPROVED',case when p_source='application' then 'project_application' else 'submission' end,
      p_request_id::text,jsonb_build_object('projectId',v_project_id,'userId',v_member.user_id,'role','LEAD'));
  end if;
  return jsonb_build_object('projectId',v_project_id,'projectTitle',v_project.title,'userId',v_member.user_id,
    'memberName',v_member.display_name,'memberEmail',v_member.oberlin_email,'role','LEAD','alreadyApproved',v_already);
end $$;
revoke all on function public.approve_project_interest_as_lead(text,uuid,uuid) from public,anon;
grant execute on function public.approve_project_interest_as_lead(text,uuid,uuid) to authenticated;

-- Accepting an older application or invitation must not demote an active lead.
create or replace function public.review_project_application(p_application_id uuid,p_decision text,p_note text default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_user uuid:=(select auth.uid());v_app public.project_applications%rowtype;v_project public.projects%rowtype;v_member public.member_profiles%rowtype;begin
  select * into v_app from public.project_applications where id=p_application_id for update;
  if not found then raise exception 'PROJECT_APPLICATION_NOT_FOUND';end if;
  if not private.is_project_lead(v_app.project_id) then raise exception 'PROJECT_LEAD_REQUIRED';end if;
  if v_app.status<>'PENDING' then raise exception 'PROJECT_APPLICATION_ALREADY_REVIEWED';end if;
  if p_decision not in ('ACCEPT','REJECT') then raise exception 'PROJECT_APPLICATION_DECISION_INVALID';end if;
  select * into v_project from public.projects where id=v_app.project_id;
  select * into v_member from public.member_profiles where user_id=v_app.applicant_user_id and status='ACTIVE';
  if not found then raise exception 'APPLICANT_NOT_ACTIVE';end if;
  if p_decision='ACCEPT' then
    insert into public.project_memberships(project_id,user_id,role,status) values(v_app.project_id,v_app.applicant_user_id,'MEMBER','ACTIVE')
      on conflict(project_id,user_id) do update set role=case when public.project_memberships.status='ACTIVE' then public.project_memberships.role else 'MEMBER'::public.project_membership_role end,status='ACTIVE',updated_at=now();
    update public.project_applications set status='ACCEPTED',reviewed_by_user_id=v_user,reviewed_at=now(),decision_note=p_note,updated_at=now() where id=p_application_id;
    insert into public.member_notifications(user_id,kind,title,body,action_url) values(v_app.applicant_user_id,'PROJECT_APPLICATION_ACCEPTED','Project application accepted','You joined "'||v_project.title||'".','/member/teams/'||v_app.project_id::text);
  else
    update public.project_applications set status='REJECTED',reviewed_by_user_id=v_user,reviewed_at=now(),decision_note=p_note,updated_at=now() where id=p_application_id;
    insert into public.member_notifications(user_id,kind,title,body,action_url) values(v_app.applicant_user_id,'PROJECT_APPLICATION_REJECTED','Project application update','Your application to "'||v_project.title||'" was not accepted at this time.','/member/applications');
  end if;
  return jsonb_build_object('applicationId',p_application_id,'projectId',v_app.project_id,'projectTitle',v_project.title,'status',case when p_decision='ACCEPT' then 'ACCEPTED' else 'REJECTED' end,'applicantUserId',v_app.applicant_user_id,'applicantEmail',v_member.oberlin_email,'applicantName',v_member.display_name);
end $$;

create or replace function public.respond_project_team_invite(p_invite_id uuid,p_decision text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_user uuid:=(select auth.uid());v_invite public.project_team_invites%rowtype;v_project public.projects%rowtype;begin
  select * into v_invite from public.project_team_invites where id=p_invite_id for update;if not found then raise exception 'PROJECT_INVITE_NOT_FOUND';end if;
  if v_invite.invited_user_id<>v_user then raise exception 'PROJECT_INVITE_NOT_YOURS';end if;
  if v_invite.status<>'PENDING' then raise exception 'PROJECT_INVITE_ALREADY_RESPONDED';end if;
  if v_invite.expires_at<=now() then update public.project_team_invites set status='EXPIRED',updated_at=now() where id=p_invite_id;return jsonb_build_object('inviteId',p_invite_id,'status','EXPIRED');end if;
  if not private.is_active_member() then raise exception 'ACTIVE_MEMBER_REQUIRED';end if;
  if p_decision not in ('ACCEPT','DECLINE') then raise exception 'PROJECT_INVITE_DECISION_INVALID';end if;
  select * into v_project from public.projects where id=v_invite.project_id;
  if p_decision='ACCEPT' then
    insert into public.project_memberships(project_id,user_id,role,status) values(v_invite.project_id,v_user,'MEMBER','ACTIVE')
      on conflict(project_id,user_id) do update set role=case when public.project_memberships.status='ACTIVE' then public.project_memberships.role else 'MEMBER'::public.project_membership_role end,status='ACTIVE',updated_at=now();
    update public.project_team_invites set status='ACCEPTED',responded_at=now(),updated_at=now() where id=p_invite_id;
    insert into public.member_notifications(user_id,kind,title,body,action_url) values(v_invite.invited_by_user_id,'PROJECT_INVITE_ACCEPTED','Project invitation accepted','A member accepted your invitation to "'||v_project.title||'".','/member/teams/'||v_invite.project_id::text);
  else
    update public.project_team_invites set status='DECLINED',responded_at=now(),updated_at=now() where id=p_invite_id;
  end if;
  return jsonb_build_object('inviteId',p_invite_id,'projectId',v_invite.project_id,'projectTitle',v_project.title,'status',case when p_decision='ACCEPT' then 'ACCEPTED' else 'DECLINED' end);
end $$;

notify pgrst, 'reload schema';
