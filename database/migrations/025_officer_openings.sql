alter table public.leaders add column application_closes_at timestamptz;

create table public.officer_applications (
  position_id uuid not null references public.leaders(id),
  user_id uuid not null references public.member_profiles(user_id),
  statement text not null check(length(trim(statement)) between 20 and 3000),
  experience text not null default '' check(length(experience)<=2000),
  status text not null default 'PENDING' check(status in ('PENDING','SHORTLISTED','NOT_SELECTED','WITHDRAWN')),
  feedback text not null default '' check(length(feedback)<=2000),
  submitted_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id),
  primary key(position_id,user_id)
);
create index officer_applications_user on public.officer_applications(user_id);
create table public.officer_announcements (
  position_id uuid primary key references public.leaders(id),
  role_title text not null,
  term text not null,
  bio text not null,
  closes_at timestamptz,
  created_at timestamptz not null default now(),
  baseline boolean not null default false
);
create table public.officer_email_outbox (
  id uuid primary key default gen_random_uuid(),
  position_id uuid not null references public.officer_announcements(position_id),
  user_id uuid not null references public.member_profiles(user_id),
  recipient text not null,
  display_name text not null,
  status text not null default 'PENDING' check(status in ('PENDING','SENDING','SENT','FAILED','UNKNOWN','SKIPPED')),
  attempts integer not null default 0,
  claim_token uuid,
  claimed_at timestamptz,
  first_attempt_at timestamptz,
  delivery_uncertain boolean not null default false,
  next_attempt_at timestamptz not null default now(),
  last_error text,
  sent_at timestamptz,
  unique(position_id,user_id)
);
create index officer_email_delivery on public.officer_email_outbox(status,next_attempt_at);
alter table public.officer_applications enable row level security;
alter table public.officer_announcements enable row level security;
alter table public.officer_email_outbox enable row level security;
revoke all on public.officer_applications,public.officer_announcements,public.officer_email_outbox from public,anon,authenticated;

-- Existing vacancies remain visible, but installing this migration sends nothing.
insert into public.officer_announcements(position_id,role_title,term,bio,closes_at,baseline)
select id,role_title,term,bio,application_closes_at,true from public.leaders
where publication_state='published' and current and open_seat and not advisor;

create function private.queue_officer_opening() returns trigger language plpgsql security definer set search_path='' as $$
begin
  if new.publication_state='published' and new.current and new.open_seat and not new.advisor
    and (new.application_closes_at is null or new.application_closes_at>now()) then
    if not (coalesce(private.can_publish() and private.has_scope('leaders'),false) or coalesce(auth.role(),'')='service_role') then
      raise exception 'PUBLISH_PERMISSION_REQUIRED';
    end if;
    insert into public.officer_announcements(position_id,role_title,term,bio,closes_at)
    values(new.id,new.role_title,new.term,new.bio,new.application_closes_at) on conflict do nothing;
    if found then
      insert into public.officer_email_outbox(position_id,user_id,recipient,display_name)
      select new.id,user_id,lower(trim(oberlin_email)),display_name from public.member_profiles where status='ACTIVE';
    end if;
  end if;
  return new;
end $$;
create trigger officer_opening_published after insert or update on public.leaders for each row execute function private.queue_officer_opening();

create function public.list_officer_positions() returns jsonb language sql stable security definer set search_path='' as $$
  select coalesce(jsonb_agg(jsonb_build_object('id',id,'roleTitle',role_title,'term',term,'bio',bio,'closesAt',application_closes_at) order by sort_order,role_title),'[]'::jsonb)
  from public.leaders where publication_state='published' and current and open_seat and not advisor
  and (application_closes_at is null or application_closes_at>now());
$$;

create function public.list_officer_applications() returns jsonb language plpgsql stable security definer set search_path='' as $$
declare v_admin boolean:=coalesce(private.is_admin_or_super(),false);begin
  if not (private.is_active_member() or v_admin) then raise exception 'ACTIVE_MEMBER_REQUIRED';end if;
  return coalesce((select jsonb_agg(jsonb_build_object('positionId',a.position_id,'roleTitle',l.role_title,'term',l.term,
    'userId',a.user_id,'displayName',m.display_name,'statement',a.statement,'experience',a.experience,'status',a.status,
    'feedback',a.feedback,'submittedAt',a.submitted_at,'reviewedAt',a.reviewed_at) order by a.submitted_at desc)
    from public.officer_applications a join public.leaders l on l.id=a.position_id join public.member_profiles m on m.user_id=a.user_id
    where v_admin or a.user_id=(select auth.uid())),'[]'::jsonb);
