import nodemailer from "nodemailer";
import fs from "fs";

export class EmailService {
  private transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  async sendZip(to: string, zipPath: string) {
    const from = process.env.SMTP_FROM || "Z-Box <no-reply@example.com>";
    const content = fs.readFileSync(zipPath);
    await this.transporter.sendMail({
      from,
      to,
      subject: "Your Z-Box VPN configuration",
      text: "Your WireGuard configuration is attached as an encrypted ZIP. Ask your admin for the password.",
      attachments: [
        {
          filename: zipPath.split("/").pop(),
          content,
        },
      ],
    });
  }
}
