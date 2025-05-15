import { config } from 'dotenv';
import path, { dirname } from "path";
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

config({ path: path.resolve(__dirname, '../../', '.env') });

export async function checkVpn(isDev) {
  if (isDev) return true;
  
  if (!process.env.VPNAPIIO_KEY || !process.env.PROXYCHECKIO_KEY) {
    // Report error
    return false;
  }

  const ipRes = await fetch('https://api.ipify.org?format=json');
  const { ip } = await ipRes.json();
  
  const vpnRes = await fetch(`https://vpnapi.io/api/${ip}?key=${process.env.VPNAPIIO_KEY}`);

  if (vpnRes.status !== 200) {
    return await checkVpnWithProxyCheck(ip);
  }

  const data = await vpnRes.json();

  return data?.security?.vpn;
}

import ProxyCheck from 'proxycheck-ts';

const proxyCheck = new ProxyCheck({api_key: process.env.PROXYCHECKIO_KEY});

export async function checkVpnWithProxyCheck(ip) {
  const vpnRes = await proxyCheck.checkIP(ip, {vpn: 1});

  return (vpnRes[ip].proxy === 'yes' && vpnRes[ip].type === 'VPN');
}
