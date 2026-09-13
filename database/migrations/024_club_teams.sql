-- Teams can exist before projects. All writes use session-authorized RPCs.
create table public.club_teams (
  id uuid primary key default gen_random_uuid(),
  name text not null check(length(trim(name)) between 3 and 80),
  description text not null default '' check(length(description)<=1200),
  recruiting boolean not null default true,
  created_by uuid not null references public.member_profiles(user_id),
  created_at timestamptz not null default now()
);
create table public.club_team_memberships (
  team_id uuid not null references public.club_teams(id) on delete cascade,
  user_id uuid not null references public.member_profiles(user_id),
  role public.project_membership_role not null default 'MEMBER',
  joined_at timestamptz not null default now(),
  primary key(team_id,user_id)
);
create unique index club_team_one_lead on public.club_team_memberships(team_id) where role='LEAD';
create index club_team_member_user on public.club_team_memberships(user_id);
create table public.club_team_requests (
  team_id uuid not null references public.club_teams(id) on delete cascade,
  user_id uuid not null references public.member_profiles(user_id),
  sender_id uuid not null references public.member_profiles(user_id),
  direction text not null check(direction in ('INVITE','JOIN')),
  status text not null default 'PENDING' check(status in ('PENDING','ACCEPTED','DECLINED','EXPIRED','REVOKED')),
  message text not null default '' check(length(message)<=1200),
  expires_at timestamptz not null default now()+interval '14 days',
  created_at timestamptz not null default now(),
  primary key(team_id,user_id)
);
create index club_team_request_user on public.club_team_requests(user_id,status);
create table public.club_team_projects (
  team_id uuid not null references public.club_teams(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  status text not null default 'PENDING' check(status in ('PENDING','APPROVED','REJECTED')),
  requested_by uuid not null references public.member_profiles(user_id),
  reviewed_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  primary key(team_id,project_id)
);
create index club_team_project_access on public.club_team_projects(project_id,status);
alter table public.club_teams enable row level security;
alter table public.club_team_memberships enable row level security;
alter table public.club_team_requests enable row level security;
alter table public.club_team_projects enable row level security;
revoke all on public.club_teams,public.club_team_memberships,public.club_team_requests,public.club_team_projects from public,anon,authenticated;

create function private.is_club_team_member(p_team_id uuid) returns boolean
language sql stable security definer set search_path='' as $$
  select private.is_active_member() and exists(select 1 from public.club_team_memberships where team_id=p_team_id and user_id=(select auth.uid()));
$$;
create function private.is_club_team_lead(p_team_id uuid) returns boolean
language sql stable security definer set search_path='' as $$
  select private.is_active_member() and exists(select 1 from public.club_team_memberships where team_id=p_team_id and user_id=(select auth.uid()) and role='LEAD');
$$;

create function public.club_team_action(p_action text,p_team_id uuid default null,p_payload jsonb default '{}')
returns jsonb language plpgsql security definer set search_path='' as $$
declare
  v_user uuid:=(select auth.uid());
  v_admin boolean:=coalesce(private.is_admin_or_super(),false);
  v_team public.club_teams%rowtype;
  v_request public.club_team_requests%rowtype;
  v_target uuid;
  v_project uuid;
  v_status text;
  v_lead boolean;
begin
  if v_user is null or not (private.is_active_member() or v_admin) then raise exception 'ACTIVE_MEMBER_REQUIRED'; end if;
  if p_action='create' then
    if not private.is_active_member() then raise exception 'ACTIVE_MEMBER_REQUIRED'; end if;
    perform pg_advisory_xact_lock(hashtextextended(v_user::text,24));
    if (select count(*) from public.club_teams where created_by=v_user)>=10 then raise exception 'TEAM_LIMIT_REACHED'; end if;
    insert into public.club_teams(name,description,recruiting,created_by)
      values(trim(p_payload->>'name'),trim(coalesce(p_payload->>'description','')),coalesce((p_payload->>'recruiting')::boolean,true),v_user) returning * into v_team;
    insert into public.club_team_memberships(team_id,user_id,role) values(v_team.id,v_user,'LEAD');
    return jsonb_build_object('teamId',v_team.id);
  end if;
  -- Serialize lifecycle changes, including membership and project access decisions.
  select * into v_team from public.club_teams where id=p_team_id for update;
  if not found then raise exception 'TEAM_NOT_FOUND'; end if;
  v_lead:=private.is_club_team_lead(p_team_id) or v_admin;
  v_target:=nullif(p_payload->>'userId','')::uuid;
  v_project:=nullif(p_payload->>'projectId','')::uuid;

  if p_action in ('invite','update','remove','transfer','request-project','review-member','revoke') and not v_lead then raise exception 'TEAM_LEAD_REQUIRED'; end if;
  if p_action='update' then
    update public.club_teams set name=trim(p_payload->>'name'),description=trim(coalesce(p_payload->>'description','')),recruiting=coalesce((p_payload->>'recruiting')::boolean,true) where id=p_team_id;
  elsif p_action in ('invite','join') then
    if not private.is_active_member() then raise exception 'ACTIVE_MEMBER_REQUIRED'; end if;
    if p_action='join' then
      v_target:=v_user;
      if not v_team.recruiting then raise exception 'TEAM_NOT_RECRUITING'; end if;
    else
      if not exists(select 1 from public.member_profiles mp join public.member_privacy_settings ps on ps.user_id=mp.user_id where mp.user_id=v_target and mp.status='ACTIVE' and ps.directory_visible and 'display_name'=any(ps.visible_fields)) then raise exception 'MEMBER_NOT_INVITABLE'; end if;
    end if;
    if exists(select 1 from public.club_team_memberships where team_id=p_team_id and user_id=v_target) then raise exception 'ALREADY_TEAM_MEMBER'; end if;
    select * into v_request from public.club_team_requests where team_id=p_team_id and user_id=v_target;
    if found and v_request.status='PENDING' and v_request.expires_at>now() then return jsonb_build_object('teamId',p_team_id,'status','PENDING'); end if;
    insert into public.club_team_requests(team_id,user_id,sender_id,direction,message)
      values(p_team_id,v_target,v_user,case p_action when 'invite' then 'INVITE' else 'JOIN' end,trim(coalesce(p_payload->>'message','')))
      on conflict(team_id,user_id) do update set sender_id=excluded.sender_id,direction=excluded.direction,message=excluded.message,status='PENDING',expires_at=now()+interval '14 days',created_at=now();
    insert into public.member_notifications(user_id,kind,title,body,action_url)
      select case when p_action='invite' then v_target else tm.user_id end,'CLUB_TEAM_REQUEST',
        case when p_action='invite' then 'Team invitation' else 'Team join request' end,
        case when p_action='invite' then 'You were invited to '||v_team.name||'.' else 'A member asked to join '||v_team.name||'.' end,
        case when p_action='invite' then '/member/invitations' else '/member/teams/group/'||p_team_id::text end
      from public.club_team_memberships tm where tm.team_id=p_team_id and tm.role='LEAD';
    v_status:='PENDING';
  elsif p_action in ('respond','review-member','revoke') then
    if p_action='respond' then v_target:=v_user; end if;
    select * into v_request from public.club_team_requests where team_id=p_team_id and user_id=v_target;
    if not found or (p_action='respond' and v_request.direction<>'INVITE') or (p_action='review-member' and v_request.direction<>'JOIN') then raise exception 'TEAM_INVITATION_NOT_FOUND'; end if;
    if p_action='revoke' then
      if v_request.status<>'PENDING' then raise exception 'TEAM_REQUEST_ALREADY_REVIEWED'; end if;
      v_status:='REVOKED';
    else
      if coalesce(p_payload->>'decision','') not in ('ACCEPT','DECLINE') then raise exception 'TEAM_DECISION_INVALID'; end if;
      if v_request.status<>'PENDING' then return jsonb_build_object('teamId',p_team_id,'status',v_request.status); end if;
      if v_request.expires_at<=now() then
        update public.club_team_requests set status='EXPIRED' where team_id=p_team_id and user_id=v_target;
        return jsonb_build_object('teamId',p_team_id,'status','EXPIRED');
      end if;
      if not exists(select 1 from public.member_profiles where user_id=v_target and status='ACTIVE') then raise exception 'ACTIVE_MEMBER_REQUIRED'; end if;
      v_status:=case when p_payload->>'decision'='ACCEPT' then 'ACCEPTED' else 'DECLINED' end;
      if v_status='ACCEPTED' then
        insert into public.club_team_memberships(team_id,user_id) values(p_team_id,v_target) on conflict do nothing;
      end if;
    end if;
    update public.club_team_requests set status=v_status where team_id=p_team_id and user_id=v_target;
    insert into public.member_notifications(user_id,kind,title,body,action_url)
      values(case when p_action='respond' then v_request.sender_id else v_target end,'CLUB_TEAM_RESPONSE','Team request updated',v_team.name||': '||lower(v_status)||'.','/member/teams/group/'||p_team_id::text);
  elsif p_action in ('remove','leave') then
    if p_action='leave' then v_target:=v_user; end if;
    if exists(select 1 from public.club_team_memberships where team_id=p_team_id and user_id=v_target and role='LEAD') then raise exception 'TRANSFER_TEAM_LEAD_FIRST'; end if;
    delete from public.club_team_memberships where team_id=p_team_id and user_id=v_target;
    if not found then raise exception 'TEAM_MEMBER_NOT_FOUND'; end if;
    update public.club_team_requests set status='REVOKED' where team_id=p_team_id and user_id=v_target;
  elsif p_action='transfer' then
    if not exists(select 1 from public.club_team_memberships tm join public.member_profiles mp on mp.user_id=tm.user_id where tm.team_id=p_team_id and tm.user_id=v_target and mp.status='ACTIVE') then raise exception 'TEAM_MEMBER_NOT_FOUND'; end if;
    update public.club_team_memberships set role='MEMBER' where team_id=p_team_id and role='LEAD';
    update public.club_team_memberships set role='LEAD' where team_id=p_team_id and user_id=v_target;
  elsif p_action='request-project' then
    if not exists(select 1 from public.projects where id=v_project and publication_state='published' and recruiting) then raise exception 'PROJECT_NOT_ACCEPTING_TEAMS'; end if;
    if not private.is_active_member() then raise exception 'ACTIVE_MEMBER_REQUIRED'; end if;
    insert into public.club_team_projects(team_id,project_id,requested_by) values(p_team_id,v_project,v_user)
      on conflict(team_id,project_id) do update set status='PENDING',requested_by=excluded.requested_by,reviewed_by=null,created_at=now() where club_team_projects.status='REJECTED';
    if found then
      insert into public.member_notifications(user_id,kind,title,body,action_url)
        select user_id,'CLUB_TEAM_PROJECT_REQUEST','A team wants to join your project',v_team.name||' requested access.','/member/teams/'||v_project::text
        from public.project_memberships where project_id=v_project and role='LEAD' and status='ACTIVE';
    end if;
  elsif p_action='review-project' then
    if not (v_admin or private.is_project_lead(v_project)) then raise exception 'PROJECT_REVIEW_FORBIDDEN'; end if;
    if coalesce(p_payload->>'decision','') not in ('APPROVE','REJECT') then raise exception 'TEAM_DECISION_INVALID'; end if;
    v_status:=case when p_payload->>'decision'='APPROVE' then 'APPROVED' else 'REJECTED' end;
    update public.club_team_projects set status=v_status,reviewed_by=v_user where team_id=p_team_id and project_id=v_project and status='PENDING';
    if not found then raise exception 'TEAM_PROJECT_NOT_PENDING'; end if;
    insert into public.member_notifications(user_id,kind,title,body,action_url)
      select user_id,'CLUB_TEAM_PROJECT_REVIEW','Team project request reviewed',v_team.name||': '||lower(v_status)||'.','/member/teams/group/'||p_team_id::text
      from public.club_team_memberships where team_id=p_team_id;
    insert into public.audit_log(actor_id,action,entity_type,entity_id,after_snapshot)
      values(v_user,'TEAM_PROJECT_REVIEWED','club_team',p_team_id::text,jsonb_build_object('projectId',v_project,'status',v_status));
  else raise exception 'TEAM_ACTION_INVALID';
  end if;
  return jsonb_build_object('teamId',p_team_id,'status',v_status);
end $$;

-- Effective project membership includes approved team connections without copying
-- grants. Explicit project removals remain authoritative, and direct roles win.
create function private.effective_project_roster(p_project_id uuid)
returns table(user_id uuid,role public.project_membership_role,joined_at timestamptz)
language sql stable security definer set search_path='' as $$
  select distinct on (members.user_id) members.user_id,members.role,members.joined_at from (
    select pm.user_id,pm.role,pm.joined_at,0 priority from public.project_memberships pm where pm.project_id=p_project_id and pm.status='ACTIVE'
    union all
    select tm.user_id,'MEMBER'::public.project_membership_role,tm.joined_at,1 from public.club_team_memberships tm
      join public.club_team_projects tp on tp.team_id=tm.team_id and tp.project_id=p_project_id and tp.status='APPROVED'
      where not exists(select 1 from public.project_memberships pm where pm.project_id=p_project_id and pm.user_id=tm.user_id and pm.status in ('LEFT','REMOVED'))
  ) members join public.member_profiles mp on mp.user_id=members.user_id and mp.status='ACTIVE'
  order by members.user_id,members.priority;
$$;
create or replace function private.is_project_member(p_project_id uuid)
returns boolean language sql stable security definer set search_path='' as $$
  select private.is_active_member() and exists(select 1 from private.effective_project_roster(p_project_id) where user_id=(select auth.uid()));
$$;
create or replace function public.list_my_project_workspaces()
returns table(project_id uuid,title text,slug text,project_status text,publication_state text,membership_role public.project_membership_role,recruiting boolean)
language plpgsql stable security definer set search_path='' as $$
begin
  if not private.is_active_member() then raise exception 'ACTIVE_MEMBER_REQUIRED'; end if;
  return query select p.id,p.title,p.slug,p.status,p.publication_state,r.role,p.recruiting from public.projects p
    cross join lateral private.effective_project_roster(p.id) r where r.user_id=(select auth.uid()) order by lower(p.title);
end $$;
create or replace function public.get_project_workspace(p_project_id uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare v_project public.projects%rowtype;v_role public.project_membership_role;begin
  if not private.is_project_member(p_project_id) then raise exception 'PROJECT_WORKSPACE_FORBIDDEN';end if;
  select * into v_project from public.projects where id=p_project_id;
  select role into v_role from private.effective_project_roster(p_project_id) where user_id=(select auth.uid());
  return jsonb_build_object(
    'project',jsonb_build_object('id',v_project.id,'title',v_project.title,'slug',v_project.slug,'summary',v_project.summary,'status',v_project.status,'publicationState',v_project.publication_state,'recruiting',v_project.recruiting),
    'myRole',v_role,
    'roster',coalesce((select jsonb_agg(jsonb_build_object('userId',r.user_id,'displayName',mp.display_name,'role',r.role,'joinedAt',r.joined_at) order by r.role,lower(mp.display_name)) from private.effective_project_roster(p_project_id) r join public.member_profiles mp on mp.user_id=r.user_id),'[]'::jsonb),
    'milestones',coalesce((select jsonb_agg(jsonb_build_object('id',m.id,'title',m.title,'description',m.description,'status',m.status,'dueDate',m.due_date,'sortOrder',m.sort_order) order by m.sort_order,m.created_at) from public.project_milestones m where m.project_id=p_project_id),'[]'::jsonb),
    'updates',coalesce((select jsonb_agg(jsonb_build_object('id',u.id,'title',u.title,'summary',u.summary,'reviewStatus',r.status,'reviewFeedback',r.review_feedback,'submittedAt',r.submitted_at,'publicationState',u.publication_state) order by r.submitted_at desc) from public.project_update_reviews r join public.project_updates u on u.id=r.project_update_id where r.project_id=p_project_id),'[]'::jsonb));
end $$;
create or replace function public.remove_project_member(p_project_id uuid,p_target_user_id uuid)
returns void language plpgsql security definer set search_path='' as $$
declare v_role public.project_membership_role;begin
  if not private.is_project_lead(p_project_id) then raise exception 'PROJECT_LEAD_REQUIRED';end if;
  -- Revocation must also work while the target account is suspended.
  select role into v_role from public.project_memberships where project_id=p_project_id and user_id=p_target_user_id and status='ACTIVE';
  if not found then
    if not exists(select 1 from public.club_team_memberships tm join public.club_team_projects tp on tp.team_id=tm.team_id where tm.user_id=p_target_user_id and tp.project_id=p_project_id and tp.status='APPROVED')
      or exists(select 1 from public.project_memberships where project_id=p_project_id and user_id=p_target_user_id and status in ('LEFT','REMOVED')) then raise exception 'PROJECT_MEMBER_NOT_FOUND';end if;
    v_role:='MEMBER';
  end if;
  if v_role='LEAD' then raise exception 'CANNOT_REMOVE_PROJECT_LEAD';end if;
  insert into public.project_memberships(project_id,user_id,status) values(p_project_id,p_target_user_id,'REMOVED')
    on conflict(project_id,user_id) do update set status='REMOVED',updated_at=now() where project_memberships.role<>'LEAD';
  insert into public.member_notifications(user_id,kind,title,body,action_url) values(p_target_user_id,'PROJECT_MEMBERSHIP_REMOVED','Project access updated','You were removed from a project. Other team memberships are unchanged.','/member/teams');
end $$;

alter table public.project_proposals add column team_id uuid references public.club_teams(id);
create function private.guard_team_proposal() returns trigger language plpgsql security definer set search_path='' as $$
begin
  if new.team_id is not null and not private.is_club_team_lead(new.team_id) then raise exception 'TEAM_LEAD_REQUIRED'; end if;
  return new;
end $$;
create trigger guard_team_proposal before insert or update of team_id on public.project_proposals for each row execute function private.guard_team_proposal();
create function private.connect_approved_team_proposal() returns trigger language plpgsql security definer set search_path='' as $$
begin
  if new.team_id is not null and new.status='APPROVED' and new.approved_project_id is not null then
    insert into public.club_team_projects(team_id,project_id,status,requested_by,reviewed_by)
      values(new.team_id,new.approved_project_id,'APPROVED',new.proposer_user_id,new.reviewed_by) on conflict do nothing;
  end if;
  return new;
end $$;
create trigger connect_approved_team_proposal after update of status,approved_project_id on public.project_proposals for each row execute function private.connect_approved_team_proposal();

create function public.list_club_teams(p_team_id uuid default null) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare v_admin boolean:=coalesce(private.is_admin_or_super(),false);begin
  if not (private.is_active_member() or v_admin) then raise exception 'ACTIVE_MEMBER_REQUIRED';end if;
  return coalesce((select jsonb_agg(entry order by name) from (
    select t.name,jsonb_build_object('id',t.id,'name',t.name,'description',t.description,'recruiting',t.recruiting,
      'myRole',(select role from public.club_team_memberships where team_id=t.id and user_id=(select auth.uid())),
      'myRequest',(select jsonb_build_object('direction',direction,'status',case when status='PENDING' and expires_at<=now() then 'EXPIRED' else status end) from public.club_team_requests where team_id=t.id and user_id=(select auth.uid())),
      'roster',coalesce((select jsonb_agg(jsonb_build_object(
        'userId',case when v_admin or private.is_club_team_member(t.id) or (ps.directory_visible and 'display_name'=any(ps.visible_fields)) then mp.user_id end,
        'displayName',case when v_admin or private.is_club_team_member(t.id) or (ps.directory_visible and 'display_name'=any(ps.visible_fields)) then mp.display_name else 'OEC member' end,
        'role',tm.role) order by tm.role,mp.display_name)
        from public.club_team_memberships tm join public.member_profiles mp on mp.user_id=tm.user_id and mp.status='ACTIVE'
        left join public.member_privacy_settings ps on ps.user_id=mp.user_id where tm.team_id=t.id),'[]'::jsonb),
      'projects',coalesce((select jsonb_agg(jsonb_build_object('id',p.id,'title',p.title,'status',tp.status,'published',p.publication_state='published','canReview',v_admin or private.is_project_lead(p.id),'canAccess',private.is_project_member(p.id)))
        from public.club_team_projects tp join public.projects p on p.id=tp.project_id where tp.team_id=t.id and
        ((p.publication_state='published' and tp.status='APPROVED') or v_admin or private.is_club_team_member(t.id) or private.is_project_lead(p.id))),'[]'::jsonb),
      'proposals',case when v_admin or private.is_club_team_member(t.id) then coalesce((select jsonb_agg(jsonb_build_object('id',id,'title',title,'status',status,'feedback',admin_feedback)) from public.project_proposals where team_id=t.id),'[]'::jsonb) else '[]'::jsonb end,
      'requests',case when v_admin or private.is_club_team_lead(t.id) then coalesce((select jsonb_agg(jsonb_build_object('userId',r.user_id,'displayName',mp.display_name,'direction',r.direction,'message',r.message,'status',case when r.expires_at<=now() then 'EXPIRED' else r.status end))
        from public.club_team_requests r join public.member_profiles mp on mp.user_id=r.user_id where r.team_id=t.id and r.status='PENDING'),'[]'::jsonb) else '[]'::jsonb end
    ) entry from public.club_teams t where p_team_id is null or t.id=p_team_id
  ) entries),'[]'::jsonb);
end $$;

create function public.list_my_club_team_invitations() returns jsonb
language plpgsql stable security definer set search_path='' as $$
begin
  if not private.is_active_member() then raise exception 'ACTIVE_MEMBER_REQUIRED';end if;
  return coalesce((select jsonb_agg(jsonb_build_object('teamId',t.id,'teamName',t.name,'message',r.message,'status',case when r.status='PENDING' and r.expires_at<=now() then 'EXPIRED' else r.status end,'expiresAt',r.expires_at) order by r.created_at desc)
    from public.club_team_requests r join public.club_teams t on t.id=r.team_id where r.user_id=(select auth.uid()) and r.direction='INVITE'),'[]'::jsonb);
end $$;

create function public.community_project_rosters() returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare v_admin boolean:=coalesce(private.is_admin_or_super(),false);begin
  if not (private.is_active_member() or v_admin) then raise exception 'ACTIVE_MEMBER_REQUIRED';end if;
  return coalesce((select jsonb_agg(jsonb_build_object('projectId',p.id,'title',p.title,'members',coalesce((select jsonb_agg(jsonb_build_object(
      'userId',case when v_admin or private.is_project_member(p.id) or (ps.directory_visible and 'display_name'=any(ps.visible_fields)) then mp.user_id end,
      'displayName',case when v_admin or private.is_project_member(p.id) or (ps.directory_visible and 'display_name'=any(ps.visible_fields)) then mp.display_name else 'OEC member' end,'role',r.role))
    from private.effective_project_roster(p.id) r join public.member_profiles mp on mp.user_id=r.user_id left join public.member_privacy_settings ps on ps.user_id=mp.user_id),'[]'::jsonb)) order by p.title)
    from public.projects p where p.publication_state='published' or v_admin or private.is_project_member(p.id)),'[]'::jsonb);
end $$;

revoke all on function private.is_club_team_member(uuid),private.is_club_team_lead(uuid),private.effective_project_roster(uuid),private.guard_team_proposal(),private.connect_approved_team_proposal() from public,anon,authenticated;
revoke all on function public.club_team_action(text,uuid,jsonb),public.list_club_teams(uuid),public.list_my_club_team_invitations(),public.community_project_rosters() from public,anon;
grant execute on function public.club_team_action(text,uuid,jsonb),public.list_club_teams(uuid),public.list_my_club_team_invitations(),public.community_project_rosters() to authenticated;
notify pgrst,'reload schema';
