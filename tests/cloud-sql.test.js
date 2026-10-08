import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

const migration = new URL('../cloud/migrations/001_foundation.sql', import.meta.url);
const integration = new URL('../cloud/tests/rls.integration.sql', import.meta.url);
test('private cloud migration and executable PostgreSQL negative tests are version controlled', () => {
  assert.ok(existsSync(migration), 'missing reviewed cloud migration');
  assert.ok(existsSync(integration), 'missing PostgreSQL integration tests');
});
test('supplementary SQL audit: privileged functions use empty search path and no sequence cursor', () => {
  assert.ok(existsSync(migration), 'missing reviewed cloud migration');
  const sql = readFileSync(migration, 'utf8');
  const privileged = sql.match(/SECURITY DEFINER/g) || [];
  assert.ok(privileged.length >= 7);
  assert.equal(privileged.length, (sql.match(/SECURITY DEFINER SET search_path = ''/g) || []).length);
  assert.doesNotMatch(sql, /\bnextval\s*\(/i);
  assert.match(sql, /FOR UPDATE/);
  assert.match(sql, /FORCE ROW LEVEL SECURITY/);
  assert.match(sql, /NOLOGIN NOBYPASSRLS/);
  assert.match(sql, /REVOKE ALL ON ALL FUNCTIONS IN SCHEMA tracker_sync FROM PUBLIC/);
});
