-- One-time cleanup, 22 September 2026. Run once in the Supabase SQL editor
-- AFTER migration 027 and BEFORE anyone uses the new "Make lead" button.
--
-- 1. Everyone who became a project lead through the old "Approve as project lead"
--    button (they only asked to join) becomes a regular team member. People who
--    proposed a project stay its lead. Officers can re-appoint real leads from
--    Project teams afterwards.
-- 2. The "DO Probe Amplifier & MayFly Data Logger" project is deleted.
--
-- Nothing else changes: projects that have members keep them. The whole script
-- is one transaction, so an error leaves the database untouched.

begin;

-- Preview: every active lead and how they got the role.
select p.title as project, mp.display_name as member, mp.oberlin_email as email,
  case
    when exists(select 1 from public.project_proposals pp where pp.approved_project_id=pm.project_id and pp.proposer_user_id=pm.user_id) then 'proposed the project (stays lead)'
    when exists(select 1 from public.audit_log a where a.action='PROJECT_LEAD_APPROVED' and a.created_at<'2026-09-23'
      and a.after_snapshot->>'projectId'=pm.project_id::text and a.after_snapshot->>'userId'=pm.user_id::text) then 'asked to join (becomes member)'
    else 'other (unchanged)'
  end as outcome
from public.project_memberships pm
join public.projects p on p.id=pm.project_id
join public.member_profiles mp on mp.user_id=pm.user_id
where pm.role='LEAD' and pm.status='ACTIVE'
order by p.title, mp.display_name;

with demoted as (
  update public.project_memberships pm set role='MEMBER', updated_at=now()
  where pm.role='LEAD' and pm.status='ACTIVE'
    and exists(select 1 from public.audit_log a where a.action='PROJECT_LEAD_APPROVED' and a.created_at<'2026-09-23'
      and a.after_snapshot->>'projectId'=pm.project_id::text and a.after_snapshot->>'userId'=pm.user_id::text)
    and not exists(select 1 from public.project_proposals pp where pp.approved_project_id=pm.project_id and pp.proposer_user_id=pm.user_id)
  returning pm.project_id, pm.user_id
)
insert into public.audit_log(actor_id,action,entity_type,entity_id,before_snapshot,after_snapshot)
select null,'PROJECT_MEMBER_ROLE_SET','project',project_id::text,jsonb_build_object('userId',user_id,'role','LEAD'),
  jsonb_build_object('userId',user_id,'role','MEMBER','reason','2026-09-22 cleanup: joined through the old lead-only approval')
from demoted;

-- Delete the DO Probe project and everything attached to it.
insert into public.audit_log(actor_id,action,entity_type,entity_id,before_snapshot,after_snapshot)
select null,'PROJECT_DELETED','project',p.id::text,to_jsonb(p),jsonb_build_object('reason','2026-09-22 cleanup requested by club officers')
from public.projects p where p.slug='do-probe-amplifier-mayfly-data-logger';
insert into public.member_notifications(user_id,kind,title,body,action_url)
select pm.user_id,'PROJECT_DELETED','A project was closed','"'||p.title||'" was removed by the club officers. Your other teams are unchanged.','/member/teams'
from public.projects p join public.project_memberships pm on pm.project_id=p.id and pm.status='ACTIVE'
where p.slug='do-probe-amplifier-mayfly-data-logger';
delete from public.saved_items where item_type='PROJECT' and item_id in (select id from public.projects where slug='do-probe-amplifier-mayfly-data-logger');
delete from public.content_drafts where entity_type='projects' and entity_id in (select id from public.projects where slug='do-probe-amplifier-mayfly-data-logger');
delete from public.content_drafts where entity_type='project_updates' and entity_id in (select u.id from public.project_updates u join public.projects p on p.id=u.project_id where p.slug='do-probe-amplifier-mayfly-data-logger');
delete from public.projects where slug='do-probe-amplifier-mayfly-data-logger';

-- Result: remaining leads per project.
select p.title as project, count(*) filter (where pm.role='LEAD') as leads, count(pm.user_id) as members
from public.projects p left join public.project_memberships pm on pm.project_id=p.id and pm.status='ACTIVE'
group by p.title order by p.title;

commit;