end $$;

create function public.officer_application_action(p_action text,p_position_id uuid,p_statement text default '',p_experience text default '',p_decision text default null,p_feedback text default '',p_user_id uuid default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_user uuid:=(select auth.uid());v_position public.leaders%rowtype;v_application public.officer_applications%rowtype;v_status text;begin
  if p_action='review' then
    if not coalesce(private.is_admin_or_super(),false) then raise exception 'ADMIN_REQUIRED';end if;
  elsif not private.is_active_member() then raise exception 'ACTIVE_MEMBER_REQUIRED';end if;
  select * into v_position from public.leaders where id=p_position_id for update;
  if not found then raise exception 'POSITION_NOT_FOUND';end if;
  select * into v_application from public.officer_applications where position_id=p_position_id and user_id=case when p_action='review' then p_user_id else v_user end for update;
  if p_action='apply' then
    if not(v_position.publication_state='published' and v_position.current and v_position.open_seat and not v_position.advisor)
      or (v_position.application_closes_at is not null and v_position.application_closes_at<=now()) then raise exception 'POSITION_CLOSED';end if;
    if v_application.reviewed_at is not null then raise exception 'APPLICATION_REVIEWED';end if;
    if p_statement is null or length(trim(p_statement)) not between 20 and 3000 or length(coalesce(p_experience,''))>2000 then raise exception 'APPLICATION_INVALID';end if;
    insert into public.officer_applications(position_id,user_id,statement,experience) values(p_position_id,v_user,trim(p_statement),trim(coalesce(p_experience,'')))
    on conflict(position_id,user_id) do update set statement=excluded.statement,experience=excluded.experience,status='PENDING',feedback='',reviewed_at=null,reviewed_by=null,submitted_at=now();
    v_status:='PENDING';
  elsif p_action='withdraw' then
    if v_application.status is null or v_application.status not in ('PENDING','SHORTLISTED','WITHDRAWN') then raise exception 'APPLICATION_NOT_WITHDRAWABLE';end if;
    update public.officer_applications set status='WITHDRAWN' where position_id=p_position_id and user_id=v_user;
    v_status:='WITHDRAWN';
  elsif p_action='review' then
    if p_decision is null or p_decision not in ('SHORTLISTED','NOT_SELECTED') or length(coalesce(p_feedback,''))>2000 then raise exception 'REVIEW_INVALID';end if;
    if v_application.status is null or v_application.status='WITHDRAWN' then raise exception 'APPLICATION_NOT_REVIEWABLE';end if;
    update public.officer_applications set status=p_decision,feedback=trim(coalesce(p_feedback,'')),reviewed_at=now(),reviewed_by=v_user where position_id=p_position_id and user_id=p_user_id;
    v_status:=p_decision;
  else raise exception 'ACTION_INVALID';end if;
  insert into public.audit_log(actor_id,action,entity_type,entity_id,after_snapshot)
  values(v_user,'OFFICER_APPLICATION_'||upper(p_action),'officer_applications',p_position_id::text,jsonb_build_object('status',v_status,'applicantId',case when p_action='review' then p_user_id else v_user end));
  return jsonb_build_object('status',v_status);
end $$;

-- Claim one recipient at a time. No member/admin-session role can call this RPC.
create function public.claim_officer_email() returns table(id uuid,"claimToken" uuid,recipient text,"displayName" text,"positionId" uuid,"roleTitle" text,term text,bio text,"closesAt" timestamptz)
language plpgsql security definer set search_path='' as $$
declare v_id uuid;v_token uuid:=gen_random_uuid();begin
  update public.officer_email_outbox o set status='UNKNOWN',last_error='Delivery needs reconciliation with the email provider.'
  where (o.status='SENDING' or (o.status='FAILED' and o.delivery_uncertain)) and o.first_attempt_at<now()-interval '23 hours';
  update public.officer_email_outbox o set status='SKIPPED',claim_token=null
  where o.status in ('PENDING','FAILED') and not exists(select 1 from public.leaders l join public.member_profiles m on m.user_id=o.user_id
    where l.id=o.position_id and l.publication_state='published' and l.current and l.open_seat and not l.advisor
    and (l.application_closes_at is null or l.application_closes_at>now()) and m.status='ACTIVE');
  select o.id into v_id from public.officer_email_outbox o
    join public.leaders l on l.id=o.position_id join public.member_profiles m on m.user_id=o.user_id
    where ((o.status in ('PENDING','FAILED') and o.next_attempt_at<=now() and o.attempts<5)
      or (o.status='SENDING' and o.claimed_at<now()-interval '5 minutes' and o.first_attempt_at>=now()-interval '23 hours'))
    and l.publication_state='published' and l.current and l.open_seat and not l.advisor
    and (l.application_closes_at is null or l.application_closes_at>now()) and m.status='ACTIVE'
    order by o.next_attempt_at,o.id for update of o skip locked limit 1;
  if v_id is null then return;end if;
  update public.officer_email_outbox o set status='SENDING',claim_token=v_token,claimed_at=now(),attempts=o.attempts+1,
    delivery_uncertain=o.delivery_uncertain or o.status='SENDING',
    first_attempt_at=case when o.status in ('PENDING','FAILED') and not o.delivery_uncertain then now() else o.first_attempt_at end where o.id=v_id;
  return query select o.id,o.claim_token,o.recipient,o.display_name,o.position_id,a.role_title,a.term,a.bio,a.closes_at
    from public.officer_email_outbox o join public.officer_announcements a on a.position_id=o.position_id where o.id=v_id;
end $$;
create function public.finish_officer_email(p_id uuid,p_claim_token uuid,p_status text,p_error text default null)
returns boolean language plpgsql security definer set search_path='' as $$
begin
  if p_status not in ('SENT','FAILED','UNCERTAIN') then raise exception 'INVALID_DELIVERY_STATE';end if;
  update public.officer_email_outbox set status=case when p_status='UNCERTAIN' then 'SENDING' else p_status end,
    delivery_uncertain=delivery_uncertain or p_status='UNCERTAIN',
    last_error=left(p_error,300),sent_at=case when p_status='SENT' then now() else null end,
    next_attempt_at=now()+interval '15 minutes'
    where id=p_id and claim_token=p_claim_token and status='SENDING';
  return found;
end $$;
create function public.officer_email_status() returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
  if not coalesce(private.is_admin_or_super(),false) then raise exception 'ADMIN_REQUIRED';end if;
  return coalesce((select jsonb_agg(jsonb_build_object('positionId',a.position_id,'roleTitle',a.role_title,'baseline',a.baseline,
    'pending',(select count(*) from public.officer_email_outbox o where o.position_id=a.position_id and status='PENDING'),
    'sending',(select count(*) from public.officer_email_outbox o where o.position_id=a.position_id and status='SENDING'),
    'sent',(select count(*) from public.officer_email_outbox o where o.position_id=a.position_id and status='SENT'),
    'failed',(select count(*) from public.officer_email_outbox o where o.position_id=a.position_id and status='FAILED'),
    'unknown',(select count(*) from public.officer_email_outbox o where o.position_id=a.position_id and status='UNKNOWN'),
    'skipped',(select count(*) from public.officer_email_outbox o where o.position_id=a.position_id and status='SKIPPED')) order by a.created_at desc)
    from public.officer_announcements a),'[]'::jsonb);
end $$;

create function public.retry_officer_emails(p_position_id uuid) returns void language plpgsql security definer set search_path='' as $$
begin
  if not coalesce(private.is_admin_or_super(),false) then raise exception 'ADMIN_REQUIRED';end if;
  update public.officer_email_outbox set attempts=0,next_attempt_at=now() where position_id=p_position_id and status='FAILED';
  insert into public.audit_log(actor_id,action,entity_type,entity_id) values((select auth.uid()),'RETRY_OFFICER_EMAIL','leaders',p_position_id::text);
end $$;
revoke all on function public.retry_officer_emails(uuid) from public,anon;
grant execute on function public.retry_officer_emails(uuid) to authenticated;
revoke all on function private.queue_officer_opening() from public,anon,authenticated;
revoke all on function public.list_officer_positions(),public.list_officer_applications(),public.officer_application_action(text,uuid,text,text,text,text,uuid),public.officer_email_status(),public.claim_officer_email(),public.finish_officer_email(uuid,uuid,text,text) from public,anon,authenticated;
grant execute on function public.list_officer_positions() to anon,authenticated;
grant execute on function public.list_officer_applications(),public.officer_application_action(text,uuid,text,text,text,text,uuid),public.officer_email_status() to authenticated;
grant execute on function public.claim_officer_email(),public.finish_officer_email(uuid,uuid,text,text) to service_role;

-- Preserve every publishing branch; add only the optional officer deadline.
create or replace function public.publish_content_snapshot(p_entity_type text,p_entity_id uuid,p_payload_snapshot jsonb,p_restored_from uuid default null)
returns uuid language plpgsql security definer set search_path='' as $$
declare v_version integer;v_id uuid;v_exists boolean; begin
  if p_entity_type not in ('projects','project_updates','events','opportunities','resources','news_posts','leaders','sponsors','documents','partner_schools') then raise exception 'unsupported entity type'; end if;
  if not ((private.can_publish() and private.has_scope(p_entity_type)) or coalesce(auth.role(),'')='service_role') then raise exception 'publish permission required'; end if;
  execute format('select exists(select 1 from public.%I where id=$1 for update)',p_entity_type) into v_exists using p_entity_id;
  if not v_exists then raise exception 'entity not found'; end if;
  select coalesce(max(version_number),0)+1 into v_version from public.content_versions where entity_type=p_entity_type and entity_id=p_entity_id;
  insert into public.content_versions(entity_type,entity_id,version_number,snapshot,published_by,restored_from) values(p_entity_type,p_entity_id,v_version,p_payload_snapshot,(select auth.uid()),p_restored_from) returning id into v_id;

  if p_entity_type='projects' then
    update public.projects set slug=p_payload_snapshot->>'slug',title=p_payload_snapshot->>'title',summary=coalesce(p_payload_snapshot->>'summary',''),problem=coalesce(p_payload_snapshot->>'problem',''),goal=coalesce(p_payload_snapshot->>'goal',''),discipline=coalesce(p_payload_snapshot->>'discipline',''),disciplines=coalesce(array(select jsonb_array_elements_text(p_payload_snapshot->'disciplines')),'{}'),status=p_payload_snapshot->>'status',recruiting=coalesce((p_payload_snapshot->>'recruiting')::boolean,false),skills=coalesce(array(select jsonb_array_elements_text(p_payload_snapshot->'skills')),'{}'),difficulty=coalesce(p_payload_snapshot->>'difficulty',''),lead_name=coalesce(p_payload_snapshot->>'leadName',''),next_step=coalesce(p_payload_snapshot->>'nextStep',''),team_names=coalesce(array(select jsonb_array_elements_text(p_payload_snapshot->'teamNames')),'{}'),timeline=coalesce(p_payload_snapshot->'timeline','[]'::jsonb),cover_media_id=nullif(p_payload_snapshot->>'coverMediaId','')::uuid,external_url=coalesce(p_payload_snapshot->>'externalUrl',''),github_url=coalesce(p_payload_snapshot->>'githubUrl',''),sort_order=coalesce((p_payload_snapshot->>'sortOrder')::integer,100),publication_state='published',published_at=now() where id=p_entity_id;
  elsif p_entity_type='project_updates' then
    update public.project_updates set project_id=(p_payload_snapshot->>'projectId')::uuid,title=p_payload_snapshot->>'title',summary=coalesce(p_payload_snapshot->>'summary',''),body=coalesce(p_payload_snapshot->>'body',''),milestone=coalesce(p_payload_snapshot->>'milestone',''),update_date=nullif(p_payload_snapshot->>'updateDate','')::date,media_id=nullif(p_payload_snapshot->>'mediaId','')::uuid,publication_state='published',published_at=now() where id=p_entity_id;
  elsif p_entity_type='events' then
    update public.events set slug=p_payload_snapshot->>'slug',title=p_payload_snapshot->>'title',summary=coalesce(p_payload_snapshot->>'summary',''),description=coalesce(p_payload_snapshot->>'description',''),event_type=coalesce(p_payload_snapshot->>'eventType','Event'),start_at=nullif(p_payload_snapshot->>'startAt','')::timestamptz,end_at=nullif(p_payload_snapshot->>'endAt','')::timestamptz,organizer_name=coalesce(p_payload_snapshot->>'organizerName',''),location=coalesce(p_payload_snapshot->>'location',''),access_details=coalesce(p_payload_snapshot->>'accessDetails',''),registration_url=coalesce(p_payload_snapshot->>'registrationUrl',''),cover_media_id=nullif(p_payload_snapshot->>'coverMediaId','')::uuid,featured=coalesce((p_payload_snapshot->>'featured')::boolean,false),publication_state='published',published_at=now() where id=p_entity_id;
  elsif p_entity_type='opportunities' then
    update public.opportunities set title=p_payload_snapshot->>'title',organization=coalesce(p_payload_snapshot->>'organization',''),opportunity_type=coalesce(p_payload_snapshot->>'opportunityType','Opportunity'),description=coalesce(p_payload_snapshot->>'description',''),deadline=nullif(p_payload_snapshot->>'deadline','')::date,location=coalesce(p_payload_snapshot->>'location',''),url=p_payload_snapshot->>'url',featured=coalesce((p_payload_snapshot->>'featured')::boolean,false),publication_state='published',published_at=now() where id=p_entity_id;
  elsif p_entity_type='resources' then
    update public.resources set title=p_payload_snapshot->>'title',description=coalesce(p_payload_snapshot->>'description',''),category=coalesce(p_payload_snapshot->>'category',''),source_name=coalesce(p_payload_snapshot->>'sourceName',''),url=coalesce(p_payload_snapshot->>'url',''),source_kind=coalesce(p_payload_snapshot->>'sourceKind','club'),official_source=coalesce((p_payload_snapshot->>'officialSource')::boolean,false),source_url=coalesce(p_payload_snapshot->>'sourceUrl',''),pinned=coalesce((p_payload_snapshot->>'pinned')::boolean,false),sort_order=coalesce((p_payload_snapshot->>'sortOrder')::integer,100),publication_state='published',published_at=now() where id=p_entity_id;
  elsif p_entity_type='news_posts' then
    update public.news_posts set slug=p_payload_snapshot->>'slug',title=p_payload_snapshot->>'title',excerpt=coalesce(p_payload_snapshot->>'excerpt',''),body=p_payload_snapshot->>'body',author=coalesce(p_payload_snapshot->>'author','Oberlin Engineering Club'),cover_media_id=nullif(p_payload_snapshot->>'coverMediaId','')::uuid,featured=coalesce((p_payload_snapshot->>'featured')::boolean,false),publication_state='published',published_at=now() where id=p_entity_id;
  elsif p_entity_type='leaders' then
    update public.leaders set application_closes_at=nullif(p_payload_snapshot->>'applicationClosesAt','')::timestamptz,name=p_payload_snapshot->>'name',role_title=p_payload_snapshot->>'roleTitle',term=coalesce(p_payload_snapshot->>'term',''),class_year=coalesce(p_payload_snapshot->>'classYear',''),major=coalesce(p_payload_snapshot->>'major',''),bio=coalesce(p_payload_snapshot->>'bio',''),photo_media_id=nullif(p_payload_snapshot->>'photoMediaId','')::uuid,linkedin_url=coalesce(p_payload_snapshot->>'linkedinUrl',''),email=coalesce(p_payload_snapshot->>'email',''),current=coalesce((p_payload_snapshot->>'current')::boolean,true),advisor=coalesce((p_payload_snapshot->>'advisor')::boolean,false),open_seat=coalesce((p_payload_snapshot->>'openSeat')::boolean,false),sort_order=coalesce((p_payload_snapshot->>'sortOrder')::integer,100),publication_state='published',published_at=now() where id=p_entity_id;
  elsif p_entity_type='sponsors' then
    update public.sponsors set name=p_payload_snapshot->>'name',relationship_type=coalesce(p_payload_snapshot->>'relationshipType','collaborator'),logo_media_id=nullif(p_payload_snapshot->>'logoMediaId','')::uuid,url=coalesce(p_payload_snapshot->>'url',''),description=coalesce(p_payload_snapshot->>'description',''),sort_order=coalesce((p_payload_snapshot->>'sortOrder')::integer,100),publication_state='published',published_at=now() where id=p_entity_id;
  elsif p_entity_type='documents' then
    update public.documents set title=p_payload_snapshot->>'title',category=coalesce(p_payload_snapshot->>'category',''),description=coalesce(p_payload_snapshot->>'description',''),url=p_payload_snapshot->>'url',format=coalesce(p_payload_snapshot->>'format',''),sort_order=coalesce((p_payload_snapshot->>'sortOrder')::integer,100),publication_state='published',published_at=now() where id=p_entity_id;
  elsif p_entity_type='partner_schools' then
    update public.partner_schools set name=p_payload_snapshot->>'name',short_name=coalesce(p_payload_snapshot->>'shortName',''),location=coalesce(p_payload_snapshot->>'location',''),official_url=p_payload_snapshot->>'officialUrl',questions=coalesce(p_payload_snapshot->'questions','[]'::jsonb),sort_order=coalesce((p_payload_snapshot->>'sortOrder')::integer,100),publication_state='published',published_at=now() where id=p_entity_id;
  end if;
  insert into public.audit_log(actor_id,action,entity_type,entity_id,after_snapshot) values((select auth.uid()),case when p_restored_from is null then 'PUBLISH' else 'RESTORE' end,p_entity_type,p_entity_id::text,p_payload_snapshot);
  return v_id;
end $$;
revoke all on function public.publish_content_snapshot(text,uuid,jsonb,uuid) from public;
grant execute on function public.publish_content_snapshot(text,uuid,jsonb,uuid) to authenticated,service_role;
notify pgrst,'reload schema';
