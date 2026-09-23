-- Officer project-team management and member progress tools.
--
-- * Approving project interest adds a regular team member by default. Leads are
--   an explicit choice, and officers can change or remove any roster role.
-- * Officers can start a project (kickoff record, in-app notice, email from the
--   server) and delete a project after typing its title.
-- * Team members can move milestones, claim them, post to a private team feed,
--   share working links, and leave a project themselves.

alter table public.projects add column if not exists started_at timestamptz;
alter table public.project_milestones add column if not exists assignee_user_id uuid references public.member_profiles(user_id) on delete set null;
alter table public.project_milestones add column if not exists completed_at timestamptz;

create table if not exists public.project_kickoffs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  message text not null default '' check(length(message)<=4000),
  meeting_at timestamptz,
  meeting_location text not null default '' check(length(meeting_location)<=300),
  sent_by uuid references auth.users(id) on delete set null,
  recipient_count integer not null default 0,
  emails_sent integer,
  created_at timestamptz not null default now()
);
create index if not exists project_kickoffs_project_idx on public.project_kickoffs(project_id,created_at desc);

create table if not exists public.project_team_posts (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  author_user_id uuid references auth.users(id) on delete set null,
  author_name text not null,
  officer boolean not null default false,
  kind text not null default 'UPDATE' check(kind in ('UPDATE','WIN','BLOCKER','QUESTION')),
  body text not null check(length(trim(body)) between 2 and 4000),
  created_at timestamptz not null default clock_timestamp()
);
create index if not exists project_team_posts_project_idx on public.project_team_posts(project_id,created_at desc);

