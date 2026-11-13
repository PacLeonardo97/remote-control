import { Bonjour } from 'bonjour-service';

export type DiscoveredTv = { name: string; host: string };
export async function discoverTvs(durationMs = 3000): Promise<DiscoveredTv[]> {
  const bonjour = new Bonjour();
  const devices = new Map<string, DiscoveredTv>();
  const browser = bonjour.find({ type: 'androidtvremote2', protocol: 'tcp' }, service => {
    const host = service.addresses?.find(address => /^\d{1,3}(?:\.\d{1,3}){3}$/.test(address));
    if (host) devices.set(host, { name: service.name, host });
  });
  await new Promise(resolve => setTimeout(resolve, durationMs));
  browser.stop(); bonjour.destroy();
  return [...devices.values()];
}
