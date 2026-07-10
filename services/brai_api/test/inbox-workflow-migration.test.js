import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { Pool } from 'pg';
import { createTestDatabase } from '../test-support/api.js';

test('workflow v2 migration preserves every persisted v1 execution pin', async () => {
  const database = await createTestDatabase([
    '0001_brai_baseline.sql',
    '0010_agent_role_normalization_workflows.sql'
  ]);
  const pool = new Pool({ connectionString: database.url });
  try {
    await pool.query(`
      INSERT INTO workflow_executions (
        workflow_definition_id, workflow_definition_version, workflow_id, run_id,
        role_contract_id, raw_record_id, status, current_step, attempt_count,
        last_error, started_at_utc, completed_at_utc, created_at_utc, updated_at_utc, user_id
      ) VALUES
        ('inbox.raw-normalization', 1, 'migration:queued', NULL, 'inbox', 'queued-v1', 'queued', 'ingest', 0, NULL, NULL, NULL, '2026-07-10T12:00:00.000Z', '2026-07-10T12:00:00.000Z', NULL),
        ('inbox.raw-normalization', 1, 'migration:running', 'run-v1', 'inbox', 'running-v1', 'running', 'raw_normalizer', 1, NULL, '2026-07-10T12:00:01.000Z', NULL, '2026-07-10T12:00:00.000Z', '2026-07-10T12:00:01.000Z', NULL),
        ('inbox.raw-normalization', 1, 'migration:completed', 'done-v1', 'inbox', 'completed-v1', 'completed', 'apply_normalized_raw', 1, NULL, '2026-07-10T12:00:01.000Z', '2026-07-10T12:00:02.000Z', '2026-07-10T12:00:00.000Z', '2026-07-10T12:00:02.000Z', NULL)
    `);
    const migration = fs.readFileSync(
      path.resolve(import.meta.dirname, '../../../supabase/migrations/0011_inbox_workflow_reliability.sql'),
      'utf8'
    );
    await pool.query(migration);
    await pool.query(migration);

    const executions = (await pool.query(`
      SELECT workflow_id, workflow_definition_version, status, run_id
      FROM workflow_executions
      ORDER BY workflow_id
    `)).rows;
    assert.deepEqual(executions, [
      { workflow_id: 'migration:completed', workflow_definition_version: 1, status: 'completed', run_id: 'done-v1' },
      { workflow_id: 'migration:queued', workflow_definition_version: 1, status: 'queued', run_id: null },
      { workflow_id: 'migration:running', workflow_definition_version: 1, status: 'running', run_id: 'run-v1' }
    ]);
    assert.deepEqual((await pool.query(`
      SELECT version, status
      FROM workflow_definitions
      WHERE id = 'inbox.raw-normalization'
      ORDER BY version
    `)).rows, [
      { version: 1, status: 'retired' },
      { version: 2, status: 'active' }
    ]);
    assert.deepEqual((await pool.query(`
      SELECT workflow_definition_version, output_schema_version
      FROM role_contracts
      WHERE id = 'inbox'
    `)).rows[0], {
      workflow_definition_version: 2,
      output_schema_version: 'brai.inbox.normalized.v2'
    });
  } finally {
    await pool.end();
    await database.drop();
  }
});
