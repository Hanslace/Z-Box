import { execSync } from "child_process";
import fs from "fs";
import path from "path";

function subnetToBase(subnet: string): { base: string; mask: number } {
  // subnet like "10.10.0.0/16"
  const [ip, maskStr] = subnet.split("/");
  const parts = ip.split(".");
  // default to 10.10.0.x
  if (parts.length !== 4) {
    return { base: "10.10.0.", mask: 24 };
  }
  // use first three octets as base
  return { base: `${parts[0]}.${parts[1]}.${parts[2]}.`, mask: Number(maskStr || "24") };
}

export class WireGuardService {
  private iface: string;
  private clientDir: string;
  private endpoint: string;
  private dns: string;
  private subnet: string;

  constructor() {
    this.iface = process.env.WG_INTERFACE || "wg0";
    this.clientDir = process.env.WG_CLIENT_DIR || "/etc/wireguard/clients";
    this.endpoint = process.env.WG_SERVER_ENDPOINT || "10.10.0.1:51820";
    this.dns = process.env.WG_DNS || "1.1.1.1";
    this.subnet = process.env.WG_SUBNET || "10.10.0.0/16"; // <-- make it configurable

    if (!fs.existsSync(this.clientDir)) {
      fs.mkdirSync(this.clientDir, { recursive: true });
    }
  }

  generateKeyPair() {
    const priv = execSync("wg genkey").toString().trim();
    const pub = execSync(`echo ${priv} | wg pubkey`).toString().trim();
    return { privateKey: priv, publicKey: pub };
  }

  allocateIp(): string {
    const { base } = subnetToBase(this.subnet);
    // try 2..254
    for (let i = 2; i < 255; i++) {
      const candidateIp = `${base}${i}`;
      const confPath = path.join(this.clientDir, `client-${candidateIp.replace(/\./g, "_")}.conf`);
      if (!fs.existsSync(confPath)) {
        return candidateIp;
      }
    }
    throw new Error("No free IPs");
  }

  createClientConfig(clientIp: string, clientPrivKey: string, serverPubKey: string): string {
    return `[Interface]
PrivateKey = ${clientPrivKey}
Address = ${clientIp}/32
DNS = ${this.dns}

[Peer]
PublicKey = ${serverPubKey}
Endpoint = ${this.endpoint}
AllowedIPs = ${this.subnet}
PersistentKeepalive = 25
`;
  }

  saveClientConfig(ip: string, content: string): string {
    const safe = ip.replace(/\./g, "_");
    const confPath = path.join(this.clientDir, `client-${safe}.conf`);
    fs.writeFileSync(confPath, content, { mode: 0o600 });
    return confPath;
  }

  getServerPublicKey(): string {
    return execSync(`wg show ${this.iface} public-key`).toString().trim();
  }

  addPeerToServer(clientPubKey: string, clientIp: string) {
    execSync(`wg set ${this.iface} peer ${clientPubKey} allowed-ips ${clientIp}/32`);
  }
}
