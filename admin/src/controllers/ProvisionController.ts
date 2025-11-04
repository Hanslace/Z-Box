import { Request, Response } from "express";
import { KeycloakAdminService } from "../services/KeycloakAdminService";
import { WireGuardService } from "../services/WireGuardService";
import { EmailService } from "../services/EmailService";
import { execSync } from "child_process";
import crypto from "crypto";
import path from "path";
import fs from "fs";

function genTempPassword() {
  return Math.random().toString(36).slice(-10);
}

function genZipPassword() {
  return crypto.randomBytes(6).toString("hex"); // 12-char
}

export class ProvisionController {
  private kc: KeycloakAdminService;
  private wg: WireGuardService;
  private mail: EmailService;

  constructor() {
    this.kc = new KeycloakAdminService();
    this.wg = new WireGuardService();
    this.mail = new EmailService();
  }

  async provision(req: Request, res: Response) {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: "email required" });

    try {
      const tempPass = genTempPassword();
      await this.kc.createUser(email, tempPass);

      const { privateKey, publicKey } = this.wg.generateKeyPair();
      const clientIp = this.wg.allocateIp();
      const serverPub = this.wg.getServerPublicKey();
      const cfg = this.wg.createClientConfig(clientIp, privateKey, serverPub);

      // save .conf
      const confPath = this.wg.saveClientConfig(clientIp, cfg);

      // add peer
      this.wg.addPeerToServer(publicKey, clientIp);

      // make password-protected zip
      const zipPass = genZipPassword();
      const zipPath = confPath.replace(/\.conf$/, ".zip");
      // zip -P <pass> <zipfile> <file>
      execSync(`zip -j -P ${zipPass} ${zipPath} ${confPath}`);

      // email the zip
      await this.mail.sendZip(email, zipPath);

      // return password to the admin (so they can send via other channel)
      return res.json({
        ok: true,
        email,
        tempPass,
        clientIp,
        zipPassword: zipPass, // DO NOT email this, show in UI only
      });
    } catch (e: any) {
      return res.status(500).json({ error: e.message || "provision failed" });
    }
  }
}