-- READ ONLY: operator may run after separate approval in the preview SQL Editor.
-- Does not create roles, schemas, users or records. No passwords/tokens selected.
SELECT current_user, current_setting('server_version') AS server_version,
  to_regclass('auth.users') IS NOT NULL AS auth_users_exists,
  to_regnamespace('tracker_sync') IS NOT NULL AS tracker_schema_exists;
SELECT rolname, rolcanlogin, rolsuper, rolcreaterole, rolcreatedb, rolreplication, rolbypassrls
FROM pg_roles WHERE rolname IN (current_user,'postgres','tracker_sync_owner','tracker_gateway');
SELECT parent.rolname AS granted_role, child.rolname AS member_role
FROM pg_auth_members m JOIN pg_roles parent ON parent.oid=m.roleid
JOIN pg_roles child ON child.oid=m.member
WHERE parent.rolname IN ('tracker_sync_owner','tracker_gateway')
   OR child.rolname IN ('tracker_sync_owner','tracker_gateway');
SELECT c.relname,c.relrowsecurity,c.relforcerowsecurity,pg_get_userbyid(c.relowner) AS owner
FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE n.nspname='tracker_sync' AND c.relkind='r';
SELECT tablename,policyname,roles,qual,with_check
FROM pg_policies WHERE schemaname='tracker_sync';
SELECT p.proname,pg_get_userbyid(p.proowner) AS owner,p.prosecdef,p.proconfig,p.proacl
FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='tracker_sync';
