import type { PrismaClient, Prisma } from "@prisma/client";
import { saveReportFile } from "../storage";
import { sendReportEmail } from "../email";
import {
  loadReportStakeholderEmails,
  loadSmtpConfig,
} from "../settings/load-settings";
import {
  buildCsv,
  buildPdf,
  generateReportData,
} from "./generators";

export async function processReportRun(
  prisma: PrismaClient,
  reportRunId: string,
) {
  const run = await prisma.report_runs.findUnique({
    where: { id: reportRunId },
    include: { report_definition: true },
  });

  if (!run) {
    throw new Error(`Report run not found: ${reportRunId}`);
  }

  await prisma.report_runs.update({
    where: { id: reportRunId },
    data: { status: "running" },
  });

  try {
    const parameters = (run.parameters as Record<string, unknown>) ?? {};
    const { title, headers, rows } = await generateReportData(
      prisma,
      run.report_definition.slug,
      parameters,
    );

    const buffer =
      run.format === "pdf"
        ? await buildPdf(title, headers, rows)
        : buildCsv(headers, rows);

    const extension = run.format === "pdf" ? "pdf" : "csv";
    const filePath = `reports/${run.report_definition.slug}/${reportRunId}.${extension}`;
    await saveReportFile(filePath, buffer);

    await prisma.report_runs.update({
      where: { id: reportRunId },
      data: {
        status: "completed",
        file_path: filePath,
        completed_at: new Date(),
        error_message: null,
      },
    });

    if (run.is_scheduled) {
      const recipients = Array.isArray(run.report_definition.schedule_recipients)
        ? (run.report_definition.schedule_recipients as string[])
        : [];

      const dbRecipients = await loadReportStakeholderEmails(prisma);
      const envRecipients = process.env.REPORT_STAKEHOLDER_EMAILS
        ? process.env.REPORT_STAKEHOLDER_EMAILS.split(",").map((e) => e.trim())
        : [];

      const to = [...new Set([...recipients, ...dbRecipients, ...envRecipients])].filter(Boolean);
      if (to.length > 0) {
        const smtp = await loadSmtpConfig(prisma);
        await sendReportEmail({
          to,
          subject: `GRA Report: ${run.report_definition.title}`,
          text: `Scheduled report "${run.report_definition.title}" is attached.`,
          attachmentName: `${run.report_definition.slug}.${extension}`,
          attachmentBuffer: buffer,
          smtp,
        });
      }
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await prisma.report_runs.update({
      where: { id: reportRunId },
      data: {
        status: "failed",
        error_message: message,
        completed_at: new Date(),
      },
    });
    throw error;
  }
}

export async function runScheduledReports(prisma: PrismaClient) {
  const definitions = await prisma.report_definitions.findMany({
    where: { is_scheduled: true },
  });

  for (const definition of definitions) {
    const schema = definition.parameters_schema as {
      defaults?: Record<string, unknown>;
    };
    const parameters = schema?.defaults ?? {};

    const run = await prisma.report_runs.create({
      data: {
        report_definition_id: definition.id,
        parameters: parameters as Prisma.InputJsonValue,
        format: "pdf",
        status: "queued",
        is_scheduled: true,
      },
    });

    await processReportRun(prisma, run.id);
  }
}
