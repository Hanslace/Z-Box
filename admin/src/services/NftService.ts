import { exec } from "child_process";

export class NftService {
  allow(ip: string) {
    return new Promise<void>((resolve, reject) => {
      exec(`/usr/local/sbin/zbox-allow.sh ${ip}`, (err, stdout, stderr) => {
        if (err) return reject(err);
        resolve();
      });
    });
  }

  quarantine(ip: string) {
    return new Promise<void>((resolve, reject) => {
      exec(`/usr/local/sbin/zbox-quarantine.sh ${ip}`, (err, stdout, stderr) => {
        if (err) return reject(err);
        resolve();
      });
    });
  }
}
