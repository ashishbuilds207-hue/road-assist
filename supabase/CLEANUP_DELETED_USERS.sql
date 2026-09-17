-- Hard-delete cleanup for admin-removed users.
-- Run in Supabase → SQL Editor if old soft-deleted rows still appear.

-- 1) Remove soft-deleted / deactivated registration rows
delete from public.registration_requests
where status in ('DEACTIVATED', 'DELETED', 'deleted');

-- 2) Optional: wipe a specific user by id (replace the id)
-- delete from public.registration_requests where id = 'reg-XXXX';

-- 3) Optional: wipe a user by phone
-- delete from public.registration_requests where phone = '+1XXXXXXXXXX';

-- Note: live app data also lives in public.rsa_store JSON blobs
-- (keys: registrations, service-requests, live-chat-*).
-- Admin Delete in the app now hard-removes from rsa_store + this table.
