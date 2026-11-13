import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { EventEmitter } from 'node:events';
import type { AndroidRemote, Certificate } from '@kud/androidtv-remote';
import { RemoteProtocolService, type RemoteFactory } from '../src/services/remote.ts';
import { TvError } from '../src/services/adb.ts';
import { selectController, type TVController } from '../src/services/controller.ts';

const cert: Certificate = { key: 'private-key', cert: 'certificate' };
class FakeClient extends EventEmitter {
  sent: number[] = [];
  texts: string[] = [];
  stopped = false;
  async start(): Promise<boolean> { queueMicrotask(() => this.emit('secret')); return true; }
  sendCode(code: string): boolean { if (code !== 'ABCDEF') return false; queueMicrotask(() => this.emit('ready')); return true; }
  sendKey(code: number): void { this.sent.push(code); }
  sendText(text: string): void { this.texts.push(text); }
  getCertificate(): Certificate { return cert; }
  stop(): void { this.stopped = true; }
}

test('Remote Protocol pairs, saves certificate, sends commands, disconnects and reconnects', async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'tv-remote-test-'));
  const clients: FakeClient[] = [];
  const options: Array<{ cert?: Certificate }> = [];
  const factory: RemoteFactory = (_host, input) => { options.push(input); const client = new FakeClient(); clients.push(client); return client as unknown as AndroidRemote; };
  try {
    const remote = new RemoteProtocolService(factory, directory);
    assert.equal((await remote.connect('192.168.1.5')).state, 'pairing');
    await assert.rejects(remote.pin('000000'), error => error instanceof TvError && error.code === 'INVALID_PIN');
    assert.equal((await remote.connect('192.168.1.5')).state, 'pairing');
    assert.equal((await remote.pin('ABCDEF')).state, 'connected');
    remote.command('HOME'); remote.text('Olá');
    assert.equal(clients.at(-1)?.sent.length, 1);
    assert.deepEqual(clients.at(-1)?.texts, ['Olá']);
    assert.equal(remote.disconnect().connected, false);
    assert.equal(clients.at(-1)?.stopped, true);
    const another = new RemoteProtocolService(factory, directory);
    await another.load();
    assert.equal(another.status().paired, true);
    assert.deepEqual(options.at(-1), {});
    // The fake emits secret regardless of saved credentials; verify they are passed to the library.
    await another.connect('192.168.1.5');
    assert.deepEqual(options.at(-1), { cert });
    await another.forget();
    assert.equal(another.status().paired, false);
  } finally { await fs.rm(directory, { recursive: true, force: true }); }
});

test('Remote Protocol rejects commands while disconnected and rejects unreachable TV', async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'tv-remote-test-'));
  try {
    const remote = new RemoteProtocolService(() => ({ start: async () => false, stop() {}, on() { return this; } }) as unknown as AndroidRemote, directory);
    assert.throws(() => remote.command('HOME'), error => error instanceof TvError && error.code === 'TV_DISCONNECTED');
    await assert.rejects(remote.connect('192.168.1.6'), error => error instanceof TvError && error.code === 'REMOTE_UNAVAILABLE');
    assert.equal(remote.status().state, 'error');
  } finally { await fs.rm(directory, { recursive: true, force: true }); }
});

test('method selection keeps ADB and Remote Protocol controllers separate', () => {
  const adb = {} as TVController;
  const remote = {} as TVController;
  const controllers = { adb, remote };
  assert.equal(selectController('adb', controllers), adb);
  assert.equal(selectController('remote', controllers), remote);
  assert.notEqual(selectController('adb', controllers), selectController('remote', controllers));
  assert.throws(() => selectController('shell', controllers), error => error instanceof TvError && error.code === 'INVALID_METHOD');
});
