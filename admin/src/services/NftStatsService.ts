import { execSync } from "child_process";

export class NftStatsService {
  getStats() {
    // default counts
    let compliant = 0;
    let quarantine = 0;

    try {
      const out = execSync("nft -j list table inet zbox", { encoding: "utf-8" });
      const data = JSON.parse(out);

      const sets = data.nftables
        .filter((x: any) => x.set)
        .map((x: any) => x.set);

      const compliantSet = sets.find((s: any) => s.name === "compliant_peers");
      const quarantineSet = sets.find((s: any) => s.name === "quarantine_peers");

      if (compliantSet && Array.isArray(compliantSet.elem)) {
        compliant = compliantSet.elem.length;
      }
      if (quarantineSet && Array.isArray(quarantineSet.elem)) {
        quarantine = quarantineSet.elem.length;
      }
    } catch (e) {
      // keep zeros
    }

    return {
      compliant,
      quarantine,
      total: compliant + quarantine,
    };
  }
}
