import {
  Injectable,
  Logger,
  UnauthorizedException,
} from "@nestjs/common";
import nodemailer from "nodemailer";
import { RedisService } from "../redis/redis.service";
import { SettingsService } from "../settings/settings.service";

const OTP_PREFIX = "gra:auth:email-otp";
const OTP_TTL_SECONDS = 600;

function isEmailOtpDisabled(): boolean {
  return process.env.AUTH_EMAIL_OTP_DISABLED === "true";
}

@Injectable()
export class EmailOtpService {
  private readonly logger = new Logger(EmailOtpService.name);

  constructor(
    private readonly redis: RedisService,
    private readonly settings: SettingsService,
  ) {}

  async sendLoginOtp(userId: string, email: string): Promise<void> {
    if (isEmailOtpDisabled()) {
      return;
    }
    const code = String(Math.floor(100000 + Math.random() * 900000));
    const client = this.redis.getClient();
    await client.setex(`${OTP_PREFIX}:${userId}`, OTP_TTL_SECONDS, code);

    const smtp = await this.settings.getSmtpConfig();
    const host = smtp?.host ?? process.env.SMTP_HOST;
    const port = smtp?.port ?? Number(process.env.SMTP_PORT ?? 587);
    const user = smtp?.user ?? process.env.SMTP_USER;
    const pass = smtp?.pass ?? process.env.SMTP_PASS;
    const from =
      smtp?.from ?? process.env.SMTP_FROM ?? "noreply@gra.go.ke";

    if (!host) {
      this.logger.warn(
        `SMTP not configured — login OTP for ${email}: ${code} (dev only)`,
      );
      return;
    }

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: user && pass ? { user, pass } : undefined,
    });

    await transporter.sendMail({
      from,
      to: email,
      subject: "GRA Console — sign-in verification code",
      text: `Your GRA Oversight Console verification code is: ${code}\n\nThis code expires in 10 minutes.\n\nIf you did not attempt to sign in, contact your administrator.`,
    });
  }

  async verifyLoginOtp(userId: string, code: string): Promise<void> {
    const normalized = code.replace(/\s/g, "");

    if (isEmailOtpDisabled()) {
      if (normalized !== "0000") {
        throw new UnauthorizedException("Invalid verification code");
      }
      return;
    }

    const client = this.redis.getClient();
    const key = `${OTP_PREFIX}:${userId}`;
    const stored = await client.get(key);

    if (!stored) {
      throw new UnauthorizedException("Verification code expired or invalid");
    }

    if (stored !== normalized) {
      throw new UnauthorizedException("Invalid verification code");
    }

    await client.del(key);
  }
}
