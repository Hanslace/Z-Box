type PostureReport = {
  ip?: string;
  os?: string;
  firewall_enabled?: boolean;
  processes?: string[];
};

type PostureResult = {
  compliant: boolean;
  reasons: string[];
};

export class PostureService {
  private reports: { report: PostureReport; result: PostureResult }[] = [];

  evaluate(report: PostureReport): PostureResult {
    const reasons: string[] = [];

    if (!report.firewall_enabled) {
      reasons.push("Firewall not enabled");
    }
    if (report.os && !report.os.toLowerCase().includes("ubuntu")) {
      reasons.push("OS is not Ubuntu-based");
    }

    const result: PostureResult = {
      compliant: reasons.length === 0,
      reasons,
    };

    this.reports.push({ report, result });
    return result;
  }

  getAll() {
    return this.reports;
  }
}
