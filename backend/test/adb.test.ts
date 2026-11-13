import assert from 'node:assert/strict';
import test from 'node:test';
import { AdbService, TvError } from '../src/services/adb.ts';
import { commandSchema, commands, connectSchema, pairSchema, textSchema } from '../src/services/validation.ts';

const target = { host: '192.168.1.2', port: 5555 };
test('Android command mapping is explicit and complete', () => {
  assert.equal(commands.HOME, 3);
  assert.equal(commands.POWER, 26);
  assert.equal(commands.OK, 23);
  assert.equal(Object.keys(commands).length, 15);
  assert.equal(commandSchema.safeParse({ command: 'shell' }).success, false);
});
test('API parameter schemas reject invalid values and extra fields', () => {
  assert.equal(connectSchema.safeParse({ host: '192.168.1.2;reboot' }).success, false);
  assert.equal(connectSchema.safeParse({ port: 70000 }).success, false);
  assert.equal(pairSchema.safeParse({ port: 1234, code: '123' }).success, false);
  assert.equal(textSchema.safeParse({ text: '', extra: 1 }).success, false);
});
test('status checks devices without reconnecting', async () => {
  const calls: string[][] = [];
  const adb = new AdbService(async args => { calls.push(args); return 'List of devices attached\n192.168.1.2:5555\tdevice\n'; });
  assert.equal((await adb.status(target)).connected, true);
  assert.deepEqual(calls, [['devices']]);
});
test('disconnected TV rejects commands', async () => {
  const adb = new AdbService(async () => 'List of devices attached\n');
  await assert.rejects(adb.command(target, 'HOME'), error => error instanceof TvError && error.code === 'TV_DISCONNECTED');
});
test('ADB failures and timeouts propagate', async () => {
  const adb = new AdbService(async () => { throw new TvError(504, 'ADB_TIMEOUT', 'timed out'); });
  await assert.rejects(adb.status(target), error => error instanceof TvError && error.status === 504);
  const failing = new AdbService(async () => 'unable to connect');
  await assert.rejects(failing.connect(target), error => error instanceof TvError && error.code === 'CONNECT_FAILED');
});
test('Power uses WAKEUP in standby and toggles when awake', async () => {
  const calls: string[][] = [];
  let asleep = true;
  const adb = new AdbService(async args => {
    calls.push(args);
    if (args[0] === 'devices') return '192.168.1.2:5555\tdevice';
    if (args.includes('dumpsys')) return asleep ? 'mWakefulness=Asleep\nDisplay Power: state=OFF' : 'mWakefulness=Awake\nDisplay Power: state=ON';
    return '';
  });
  await adb.command(target, 'POWER');
  assert.deepEqual(calls.at(-1)?.slice(-2), ['keyevent', '224']);
  asleep = false;
  await adb.command(target, 'POWER');
  assert.deepEqual(calls.at(-1)?.slice(-2), ['keyevent', '26']);
});
test('Power wakes offline TV with Wake-on-LAN, reconnect and WAKEUP', async () => {
  const calls: string[][] = [];
  const wake: string[] = [];
  let connected = false;
  const adb = new AdbService(async args => {
    calls.push(args);
    if (args[0] === 'devices') return connected ? '192.168.1.2:5555\tdevice' : '192.168.1.2:5555\toffline';
    if (args[0] === 'connect') { connected = true; return 'connected to 192.168.1.2:5555'; }
    return '';
  }, async (mac, host) => { wake.push(`${mac}@${host}`); });
  await adb.command({ ...target, mac: '08:c3:b3:24:ef:93' }, 'POWER');
  assert.deepEqual(wake, ['08:c3:b3:24:ef:93@192.168.1.2']);
  assert.deepEqual(calls.at(-1)?.slice(-2), ['keyevent', '224']);
});
