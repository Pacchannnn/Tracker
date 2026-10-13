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
-- Hosted capability evidence, not permission to mutate managed roles or settings.
SELECT has_database_privilege(current_user,current_database(),'CREATE') AS can_create_schema,
  has_schema_privilege(current_user,to_regnamespace('auth'),'USAGE') AS can_use_auth,
  has_table_privilege(current_user,to_regclass('auth.users'),'REFERENCES') AS can_reference_auth_users,
  has_function_privilege(current_user,to_regprocedure('auth.uid()'),'EXECUTE') AS can_read_request_uid,
  has_schema_privilege(current_user,to_regnamespace('storage'),'USAGE') AS can_use_storage,
  has_table_privilege(current_user,to_regclass('storage.buckets'),'SELECT') AS can_inspect_buckets;
SELECT pg_get_userbyid(proowner) AS auth_uid_owner,proacl
FROM pg_proc WHERE oid=to_regprocedure('auth.uid()');
SELECT nspname,pg_get_userbyid(nspowner) AS owner FROM pg_namespace WHERE nspname IN ('auth','storage');
SELECT relname,pg_get_userbyid(relowner) AS owner,relrowsecurity,relforcerowsecurity
FROM pg_class WHERE oid IN (to_regclass('storage.objects'),to_regclass('storage.buckets'));
SELECT current_setting('supautils.policy_grants',true) AS provider_policy_grants,
  current_setting('supautils.privileged_role',true) AS provider_privileged_role,
  current_setting('shared_preload_libraries',true) AS shared_preload_libraries;
-- A config value alone does not prove policy DDL succeeds in this execution context.
SELECT policyname,permissive,roles,cmd,qual,with_check
FROM pg_policies WHERE schemaname='storage' AND tablename='objects';
