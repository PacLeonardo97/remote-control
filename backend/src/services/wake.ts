import dgram from 'node:dgram';
import os from 'node:os';
import net from 'node:net';

function broadcastAddresses(host: string): string[] {
  const addresses = new Set<string>(['255.255.255.255']);
  if (net.isIP(host) !== 4) return [...addresses];
  const target = host.split('.').map(Number);
  for (const values of Object.values(os.networkInterfaces())) {
    for (const item of values || []) {
      if (item.family !== 'IPv4' || item.internal) continue;
      const local = item.address.split('.').map(Number);
      const mask = item.netmask.split('.').map(Number);
      if (target.every((part, i) => (part & mask[i]) === (local[i] & mask[i])))
        addresses.add(local.map((part, i) => (part | (~mask[i] & 255))).join('.'));
    }
  }
  return [...addresses];
}
export async function sendWakeOnLan(mac: string, host: string): Promise<void> {
  const bytes = Buffer.from(mac.replace(/:/g, ''), 'hex');
  if (bytes.length !== 6) throw new Error('Invalid MAC address');
  const packet = Buffer.concat([Buffer.alloc(6, 0xff), ...Array(16).fill(bytes)]);
  const socket = dgram.createSocket('udp4');
  try {
    await new Promise<void>((resolve, reject) => { socket.once('error', reject); socket.bind(() => resolve()); });
    socket.setBroadcast(true);
    await Promise.all(broadcastAddresses(host).map(address => new Promise<void>((resolve, reject) => {
      socket.send(packet, 9, address, error => error ? reject(error) : resolve());
    })));
  } finally { socket.close(); }
}