create table if not exists public.project_team_links (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  label text not null check(length(trim(label)) between 1 and 120),
  url text not null check(url ~ '^https?://[^[:space:]]+$' and length(url)<=2000),
  added_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists project_team_links_project_idx on public.project_team_links(project_id,created_at);

alter table public.project_kickoffs enable row level security;
alter table public.project_team_posts enable row level security;
alter table public.project_team_links enable row level security;
drop policy if exists "project members read kickoffs" on public.project_kickoffs;
drop policy if exists "project members read team posts" on public.project_team_posts;
drop policy if exists "project members read team links" on public.project_team_links;
create policy "project members read kickoffs" on public.project_kickoffs for select to authenticated
  using(private.is_project_member(project_id) or private.is_admin_or_super());
create policy "project members read team posts" on public.project_team_posts for select to authenticated
  using(private.is_project_member(project_id) or private.is_admin_or_super());
create policy "project members read team links" on public.project_team_links for select to authenticated
  using(private.is_project_member(project_id) or private.is_admin_or_super());
-- All writes go through the RPCs below.

-- Approve a project application or a public "join a project" request. MEMBER is
-- the default; an active lead is never demoted by a later approval.
create or replace function public.admin_approve_project_interest(p_source text,p_request_id uuid,p_project_id uuid default null,p_role text default 'MEMBER')
returns jsonb language plpgsql security definer set search_path='' as $$
declare
  v_admin uuid := (select auth.uid());
  v_application public.project_applications%rowtype;
  v_submission public.submissions%rowtype;
  v_member public.member_profiles%rowtype;
  v_project public.projects%rowtype;
  v_current public.project_memberships%rowtype;
  v_project_id uuid;
  v_role public.project_membership_role;
  v_already boolean := false;
begin
  if v_admin is null or not coalesce(private.is_admin_or_super(),false) then raise exception 'PROJECT_TEAM_ADMIN_REQUIRED'; end if;
  if coalesce(p_role,'') not in ('MEMBER','LEAD') then raise exception 'PROJECT_ROLE_INVALID'; end if;
  v_role := p_role::public.project_membership_role;

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

  select * into v_current from public.project_memberships where project_id=v_project_id and user_id=v_member.user_id for update;
  if v_already then
    return jsonb_build_object('projectId',v_project_id,'projectTitle',v_project.title,'userId',v_member.user_id,
      'memberName',v_member.display_name,'memberEmail',v_member.oberlin_email,'role',coalesce(v_current.role,v_role),'alreadyApproved',true);
  end if;
  if v_current.user_id is not null and v_current.status='ACTIVE' and v_current.role='LEAD' then v_role := 'LEAD'; end if;

  insert into public.project_memberships(project_id,user_id,role,status) values(v_project_id,v_member.user_id,v_role,'ACTIVE')
    on conflict(project_id,user_id) do update set role=excluded.role,status='ACTIVE',updated_at=now();
  if p_source='application' then
    update public.project_applications set status='ACCEPTED',reviewed_by_admin_id=v_admin,reviewed_at=now(),
      decision_note=case when v_role='LEAD' then 'Approved as project lead' else 'Added to the project team' end,updated_at=now() where id=p_request_id;
  else
    update public.submissions set status='approved',approved_project_id=v_project_id,approved_project_user_id=v_member.user_id where id=p_request_id;
    update public.project_applications set status='ACCEPTED',reviewed_by_admin_id=v_admin,reviewed_at=now(),decision_note='Added to the project team',updated_at=now()
      where project_id=v_project_id and applicant_user_id=v_member.user_id and status='PENDING';
  end if;

  insert into public.member_notifications(user_id,kind,title,body,action_url)
  values(v_member.user_id,case when v_role='LEAD' then 'PROJECT_LEAD_APPROVED' else 'PROJECT_MEMBER_APPROVED' end,
    case when v_role='LEAD' then 'You are a project lead' else 'You joined a project team' end,
    case when v_role='LEAD' then 'You were approved to lead "'||v_project.title||'". You can now invite teammates and review applications.'
      else 'You are now on the "'||v_project.title||'" team. Open the workspace to meet your team and see the plan.' end,
    '/member/teams/'||v_project_id::text);
  insert into public.audit_log(actor_id,action,entity_type,entity_id,after_snapshot)
  values(v_admin,case when v_role='LEAD' then 'PROJECT_LEAD_APPROVED' else 'PROJECT_MEMBER_APPROVED' end,
    case when p_source='application' then 'project_application' else 'submission' end,p_request_id::text,
    jsonb_build_object('projectId',v_project_id,'userId',v_member.user_id,'role',v_role));
  return jsonb_build_object('projectId',v_project_id,'projectTitle',v_project.title,'userId',v_member.user_id,
    'memberName',v_member.display_name,'memberEmail',v_member.oberlin_email,'role',v_role,'alreadyApproved',false);
end $$;

-- Officers can decline applications too, so projects without a lead are never stuck.
create or replace function public.review_project_application(p_application_id uuid,p_decision text,p_note text default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_user uuid:=(select auth.uid());v_app public.project_applications%rowtype;v_project public.projects%rowtype;v_member public.member_profiles%rowtype;v_by_lead boolean;begin
  select * into v_app from public.project_applications where id=p_application_id for update;
  if not found then raise exception 'PROJECT_APPLICATION_NOT_FOUND';end if;
  v_by_lead := private.is_project_lead(v_app.project_id);
  if not (v_by_lead or coalesce(private.is_admin_or_super(),false)) then raise exception 'PROJECT_LEAD_REQUIRED';end if;
  if v_app.status<>'PENDING' then raise exception 'PROJECT_APPLICATION_ALREADY_REVIEWED';end if;
  if p_decision not in ('ACCEPT','REJECT') then raise exception 'PROJECT_APPLICATION_DECISION_INVALID';end if;
  select * into v_project from public.projects where id=v_app.project_id;
  select * into v_member from public.member_profiles where user_id=v_app.applicant_user_id;
  if p_decision='ACCEPT' then
    if v_member.status is distinct from 'ACTIVE' then raise exception 'APPLICANT_NOT_ACTIVE';end if;
    insert into public.project_memberships(project_id,user_id,role,status) values(v_app.project_id,v_app.applicant_user_id,'MEMBER','ACTIVE')
      on conflict(project_id,user_id) do update set role=case when public.project_memberships.status='ACTIVE' then public.project_memberships.role else 'MEMBER'::public.project_membership_role end,status='ACTIVE',updated_at=now();
    update public.project_applications set status='ACCEPTED',reviewed_by_user_id=case when v_by_lead then v_user end,reviewed_by_admin_id=case when v_by_lead then null else v_user end,
      reviewed_at=now(),decision_note=p_note,updated_at=now() where id=p_application_id;
    insert into public.member_notifications(user_id,kind,title,body,action_url) values(v_app.applicant_user_id,'PROJECT_APPLICATION_ACCEPTED','Project application accepted','You joined "'||v_project.title||'".','/member/teams/'||v_app.project_id::text);
  else
    update public.project_applications set status='REJECTED',reviewed_by_user_id=case when v_by_lead then v_user end,reviewed_by_admin_id=case when v_by_lead then null else v_user end,
      reviewed_at=now(),decision_note=p_note,updated_at=now() where id=p_application_id;
    if v_member.user_id is not null then
      insert into public.member_notifications(user_id,kind,title,body,action_url) values(v_app.applicant_user_id,'PROJECT_APPLICATION_REJECTED','Project application update','Your application to "'||v_project.title||'" was not accepted at this time.','/member/applications');
    end if;
  end if;
  return jsonb_build_object('applicationId',p_application_id,'projectId',v_app.project_id,'projectTitle',v_project.title,'status',case when p_decision='ACCEPT' then 'ACCEPTED' else 'REJECTED' end,'applicantUserId',v_app.applicant_user_id,'applicantEmail',v_member.oberlin_email,'applicantName',v_member.display_name);
end $$;

-- Add someone to a project, or change their role. Officers only.
create or replace function public.admin_set_project_member(p_project_id uuid,p_user_id uuid,p_role text default 'MEMBER')
returns jsonb language plpgsql security definer set search_path='' as $$
declare
  v_admin uuid := (select auth.uid());
  v_project public.projects%rowtype;
  v_member public.member_profiles%rowtype;
  v_previous public.project_membership_role;
  v_role public.project_membership_role;
begin
  if v_admin is null or not coalesce(private.is_admin_or_super(),false) then raise exception 'PROJECT_TEAM_ADMIN_REQUIRED'; end if;
  if coalesce(p_role,'') not in ('MEMBER','LEAD') then raise exception 'PROJECT_ROLE_INVALID'; end if;
  v_role := p_role::public.project_membership_role;
  select * into v_project from public.projects where id=p_project_id for no key update;
  if not found then raise exception 'PROJECT_NOT_FOUND'; end if;
  select * into v_member from public.member_profiles where user_id=p_user_id and status='ACTIVE' for share;
  if not found then raise exception 'ACTIVE_MEMBER_REQUIRED'; end if;
  select r.role into v_previous from private.effective_project_roster(p_project_id) r where r.user_id=p_user_id;
  if v_previous is not distinct from v_role then
    return jsonb_build_object('projectId',p_project_id,'projectTitle',v_project.title,'userId',p_user_id,'memberName',v_member.display_name,
      'memberEmail',v_member.oberlin_email,'role',v_role,'previousRole',v_previous,'changed',false);
  end if;

  insert into public.project_memberships(project_id,user_id,role,status) values(p_project_id,p_user_id,v_role,'ACTIVE')
    on conflict(project_id,user_id) do update set role=excluded.role,status='ACTIVE',updated_at=now();
  update public.project_applications set status='ACCEPTED',reviewed_by_admin_id=v_admin,reviewed_at=now(),decision_note='Added to the project team by an officer',updated_at=now()
    where project_id=p_project_id and applicant_user_id=p_user_id and status='PENDING';

  insert into public.member_notifications(user_id,kind,title,body,action_url)
  values(p_user_id,'PROJECT_ROLE_UPDATED',
    case when v_previous is null and v_role='LEAD' then 'You are a project lead'
      when v_previous is null then 'You joined a project team'
      when v_role='LEAD' then 'You are now a project lead'
      else 'Your project role changed' end,
    case when v_previous is null and v_role='LEAD' then 'Club officers made you a lead of "'||v_project.title||'".'
      when v_previous is null then 'Club officers added you to the "'||v_project.title||'" team.'
      when v_role='LEAD' then 'Club officers made you a lead of "'||v_project.title||'". You can now invite teammates, review applications, and manage milestones.'
      else 'You are now a team member on "'||v_project.title||'". Another member leads the project.' end,
    '/member/teams/'||p_project_id::text);
  insert into public.audit_log(actor_id,action,entity_type,entity_id,before_snapshot,after_snapshot)
  values(v_admin,'PROJECT_MEMBER_ROLE_SET','project',p_project_id::text,jsonb_build_object('userId',p_user_id,'role',v_previous),jsonb_build_object('userId',p_user_id,'role',v_role));
  return jsonb_build_object('projectId',p_project_id,'projectTitle',v_project.title,'userId',p_user_id,'memberName',v_member.display_name,
    'memberEmail',v_member.oberlin_email,'role',v_role,'previousRole',v_previous,'changed',true);
end $$;

-- Remove anyone from a project roster, including leads. Officers only.
create or replace function public.admin_remove_project_member(p_project_id uuid,p_user_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_admin uuid := (select auth.uid());v_title text;v_role public.project_membership_role;begin
  if v_admin is null or not coalesce(private.is_admin_or_super(),false) then raise exception 'PROJECT_TEAM_ADMIN_REQUIRED'; end if;
  select title into v_title from public.projects where id=p_project_id for no key update;
  if not found then raise exception 'PROJECT_NOT_FOUND'; end if;
  select r.role into v_role from private.effective_project_roster(p_project_id) r where r.user_id=p_user_id;
  if not found then
    -- The effective roster hides suspended accounts; officers can still revoke their direct access.
    select role into v_role from public.project_memberships where project_id=p_project_id and user_id=p_user_id and status='ACTIVE';
    if not found then raise exception 'PROJECT_MEMBER_NOT_FOUND'; end if;
  end if;
  insert into public.project_memberships(project_id,user_id,role,status) values(p_project_id,p_user_id,'MEMBER','REMOVED')
    on conflict(project_id,user_id) do update set status='REMOVED',updated_at=now();
  update public.project_milestones set assignee_user_id=null,updated_at=now() where project_id=p_project_id and assignee_user_id=p_user_id and status<>'DONE';
  insert into public.member_notifications(user_id,kind,title,body,action_url)
  values(p_user_id,'PROJECT_MEMBERSHIP_REMOVED','Project team membership updated','You are no longer on the "'||v_title||'" project team. Your other teams are unchanged.','/member/teams');
  insert into public.audit_log(actor_id,action,entity_type,entity_id,before_snapshot,after_snapshot)
  values(v_admin,'PROJECT_MEMBER_REMOVED','project',p_project_id::text,jsonb_build_object('userId',p_user_id,'role',v_role),jsonb_build_object('userId',p_user_id,'status','REMOVED'));
  return jsonb_build_object('projectId',p_project_id,'userId',p_user_id,'previousRole',v_role);
end $$;

-- One row per project for the officer overview.
create or replace function public.admin_list_project_teams()
returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
  if not coalesce(private.is_admin_or_super(),false) then raise exception 'PROJECT_TEAM_ADMIN_REQUIRED'; end if;
  return coalesce((select jsonb_agg(entry order by sort_title) from (
    select lower(p.title) sort_title,jsonb_build_object(
      'id',p.id,'title',p.title,'slug',p.slug,'status',p.status,'publicationState',p.publication_state,'recruiting',p.recruiting,
      'startedAt',p.started_at,'leadName',p.lead_name,
      'memberCount',(select count(*) from private.effective_project_roster(p.id)),
      'leads',coalesce((select jsonb_agg(mp.display_name order by lower(mp.display_name)) from private.effective_project_roster(p.id) r join public.member_profiles mp on mp.user_id=r.user_id where r.role='LEAD'),'[]'::jsonb),
      'pendingApplications',(select count(*) from public.project_applications a where a.project_id=p.id and a.status='PENDING'),
      'milestonesTotal',(select count(*) from public.project_milestones m where m.project_id=p.id),
      'milestonesDone',(select count(*) from public.project_milestones m where m.project_id=p.id and m.status='DONE'),
      'lastActivityAt',greatest(p.started_at,
        (select max(created_at) from public.project_team_posts t where t.project_id=p.id),
        (select max(updated_at) from public.project_milestones m where m.project_id=p.id),
        (select max(joined_at) from public.project_memberships pm where pm.project_id=p.id and pm.status='ACTIVE'))
    ) entry from public.projects p
  ) entries),'[]'::jsonb);
end $$;

-- Everything an officer needs to run one project team.
create or replace function public.admin_project_team(p_project_id uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare v_project public.projects%rowtype;begin
  if not coalesce(private.is_admin_or_super(),false) then raise exception 'PROJECT_TEAM_ADMIN_REQUIRED'; end if;
  select * into v_project from public.projects where id=p_project_id;
  if not found then raise exception 'PROJECT_NOT_FOUND'; end if;
  return jsonb_build_object(
    'project',jsonb_build_object('id',v_project.id,'title',v_project.title,'slug',v_project.slug,'summary',v_project.summary,'status',v_project.status,
      'publicationState',v_project.publication_state,'recruiting',v_project.recruiting,'leadName',v_project.lead_name,'nextStep',v_project.next_step,'startedAt',v_project.started_at),
    'roster',coalesce((select jsonb_agg(jsonb_build_object('userId',r.user_id,'displayName',mp.display_name,'email',mp.oberlin_email,'role',r.role,'joinedAt',r.joined_at,
        'viaTeam',not exists(select 1 from public.project_memberships pm where pm.project_id=p_project_id and pm.user_id=r.user_id and pm.status='ACTIVE'))
      order by r.role,lower(mp.display_name)) from private.effective_project_roster(p_project_id) r join public.member_profiles mp on mp.user_id=r.user_id),'[]'::jsonb),
    'applications',coalesce((select jsonb_agg(jsonb_build_object('id',a.id,'userId',a.applicant_user_id,'displayName',mp.display_name,'email',mp.oberlin_email,
        'motivation',a.motivation,'skills',a.skills,'createdAt',a.created_at) order by a.created_at)
      from public.project_applications a join public.member_profiles mp on mp.user_id=a.applicant_user_id where a.project_id=p_project_id and a.status='PENDING'),'[]'::jsonb),
    'milestones',coalesce((select jsonb_agg(jsonb_build_object('id',m.id,'title',m.title,'description',m.description,'status',m.status,'dueDate',m.due_date,
        'assigneeName',mp.display_name,'completedAt',m.completed_at) order by m.sort_order,m.created_at)
      from public.project_milestones m left join public.member_profiles mp on mp.user_id=m.assignee_user_id where m.project_id=p_project_id),'[]'::jsonb),
    'posts',coalesce((select jsonb_agg(post order by created_at desc) from (select t.created_at,jsonb_build_object('id',t.id,'kind',t.kind,'body',t.body,
        'authorName',t.author_name,'officer',t.officer,'createdAt',t.created_at) post from public.project_team_posts t where t.project_id=p_project_id order by t.created_at desc limit 20) recent),'[]'::jsonb),
    'links',coalesce((select jsonb_agg(jsonb_build_object('id',l.id,'label',l.label,'url',l.url) order by l.created_at) from public.project_team_links l where l.project_id=p_project_id),'[]'::jsonb),
    'kickoffs',coalesce((select jsonb_agg(jsonb_build_object('id',k.id,'message',k.message,'meetingAt',k.meeting_at,'meetingLocation',k.meeting_location,
        'recipientCount',k.recipient_count,'emailsSent',k.emails_sent,'createdAt',k.created_at,'sentByName',ap.display_name) order by k.created_at desc)
      from public.project_kickoffs k left join public.admin_profiles ap on ap.user_id=k.sent_by where k.project_id=p_project_id),'[]'::jsonb),
    'updates',coalesce((select jsonb_agg(jsonb_build_object('id',u.id,'title',u.title,'reviewStatus',r.status,'submittedAt',r.submitted_at) order by r.submitted_at desc)
      from public.project_update_reviews r join public.project_updates u on u.id=r.project_update_id where r.project_id=p_project_id),'[]'::jsonb));
end $$;

-- Start a project: mark it active, record the kickoff, and notify the whole team.
-- The server sends kickoff email to the returned recipients.
create or replace function public.start_project(p_project_id uuid,p_message text default '',p_meeting_at timestamptz default null,p_location text default '')
returns jsonb language plpgsql security definer set search_path='' as $$
declare
  v_admin uuid := (select auth.uid());
  v_project public.projects%rowtype;
  v_leads text;
  v_next_step text;
  v_kickoff uuid;
  v_recipients jsonb;
  v_count integer;
begin
  if v_admin is null or not coalesce(private.is_admin_or_super(),false) then raise exception 'PROJECT_TEAM_ADMIN_REQUIRED'; end if;
  if length(coalesce(p_message,''))>4000 then raise exception 'KICKOFF_MESSAGE_TOO_LONG'; end if;
  if length(coalesce(p_location,''))>300 then raise exception 'KICKOFF_LOCATION_TOO_LONG'; end if;
  select * into v_project from public.projects where id=p_project_id for update;
  if not found then raise exception 'PROJECT_NOT_FOUND'; end if;
  if v_project.status='complete' then raise exception 'PROJECT_ALREADY_COMPLETE'; end if;

  select coalesce(jsonb_agg(jsonb_build_object('userId',r.user_id,'displayName',mp.display_name,'email',mp.oberlin_email,'role',r.role) order by r.role,lower(mp.display_name)),'[]'::jsonb),count(*)
    into v_recipients,v_count
    from private.effective_project_roster(p_project_id) r join public.member_profiles mp on mp.user_id=r.user_id;
  if v_count=0 then raise exception 'PROJECT_HAS_NO_MEMBERS'; end if;

  select string_agg(mp.display_name,', ' order by lower(mp.display_name)) into v_leads
    from private.effective_project_roster(p_project_id) r join public.member_profiles mp on mp.user_id=r.user_id where r.role='LEAD';
  v_next_step := 'Team kickoff'||coalesce(' at '||nullif(trim(p_location),''),'');

  update public.projects set status='active',started_at=coalesce(started_at,now()),
    lead_name=case when trim(lead_name)='' then coalesce(v_leads,'') else lead_name end,
    next_step=case when trim(next_step)='' then v_next_step else next_step end,updated_at=now()
    where id=p_project_id;
  -- Keep an open CMS draft from reverting the stage on its next publish.
  update public.content_drafts set payload=payload||jsonb_build_object('status','active')
      ||case when coalesce(payload->>'leadName','')='' and coalesce(v_leads,'')<>'' then jsonb_build_object('leadName',v_leads) else '{}'::jsonb end
      ||case when coalesce(payload->>'nextStep','')='' then jsonb_build_object('nextStep',v_next_step) else '{}'::jsonb end,
    updated_at=now() where entity_type='projects' and entity_id=p_project_id;

  insert into public.project_kickoffs(project_id,message,meeting_at,meeting_location,sent_by,recipient_count)
    values(p_project_id,trim(coalesce(p_message,'')),p_meeting_at,trim(coalesce(p_location,'')),v_admin,v_count) returning id into v_kickoff;
  insert into public.member_notifications(user_id,kind,title,body,action_url)
    select r.user_id,'PROJECT_STARTED','Your project is starting',
      '"'||v_project.title||'" is officially underway. Open the workspace for the kickoff details and first milestones.',
      '/member/teams/'||p_project_id::text
    from private.effective_project_roster(p_project_id) r;
  insert into public.audit_log(actor_id,action,entity_type,entity_id,before_snapshot,after_snapshot)
    values(v_admin,'PROJECT_STARTED','project',p_project_id::text,jsonb_build_object('status',v_project.status,'startedAt',v_project.started_at),
      jsonb_build_object('status','active','kickoffId',v_kickoff,'recipientCount',v_count));
  return jsonb_build_object('kickoffId',v_kickoff,'projectId',p_project_id,'projectTitle',v_project.title,'projectSlug',v_project.slug,
    'restarted',v_project.started_at is not null,'recipients',v_recipients);
end $$;

create or replace function public.record_project_kickoff_delivery(p_kickoff_id uuid,p_emails_sent integer)
returns boolean language plpgsql security definer set search_path='' as $$
begin
  if not coalesce(private.is_admin_or_super(),false) then raise exception 'PROJECT_TEAM_ADMIN_REQUIRED'; end if;
  update public.project_kickoffs set emails_sent=greatest(coalesce(p_emails_sent,0),0) where id=p_kickoff_id;
  return found;
end $$;

-- Permanently delete a project after the officer types its title.
create or replace function public.delete_project(p_project_id uuid,p_confirm_title text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_admin uuid := (select auth.uid());v_project public.projects%rowtype;v_notified integer;begin
  if v_admin is null or not coalesce(private.is_admin_or_super(),false) then raise exception 'PROJECT_TEAM_ADMIN_REQUIRED'; end if;
  select * into v_project from public.projects where id=p_project_id for update;
  if not found then raise exception 'PROJECT_NOT_FOUND'; end if;
  if lower(trim(coalesce(p_confirm_title,'')))<>lower(trim(v_project.title)) then raise exception 'PROJECT_DELETE_CONFIRMATION_MISMATCH'; end if;

  insert into public.member_notifications(user_id,kind,title,body,action_url)
    select r.user_id,'PROJECT_DELETED','A project was closed','"'||v_project.title||'" was removed by the club officers. Your other teams are unchanged.','/member/teams'
    from private.effective_project_roster(p_project_id) r;
  get diagnostics v_notified = row_count;
  delete from public.saved_items where item_type='PROJECT' and item_id=p_project_id;
  delete from public.content_drafts where (entity_type='projects' and entity_id=p_project_id)
    or (entity_type='project_updates' and entity_id in (select id from public.project_updates where project_id=p_project_id));
  delete from public.scheduled_publications where processed_at is null and (target_id=p_project_id
    or target_id in (select id from public.project_updates where project_id=p_project_id));
  insert into public.audit_log(actor_id,action,entity_type,entity_id,before_snapshot,after_snapshot)
    values(v_admin,'PROJECT_DELETED','project',p_project_id::text,to_jsonb(v_project),jsonb_build_object('notifiedMembers',v_notified));
  -- Memberships, applications, invitations, milestones, updates, team posts and links cascade.
  delete from public.projects where id=p_project_id;
  return jsonb_build_object('projectId',p_project_id,'title',v_project.title,'notifiedMembers',v_notified);
end $$;

-- Members leave a project themselves. A sole lead hands off first so the team keeps a lead.
create or replace function public.leave_project(p_project_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_user uuid := (select auth.uid());v_role public.project_membership_role;v_title text;v_name text;begin
  if not private.is_project_member(p_project_id) then raise exception 'PROJECT_MEMBER_REQUIRED'; end if;
  select title into v_title from public.projects where id=p_project_id for no key update;
  select r.role into v_role from private.effective_project_roster(p_project_id) r where r.user_id=v_user;
  if v_role='LEAD'
    and not exists(select 1 from private.effective_project_roster(p_project_id) r where r.role='LEAD' and r.user_id<>v_user)
    and exists(select 1 from private.effective_project_roster(p_project_id) r where r.user_id<>v_user) then
    raise exception 'SOLE_PROJECT_LEAD';
  end if;
  insert into public.project_memberships(project_id,user_id,role,status) values(p_project_id,v_user,'MEMBER','LEFT')
    on conflict(project_id,user_id) do update set status='LEFT',updated_at=now();
  update public.project_milestones set assignee_user_id=null,updated_at=now() where project_id=p_project_id and assignee_user_id=v_user and status<>'DONE';
  select display_name into v_name from public.member_profiles where user_id=v_user;
  insert into public.member_notifications(user_id,kind,title,body,action_url)
    select r.user_id,'PROJECT_MEMBER_LEFT','A teammate left the project',coalesce(v_name,'A member')||' left "'||v_title||'".','/member/teams/'||p_project_id::text
    from private.effective_project_roster(p_project_id) r where r.role='LEAD';
  return jsonb_build_object('projectId',p_project_id,'status','LEFT');
end $$;

-- Leads plan milestones (with an optional owner); every team member can move them.
drop function if exists public.upsert_project_milestone(uuid,uuid,text,text,text,date,integer);
create or replace function public.upsert_project_milestone(p_project_id uuid,p_milestone_id uuid,p_title text,p_description text,p_status text,p_due_date date,p_sort_order integer default 100,p_assignee_user_id uuid default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_id uuid;begin
  if not private.is_project_lead(p_project_id) then raise exception 'PROJECT_LEAD_REQUIRED';end if;
  if length(trim(coalesce(p_title,'')))<2 then raise exception 'MILESTONE_TITLE_REQUIRED';end if;
  if p_status not in ('TODO','IN_PROGRESS','BLOCKED','DONE') then raise exception 'MILESTONE_STATUS_INVALID';end if;
  if p_assignee_user_id is not null and not exists(select 1 from private.effective_project_roster(p_project_id) r where r.user_id=p_assignee_user_id) then raise exception 'MILESTONE_ASSIGNEE_NOT_ON_TEAM';end if;
  if p_milestone_id is null then
    insert into public.project_milestones(project_id,title,description,status,due_date,sort_order,created_by,assignee_user_id,completed_at)
    values(p_project_id,trim(p_title),trim(coalesce(p_description,'')),p_status::public.project_milestone_status,p_due_date,coalesce(p_sort_order,100),(select auth.uid()),p_assignee_user_id,
      case when p_status='DONE' then now() end) returning id into v_id;
  else
    update public.project_milestones set title=trim(p_title),description=trim(coalesce(p_description,'')),status=p_status::public.project_milestone_status,due_date=p_due_date,
      sort_order=coalesce(p_sort_order,100),assignee_user_id=p_assignee_user_id,completed_at=case when p_status='DONE' then coalesce(completed_at,now()) end,updated_at=now()
    where id=p_milestone_id and project_id=p_project_id returning id into v_id;
    if v_id is null then raise exception 'MILESTONE_NOT_FOUND';end if;
  end if;
  return jsonb_build_object('id',v_id,'status',p_status);
end $$;

create or replace function public.set_project_milestone_status(p_milestone_id uuid,p_status text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_user uuid := (select auth.uid());v_milestone public.project_milestones%rowtype;v_title text;v_name text;begin
  select * into v_milestone from public.project_milestones where id=p_milestone_id for update;
  if not found then raise exception 'MILESTONE_NOT_FOUND'; end if;
  if not private.is_project_member(v_milestone.project_id) then raise exception 'PROJECT_MEMBER_REQUIRED'; end if;
  if coalesce(p_status,'') not in ('TODO','IN_PROGRESS','BLOCKED','DONE') then raise exception 'MILESTONE_STATUS_INVALID'; end if;
  update public.project_milestones set status=p_status::public.project_milestone_status,
    completed_at=case when p_status='DONE' then coalesce(completed_at,now()) end,updated_at=now() where id=p_milestone_id;
  if p_status='DONE' and v_milestone.status<>'DONE' then
    select title into v_title from public.projects where id=v_milestone.project_id;
    select display_name into v_name from public.member_profiles where user_id=v_user;
    insert into public.member_notifications(user_id,kind,title,body,action_url)
      select r.user_id,'PROJECT_MILESTONE_DONE','Milestone complete',coalesce(v_name,'A teammate')||' finished "'||v_milestone.title||'" on "'||v_title||'".','/member/teams/'||v_milestone.project_id::text
      from private.effective_project_roster(v_milestone.project_id) r where r.user_id<>v_user;
  end if;
  return jsonb_build_object('id',p_milestone_id,'status',p_status);
end $$;

create or replace function public.claim_project_milestone(p_milestone_id uuid,p_claim boolean default true)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_user uuid := (select auth.uid());v_milestone public.project_milestones%rowtype;begin
  select * into v_milestone from public.project_milestones where id=p_milestone_id for update;
  if not found then raise exception 'MILESTONE_NOT_FOUND'; end if;
  if not private.is_project_member(v_milestone.project_id) then raise exception 'PROJECT_MEMBER_REQUIRED'; end if;
  if p_claim then
    if v_milestone.assignee_user_id is not null and v_milestone.assignee_user_id<>v_user then raise exception 'MILESTONE_ALREADY_CLAIMED'; end if;
    update public.project_milestones set assignee_user_id=v_user,updated_at=now() where id=p_milestone_id;
  else
    if v_milestone.assignee_user_id is distinct from v_user and not private.is_project_lead(v_milestone.project_id) then raise exception 'MILESTONE_NOT_YOURS'; end if;
    update public.project_milestones set assignee_user_id=null,updated_at=now() where id=p_milestone_id;
  end if;
  return jsonb_build_object('id',p_milestone_id,'assigneeUserId',case when p_claim then v_user end);
end $$;

create or replace function public.delete_project_milestone(p_milestone_id uuid)
returns boolean language plpgsql security definer set search_path='' as $$
declare v_project uuid;begin
  select project_id into v_project from public.project_milestones where id=p_milestone_id;
  if not found then raise exception 'MILESTONE_NOT_FOUND'; end if;
  if not private.is_project_lead(v_project) then raise exception 'PROJECT_LEAD_REQUIRED'; end if;
  delete from public.project_milestones where id=p_milestone_id;
  return true;
end $$;

-- Private team feed: quick progress notes, wins, blockers and questions.
create or replace function public.post_project_team_update(p_project_id uuid,p_kind text,p_body text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_user uuid := (select auth.uid());v_member boolean;v_name text;v_title text;v_id uuid;begin
  v_member := private.is_project_member(p_project_id);
  if v_user is null or not (v_member or coalesce(private.is_admin_or_super(),false)) then raise exception 'PROJECT_MEMBER_REQUIRED'; end if;
  if coalesce(p_kind,'') not in ('UPDATE','WIN','BLOCKER','QUESTION') then raise exception 'TEAM_POST_KIND_INVALID'; end if;
  if length(trim(coalesce(p_body,''))) not between 2 and 4000 then raise exception 'TEAM_POST_REQUIRED'; end if;
  select title into v_title from public.projects where id=p_project_id;
  if not found then raise exception 'PROJECT_NOT_FOUND'; end if;
  if v_member then select display_name into v_name from public.member_profiles where user_id=v_user;
  else select coalesce(nullif(display_name,''),'Club officer') into v_name from public.admin_profiles where user_id=v_user; end if;
  insert into public.project_team_posts(project_id,author_user_id,author_name,officer,kind,body)
    values(p_project_id,v_user,coalesce(v_name,'OEC member'),not v_member,p_kind,trim(p_body)) returning id into v_id;
  insert into public.member_notifications(user_id,kind,title,body,action_url)
    select r.user_id,'PROJECT_TEAM_POST',
      case p_kind when 'BLOCKER' then 'Your team hit a blocker' when 'WIN' then 'Team win' when 'QUESTION' then 'Question for your team' else 'New team update' end,
      coalesce(v_name,'A teammate')||' on "'||v_title||'": '||left(trim(p_body),140)||case when length(trim(p_body))>140 then '...' else '' end,
      '/member/teams/'||p_project_id::text||'#team-feed'
    from private.effective_project_roster(p_project_id) r where r.user_id<>v_user;
  return jsonb_build_object('id',v_id);
end $$;

create or replace function public.delete_project_team_post(p_post_id uuid)
returns boolean language plpgsql security definer set search_path='' as $$
declare v_post public.project_team_posts%rowtype;begin
  select * into v_post from public.project_team_posts where id=p_post_id;
  if not found then raise exception 'TEAM_POST_NOT_FOUND'; end if;
  if not (v_post.author_user_id=(select auth.uid()) or private.is_project_lead(v_post.project_id) or coalesce(private.is_admin_or_super(),false)) then raise exception 'TEAM_POST_FORBIDDEN'; end if;
  delete from public.project_team_posts where id=p_post_id;
  return true;
end $$;

-- Shared working links: drive folders, CAD, repositories, parts lists.
create or replace function public.add_project_team_link(p_project_id uuid,p_label text,p_url text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_id uuid;begin
  if not (private.is_project_member(p_project_id) or coalesce(private.is_admin_or_super(),false)) then raise exception 'PROJECT_MEMBER_REQUIRED'; end if;
  if length(trim(coalesce(p_label,''))) not between 1 and 120 then raise exception 'TEAM_LINK_LABEL_REQUIRED'; end if;
  if trim(coalesce(p_url,'')) !~ '^https?://[^[:space:]]+$' or length(trim(p_url))>2000 then raise exception 'TEAM_LINK_INVALID'; end if;
  if (select count(*) from public.project_team_links where project_id=p_project_id)>=30 then raise exception 'TEAM_LINK_LIMIT_REACHED'; end if;
  insert into public.project_team_links(project_id,label,url,added_by) values(p_project_id,trim(p_label),trim(p_url),(select auth.uid())) returning id into v_id;
  return jsonb_build_object('id',v_id);
end $$;

create or replace function public.remove_project_team_link(p_link_id uuid)
returns boolean language plpgsql security definer set search_path='' as $$
declare v_link public.project_team_links%rowtype;begin
  select * into v_link from public.project_team_links where id=p_link_id;
  if not found then raise exception 'TEAM_LINK_NOT_FOUND'; end if;
  if not (v_link.added_by=(select auth.uid()) or private.is_project_lead(v_link.project_id) or coalesce(private.is_admin_or_super(),false)) then raise exception 'TEAM_LINK_FORBIDDEN'; end if;
  delete from public.project_team_links where id=p_link_id;
  return true;
end $$;

-- The member workspace now carries kickoff details, the team feed, links and milestone owners.
create or replace function public.get_project_workspace(p_project_id uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare v_project public.projects%rowtype;v_role public.project_membership_role;begin
  if not private.is_project_member(p_project_id) then raise exception 'PROJECT_WORKSPACE_FORBIDDEN';end if;
  select * into v_project from public.projects where id=p_project_id;
  select role into v_role from private.effective_project_roster(p_project_id) where user_id=(select auth.uid());
  return jsonb_build_object(
    'me',(select auth.uid()),
    'project',jsonb_build_object('id',v_project.id,'title',v_project.title,'slug',v_project.slug,'summary',v_project.summary,'status',v_project.status,
      'publicationState',v_project.publication_state,'recruiting',v_project.recruiting,'startedAt',v_project.started_at,'nextStep',v_project.next_step,
      'githubUrl',v_project.github_url,'externalUrl',v_project.external_url),
    'myRole',v_role,
    'roster',coalesce((select jsonb_agg(jsonb_build_object('userId',r.user_id,'displayName',mp.display_name,'role',r.role,'joinedAt',r.joined_at) order by r.role,lower(mp.display_name)) from private.effective_project_roster(p_project_id) r join public.member_profiles mp on mp.user_id=r.user_id),'[]'::jsonb),
    'milestones',coalesce((select jsonb_agg(jsonb_build_object('id',m.id,'title',m.title,'description',m.description,'status',m.status,'dueDate',m.due_date,'sortOrder',m.sort_order,
        'assigneeUserId',m.assignee_user_id,'assigneeName',mp.display_name,'completedAt',m.completed_at) order by m.sort_order,m.created_at)
      from public.project_milestones m left join public.member_profiles mp on mp.user_id=m.assignee_user_id where m.project_id=p_project_id),'[]'::jsonb),
    'updates',coalesce((select jsonb_agg(jsonb_build_object('id',u.id,'title',u.title,'summary',u.summary,'body',u.body,'milestone',u.milestone,'updateDate',u.update_date,
        'reviewStatus',r.status,'reviewFeedback',r.review_feedback,'submittedAt',r.submitted_at,'submittedBy',r.submitted_by_user_id,'publicationState',u.publication_state) order by r.submitted_at desc)
      from public.project_update_reviews r join public.project_updates u on u.id=r.project_update_id where r.project_id=p_project_id),'[]'::jsonb),
    'kickoff',(select jsonb_build_object('message',k.message,'meetingAt',k.meeting_at,'meetingLocation',k.meeting_location,'createdAt',k.created_at)
      from public.project_kickoffs k where k.project_id=p_project_id order by k.created_at desc limit 1),
    'posts',coalesce((select jsonb_agg(post order by created_at desc) from (select t.created_at,jsonb_build_object('id',t.id,'kind',t.kind,'body',t.body,'authorUserId',t.author_user_id,
        'authorName',t.author_name,'officer',t.officer,'createdAt',t.created_at) post from public.project_team_posts t where t.project_id=p_project_id order by t.created_at desc limit 50) recent),'[]'::jsonb),
    'links',coalesce((select jsonb_agg(jsonb_build_object('id',l.id,'label',l.label,'url',l.url,'addedBy',l.added_by) order by l.created_at) from public.project_team_links l where l.project_id=p_project_id),'[]'::jsonb));
end $$;

-- Progress summary for the member dashboard and My teams.
create or replace function public.list_my_project_overview()
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare v_user uuid := (select auth.uid());begin
  if not private.is_active_member() then raise exception 'ACTIVE_MEMBER_REQUIRED'; end if;
  return coalesce((select jsonb_agg(entry order by sort_title) from (
    select lower(p.title) sort_title,jsonb_build_object('projectId',p.id,'title',p.title,'role',r.role,'status',p.status,'startedAt',p.started_at,
      'memberCount',(select count(*) from private.effective_project_roster(p.id)),
      'milestonesTotal',(select count(*) from public.project_milestones m where m.project_id=p.id),
      'milestonesDone',(select count(*) from public.project_milestones m where m.project_id=p.id and m.status='DONE'),
      'myOpenMilestones',(select count(*) from public.project_milestones m where m.project_id=p.id and m.assignee_user_id=v_user and m.status<>'DONE'),
      'nextMilestone',(select jsonb_build_object('title',m.title,'dueDate',m.due_date,'status',m.status) from public.project_milestones m
        where m.project_id=p.id and m.status<>'DONE' order by m.due_date nulls last,m.sort_order,m.created_at limit 1),
      'lastPostAt',(select max(t.created_at) from public.project_team_posts t where t.project_id=p.id)
    ) entry from public.projects p cross join lateral private.effective_project_roster(p.id) r where r.user_id=v_user
  ) entries),'[]'::jsonb);
end $$;

-- Joining a team by any route (application, invitation, officer) closes that
-- member's open application to the same project.
create or replace function private.close_applications_on_join() returns trigger
language plpgsql security definer set search_path='' as $$
begin
  if new.status='ACTIVE' then
    update public.project_applications set status='ACCEPTED',reviewed_at=coalesce(reviewed_at,now()),
      decision_note=coalesce(decision_note,'Joined the project team'),updated_at=now()
      where project_id=new.project_id and applicant_user_id=new.user_id and status='PENDING';
  end if;
  return new;
end $$;
revoke all on function private.close_applications_on_join() from public,anon,authenticated;
drop trigger if exists close_applications_on_join on public.project_memberships;
create trigger close_applications_on_join after insert or update of status on public.project_memberships
  for each row execute function private.close_applications_on_join();

create or replace function public.withdraw_project_application(p_application_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
begin
  update public.project_applications set status='WITHDRAWN',updated_at=now()
    where id=p_application_id and applicant_user_id=(select auth.uid()) and status='PENDING';
  if not found then raise exception 'PROJECT_APPLICATION_NOT_WITHDRAWABLE'; end if;
  return jsonb_build_object('applicationId',p_application_id,'status','WITHDRAWN');
end $$;

-- Expired invitations stop blocking a fresh one and are reported as expired.
create or replace function public.create_project_team_invite(p_project_id uuid,p_invited_user_id uuid,p_message text default '')
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_user uuid:=(select auth.uid());v_target public.member_profiles%rowtype;v_project public.projects%rowtype;v_id uuid;begin
  if not private.is_project_lead(p_project_id) then raise exception 'PROJECT_LEAD_REQUIRED';end if;
  if p_invited_user_id=v_user then raise exception 'CANNOT_INVITE_SELF';end if;
  select * into v_target from public.member_profiles where user_id=p_invited_user_id and status='ACTIVE';if not found then raise exception 'MEMBER_NOT_INVITABLE';end if;
  if exists(select 1 from private.effective_project_roster(p_project_id) r where r.user_id=p_invited_user_id) then raise exception 'ALREADY_PROJECT_MEMBER';end if;
  select * into v_project from public.projects where id=p_project_id;if not found then raise exception 'PROJECT_NOT_FOUND';end if;
  update public.project_team_invites set status='EXPIRED',updated_at=now()
    where project_id=p_project_id and invited_user_id=p_invited_user_id and status='PENDING' and expires_at<=now();
  if exists(select 1 from public.project_team_invites where project_id=p_project_id and invited_user_id=p_invited_user_id and status='PENDING') then raise exception 'ALREADY_INVITED';end if;
  insert into public.project_team_invites(project_id,invited_user_id,invited_by_user_id,message,status)
  values(p_project_id,p_invited_user_id,v_user,trim(coalesce(p_message,'')),'PENDING') returning id into v_id;
  insert into public.member_notifications(user_id,kind,title,body,action_url) values(p_invited_user_id,'PROJECT_TEAM_INVITE','Project team invitation','You were invited to join "'||v_project.title||'".','/member/invitations');
  return jsonb_build_object('inviteId',v_id,'projectId',p_project_id,'projectTitle',v_project.title,'status','PENDING','invitedUserId',p_invited_user_id,'invitedEmail',v_target.oberlin_email,'invitedName',v_target.display_name);
end $$;

create or replace function public.list_my_project_team_invites()
returns table(id uuid,project_id uuid,project_title text,invited_user_id uuid,invited_by_user_id uuid,inviter_name text,message text,status public.project_invite_status,expires_at timestamptz,created_at timestamptz)
language plpgsql stable security definer set search_path='' as $$
begin
  if not private.is_active_member() then raise exception 'ACTIVE_MEMBER_REQUIRED';end if;
  return query select i.id,i.project_id,p.title,i.invited_user_id,i.invited_by_user_id,m.display_name,i.message,
      case when i.status='PENDING' and i.expires_at<=now() then 'EXPIRED'::public.project_invite_status else i.status end,i.expires_at,i.created_at
    from public.project_team_invites i join public.projects p on p.id=i.project_id join public.member_profiles m on m.user_id=i.invited_by_user_id
    where i.invited_user_id=(select auth.uid()) order by i.created_at desc;
end $$;

-- Members revise an update after an officer asks for changes, which sends it back for review.
create or replace function public.resubmit_team_project_update(p_update_id uuid,p_title text,p_summary text,p_body text,p_milestone text,p_update_date date)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_user uuid:=(select auth.uid());v_review public.project_update_reviews%rowtype;begin
  select * into v_review from public.project_update_reviews where project_update_id=p_update_id for update;
  if not found then raise exception 'TEAM_UPDATE_REVIEW_NOT_FOUND';end if;
  if not private.is_project_member(v_review.project_id) or not (v_review.submitted_by_user_id=v_user or private.is_project_lead(v_review.project_id)) then raise exception 'TEAM_UPDATE_FORBIDDEN';end if;
  if v_review.status<>'CHANGES_REQUESTED' then raise exception 'TEAM_UPDATE_NOT_EDITABLE';end if;
  if length(trim(coalesce(p_title,'')))<3 then raise exception 'PROJECT_UPDATE_TITLE_REQUIRED';end if;
  if length(trim(coalesce(p_summary,'')))<10 and length(trim(coalesce(p_body,'')))<10 then raise exception 'PROJECT_UPDATE_CONTENT_REQUIRED';end if;
  update public.project_updates set title=trim(p_title),summary=trim(coalesce(p_summary,'')),body=trim(coalesce(p_body,'')),milestone=trim(coalesce(p_milestone,'')),
    update_date=p_update_date,updated_at=now() where id=p_update_id and publication_state='draft';
  if not found then raise exception 'TEAM_UPDATE_NOT_EDITABLE';end if;
  insert into public.content_drafts(entity_type,entity_id,payload,updated_by,updated_at)
  values('project_updates',p_update_id,jsonb_build_object('projectId',v_review.project_id,'title',trim(p_title),'summary',trim(coalesce(p_summary,'')),'body',trim(coalesce(p_body,'')),'milestone',trim(coalesce(p_milestone,'')),'updateDate',p_update_date,'mediaId',null),v_user,now())
  on conflict(entity_type,entity_id) do update set payload=excluded.payload,updated_by=excluded.updated_by,updated_at=now();
  update public.project_update_reviews set status='PENDING_REVIEW',submitted_at=now(),updated_at=now() where project_update_id=p_update_id;
  insert into public.audit_log(actor_id,action,entity_type,entity_id,after_snapshot) values(v_user,'TEAM_PROJECT_UPDATE_RESUBMITTED','project_update',p_update_id::text,jsonb_build_object('project_id',v_review.project_id,'review_status','PENDING_REVIEW'));
  return jsonb_build_object('updateId',p_update_id,'reviewStatus','PENDING_REVIEW');
end $$;

-- Hide a project from the public site without deleting it, or bring it back.
create or replace function public.set_project_archived(p_project_id uuid,p_archived boolean)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_admin uuid := (select auth.uid());v_project public.projects%rowtype;v_state text;begin
  if v_admin is null or not coalesce(private.is_admin_or_super(),false) then raise exception 'PROJECT_TEAM_ADMIN_REQUIRED'; end if;
  select * into v_project from public.projects where id=p_project_id for update;
  if not found then raise exception 'PROJECT_NOT_FOUND'; end if;
  v_state := case when p_archived then 'archived' when v_project.published_at is not null then 'published' else 'draft' end;
  update public.projects set publication_state=v_state,updated_at=now() where id=p_project_id;
  insert into public.audit_log(actor_id,action,entity_type,entity_id,before_snapshot,after_snapshot)
    values(v_admin,case when p_archived then 'PROJECT_ARCHIVED' else 'PROJECT_RESTORED' end,'project',p_project_id::text,
      jsonb_build_object('publicationState',v_project.publication_state),jsonb_build_object('publicationState',v_state));
  return jsonb_build_object('projectId',p_project_id,'publicationState',v_state);
end $$;

revoke all on function public.admin_approve_project_interest(text,uuid,uuid,text) from public,anon;
revoke all on function public.review_project_application(uuid,text,text) from public,anon;
revoke all on function public.admin_set_project_member(uuid,uuid,text) from public,anon;
revoke all on function public.admin_remove_project_member(uuid,uuid) from public,anon;
revoke all on function public.admin_list_project_teams() from public,anon;
revoke all on function public.admin_project_team(uuid) from public,anon;
revoke all on function public.start_project(uuid,text,timestamptz,text) from public,anon;
revoke all on function public.record_project_kickoff_delivery(uuid,integer) from public,anon;
revoke all on function public.delete_project(uuid,text) from public,anon;
revoke all on function public.leave_project(uuid) from public,anon;
revoke all on function public.upsert_project_milestone(uuid,uuid,text,text,text,date,integer,uuid) from public,anon;
revoke all on function public.set_project_milestone_status(uuid,text) from public,anon;
revoke all on function public.claim_project_milestone(uuid,boolean) from public,anon;
revoke all on function public.delete_project_milestone(uuid) from public,anon;
revoke all on function public.post_project_team_update(uuid,text,text) from public,anon;
revoke all on function public.delete_project_team_post(uuid) from public,anon;
revoke all on function public.add_project_team_link(uuid,text,text) from public,anon;
revoke all on function public.remove_project_team_link(uuid) from public,anon;
revoke all on function public.get_project_workspace(uuid) from public,anon;
revoke all on function public.list_my_project_overview() from public,anon;
revoke all on function public.withdraw_project_application(uuid) from public,anon;
revoke all on function public.create_project_team_invite(uuid,uuid,text) from public,anon;
revoke all on function public.list_my_project_team_invites() from public,anon;
revoke all on function public.resubmit_team_project_update(uuid,text,text,text,text,date) from public,anon;
revoke all on function public.set_project_archived(uuid,boolean) from public,anon;
grant execute on function public.admin_approve_project_interest(text,uuid,uuid,text) to authenticated;
grant execute on function public.review_project_application(uuid,text,text) to authenticated;
grant execute on function public.admin_set_project_member(uuid,uuid,text) to authenticated;
grant execute on function public.admin_remove_project_member(uuid,uuid) to authenticated;
grant execute on function public.admin_list_project_teams() to authenticated;
grant execute on function public.admin_project_team(uuid) to authenticated;
grant execute on function public.start_project(uuid,text,timestamptz,text) to authenticated;
grant execute on function public.record_project_kickoff_delivery(uuid,integer) to authenticated;
grant execute on function public.delete_project(uuid,text) to authenticated;
grant execute on function public.leave_project(uuid) to authenticated;
grant execute on function public.upsert_project_milestone(uuid,uuid,text,text,text,date,integer,uuid) to authenticated;
grant execute on function public.set_project_milestone_status(uuid,text) to authenticated;
grant execute on function public.claim_project_milestone(uuid,boolean) to authenticated;
grant execute on function public.delete_project_milestone(uuid) to authenticated;
grant execute on function public.post_project_team_update(uuid,text,text) to authenticated;
grant execute on function public.delete_project_team_post(uuid) to authenticated;
grant execute on function public.add_project_team_link(uuid,text,text) to authenticated;
grant execute on function public.remove_project_team_link(uuid) to authenticated;
grant execute on function public.get_project_workspace(uuid) to authenticated;
grant execute on function public.list_my_project_overview() to authenticated;
grant execute on function public.withdraw_project_application(uuid) to authenticated;
grant execute on function public.create_project_team_invite(uuid,uuid,text) to authenticated;
grant execute on function public.list_my_project_team_invites() to authenticated;
grant execute on function public.resubmit_team_project_update(uuid,text,text,text,text,date) to authenticated;
grant execute on function public.set_project_archived(uuid,boolean) to authenticated;

notify pgrst, 'reload schema';
