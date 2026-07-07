import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

test('API refuses obsolete Inbox storage env name', () => {
  const result = spawnSync(process.execPath, ['src/index.js'], {
    cwd: new URL('..', import.meta.url),
    env: {
      ...process.env,
      BRAI_INBOUND_STORAGE_ROOT: '/tmp/old-inbound-name'
    },
    encoding: 'utf8'
  });

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /BRAI_INBOUND_STORAGE_ROOT is obsolete/);
});
