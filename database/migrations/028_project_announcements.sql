-- Tell every active member when a project first appears on the website.
--
-- * Officers still review proposals first; an approved proposal becomes a draft
--   project, and the announcement goes out when an officer publishes it.
-- * Each project is announced once. Republishing edits never re-notifies, and
--   projects already on the website when this runs are treated as announced.
-- * The function adds the in-app notice and returns the email recipients; the
--   server sends the emails and records how many were accepted.

create table if not exists public.project_announcements (
  project_id uuid primary key references public.projects(id) on delete cascade,
  announced_at timestamptz not null default now(),
  recipients integer not null default 0,
  emails_sent integer
);
alter table public.project_announcements enable row level security;

insert into public.project_announcements(project_id)
select id from public.projects where publication_state='published'
on conflict do nothing;

create or replace function public.announce_published_project(p_project_id uuid)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  v_project record;
  v_recipients jsonb;
begin
  select id,slug,title,coalesce(summary,'') as summary into v_project
  from public.projects where id=p_project_id and publication_state='published';
  if not found then return jsonb_build_object('announced',false); end if;

  insert into public.project_announcements(project_id) values(p_project_id) on conflict do nothing;
  if not found then return jsonb_build_object('announced',false); end if;

  insert into public.member_notifications(user_id,kind,title,body,action_url)
  select user_id,'NEW_PROJECT','New project: '||v_project.title,
    coalesce(nullif(trim(v_project.summary),''),'A new project is now on the website.'),
    '/projects/'||v_project.slug
  from public.member_profiles where status='ACTIVE';

  select coalesce(jsonb_agg(jsonb_build_object('email',oberlin_email,'displayName',display_name)),'[]'::jsonb)
  into v_recipients from public.member_profiles where status='ACTIVE';

  update public.project_announcements set recipients=jsonb_array_length(v_recipients) where project_id=p_project_id;

  return jsonb_build_object('announced',true,'projectId',v_project.id,'slug',v_project.slug,
    'title',v_project.title,'summary',v_project.summary,'recipients',v_recipients);
end $$;

revoke all on function public.announce_published_project(uuid) from public,anon,authenticated;
grant execute on function public.announce_published_project(uuid) to service_role;
