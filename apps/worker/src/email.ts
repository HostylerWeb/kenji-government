import nodemailer from "nodemailer";

export type SmtpConfig = {
  host: string;
  port: number;
  user?: string;
  pass?: string;
  from?: string;
};

export async function sendReportEmail(options: {
  to: string[];
  subject: string;
  text: string;
  attachmentName?: string;
  attachmentBuffer?: Buffer;
  smtp?: SmtpConfig | null;
}) {
  const smtp = options.smtp;
  const host = smtp?.host ?? process.env.SMTP_HOST;
  const port = smtp?.port ?? Number(process.env.SMTP_PORT ?? 587);
  const user = smtp?.user ?? process.env.SMTP_USER;
  const pass = smtp?.pass ?? process.env.SMTP_PASS;
  const from = smtp?.from ?? process.env.SMTP_FROM ?? "noreply@gra.go.ke";

  if (!host) {
    console.log(
      `[Report email] SMTP not configured — would send to ${options.to.join(", ")}: ${options.subject}`,
    );
    return false;
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: user && pass ? { user, pass } : undefined,
  });

  await transporter.sendMail({
    from,
    to: options.to.join(","),
    subject: options.subject,
    text: options.text,
    attachments: options.attachmentBuffer
      ? [
          {
            filename: options.attachmentName ?? "report.pdf",
            content: options.attachmentBuffer,
          },
        ]
      : undefined,
  });

  return true;
}
