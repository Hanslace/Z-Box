import { NftService } from "./NftService";

type PostureReport = {
  wg_ip?: string;
  hostname?: string;
  username?: string;
  os?: string;
  kernel?: string;
  firewall_enabled?: boolean;
  processes?: string[];
  reported_at?: string;
};

type PostureResult = {
  compliant: boolean;
  reasons: string[];
};

export class PostureService {
  private reports: { report: PostureReport; result: PostureResult }[] = [];
  private nft: NftService;

  constructor() {
    this.nft = new NftService();
  }

  async evaluate(report: PostureReport): Promise<PostureResult> {
    const reasons: string[] = [];

    if (report.firewall_enabled === false) {
      reasons.push("Firewall not enabled");
    }

    if (report.os) {
      const low = report.os.toLowerCase();
      const allowed =
        low.includes("windows") || low.includes("ubuntu") || low.includes("debian");
      if (!allowed) {
        reasons.push("OS not in allowed list");
      }
    } else {
      reasons.push("OS unknown");
    }

    const result: PostureResult = {
      compliant: reasons.length === 0,
      reasons,
    };

    this.reports.push({ report, result });

    // apply nftables if we have an IP
    if (report.wg_ip) {
      if (result.compliant) {
        await this.nft.allow(report.wg_ip);
      } else {
        await this.nft.quarantine(report.wg_ip);
      }
    }

    return result;
  }

  getAll() {
    return this.reports.slice().reverse();
  }
}
