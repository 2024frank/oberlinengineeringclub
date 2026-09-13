-- Supabase's scheduler can retry within the provider's 24-hour deduplication
-- window. The existing Vercel daily publishing cron remains unchanged.
create extension if not exists pg_cron;
create extension if not exists pg_net;

create function private.wake_officer_email_worker() returns bigint
language plpgsql security definer set search_path='' as $$
declare v_secret text;v_request bigint;v_timestamp text;v_signature text;begin
  if not exists(select 1 from public.officer_email_outbox where
    (status in ('PENDING','FAILED') and attempts<5 and next_attempt_at<=now())
    or (status='SENDING' and claimed_at<now()-interval '5 minutes')) then return null;end if;
  select decrypted_secret into v_secret from vault.decrypted_secrets where name='oec_officer_email_worker';
  if v_secret is null or length(v_secret)<32 then raise exception 'OFFICER_WORKER_SECRET_MISSING';end if;
  -- Managed pg_net queues have broad SQL grants. Never store a reusable secret
  -- there; sign this single-purpose request with a two-minute validity window.
  v_timestamp:=floor(extract(epoch from clock_timestamp()))::bigint::text;
  v_signature:=encode(extensions.hmac('officer-email-worker:'||v_timestamp,v_secret,'sha256'),'hex');
  select net.http_post(
    url:='https://oberlin32engineeringsociety.com/api/cron/officer-emails',
    headers:=jsonb_build_object('Content-Type','application/json','x-oec-timestamp',v_timestamp,'x-oec-signature',v_signature),
    body:='{}'::jsonb,timeout_milliseconds:=55000
  ) into v_request;
  return v_request;
end $$;
revoke all on function private.wake_officer_email_worker() from public,anon,authenticated,service_role;
select cron.schedule('oec-officer-email-worker','*/5 * * * *','select private.wake_officer_email_worker()');
