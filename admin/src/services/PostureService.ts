type PostureReport = {
  ip?: string;             // legacy
  wg_ip?: string;          // preferred
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

  evaluate(report: PostureReport): PostureResult {
    const reasons: string[] = [];

    // 1. firewall
    if (report.firewall_enabled === false) {
      reasons.push("Firewall not enabled");
    }

    // 2. os allowlist example: Windows or Ubuntu
    if (report.os) {
      const osLow = report.os.toLowerCase();
      const allowed =
        osLow.includes("windows") || osLow.includes("ubuntu") || osLow.includes("debian");
      if (!allowed) {
        reasons.push("OS not in allowed list");
      }
    } else {
      reasons.push("OS unknown");
    }

    // 3. processes sample check
    if (Array.isArray(report.processes) && report.processes.length === 0) {
      reasons.push("No processes reported");
    }

    const result: PostureResult = {
      compliant: reasons.length === 0,
      reasons,
    };

    this.reports.push({ report, result });
    return result;
  }

  getAll() {
    // newest first
    return this.reports.slice().reverse();
  }
}
