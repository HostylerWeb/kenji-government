import { PrismaClient, user_role, report_category } from "@prisma/client";
import { REPORT_SLUGS, SYSTEM_SETTING_KEYS, GOVERNMENT_TAX_RATE_DEFAULT, GOVERNMENT_GATEWAY_FEE_RATE_DEFAULT } from "@kenji-government/shared";
import bcrypt from "bcryptjs";
import { createHash } from "crypto";
import { config as loadEnv } from "dotenv";
import { resolve } from "path";
import { encryptIngestSecret } from "@kenji-government/shared";
import { aggregatePlayerSafetyRange } from "../../../apps/worker/src/player-safety/aggregate-player-safety";

loadEnv({ path: resolve(__dirname, "../../../.env") });

const SANDBOX_API_KEY =
  process.env.SANDBOX_API_KEY ?? "gra_sandbox_op001_devkey0001";
const SANDBOX_HMAC_SECRET =
  process.env.SANDBOX_HMAC_SECRET ?? "sandbox_hmac_op001_secret_32chars_min";
const prisma = new PrismaClient();

const STAFF_USERS = [
  {
    email: "admin@gra.go.ke",
    full_name: "GRA Super Administrator",
    role: user_role.super_admin,
    password: "GraAdmin123!",
  },
  {
    email: "gra.admin@gra.go.ke",
    full_name: "GRA Administrator",
    role: user_role.admin,
    password: "GraAdmin123!",
  },
  {
    email: "supervisor@gra.go.ke",
    full_name: "GRA Supervisor",
    role: user_role.supervisor,
    password: "GraAdmin123!",
  },
  {
    email: "analyst@gra.go.ke",
    full_name: "GRA Analyst",
    role: user_role.analyst,
    password: "GraAdmin123!",
  },
  {
    email: "auditor@gra.go.ke",
    full_name: "GRA Auditor",
    role: user_role.auditor,
    password: "GraAdmin123!",
  },
];

const OPERATORS = [
  {
    external_id: "op-001",
    trading_name: "Safari Jackpot",
    legal_name: "Safari Jackpot Limited",
    county: "Nairobi",
    region: "Nairobi",
    website: "https://safarijackpot.co.ke",
    beneficial_owner: "James Kamau Mwangi",
    email: "compliance@safarijackpot.co.ke",
    phone: "+254 722 123 456",
    risk_score: 12,
    annual_ggr: 485000000,
    tax_paid: 72750000,
    tax_due: 72750000,
    monthly_tickets: 125000,
    licence_number: "GRA/RAF/2024/001",
  },
  {
    external_id: "op-002",
    trading_name: "Coast Wins",
    legal_name: "Coast Wins Entertainment Ltd",
    county: "Mombasa",
    region: "Coast",
    website: "https://coastwins.co.ke",
    beneficial_owner: "Amina Hassan",
    email: "finance@coastwins.co.ke",
    phone: "+254 711 234 567",
    risk_score: 28,
    annual_ggr: 210000000,
    tax_paid: 28000000,
    tax_due: 31500000,
    monthly_tickets: 52000,
    licence_number: "GRA/RAF/2024/002",
  },
  {
    external_id: "op-003",
    trading_name: "Highland Raffles",
    legal_name: "Highland Raffles Kenya",
    county: "Nyeri",
    region: "Central",
    website: "https://highlandraffles.co.ke",
    beneficial_owner: "Peter Waweru",
    email: "ops@highlandraffles.co.ke",
    phone: "+254 733 345 678",
    risk_score: 45,
    annual_ggr: 156000000,
    tax_paid: 18000000,
    tax_due: 23400000,
    monthly_tickets: 38000,
    licence_number: "GRA/RAF/2024/003",
    compliance_status: "at_risk" as const,
  },
  {
    external_id: "op-004",
    trading_name: "Lake City Comps",
    legal_name: "Lake City Competitions Ltd",
    county: "Kisumu",
    region: "Western",
    website: "https://lakecitycomps.co.ke",
    beneficial_owner: "Grace Akinyi",
    email: "admin@lakecitycomps.co.ke",
    phone: "+254 700 456 789",
    risk_score: 18,
    annual_ggr: 98000000,
    tax_paid: 14700000,
    tax_due: 14700000,
    monthly_tickets: 24000,
    licence_number: "GRA/RAF/2024/004",
  },
  {
    external_id: "op-005",
    trading_name: "Rift Valley Draws",
    legal_name: "Rift Valley Draws PLC",
    county: "Eldoret",
    region: "Rift Valley",
    website: "https://riftvalleydraws.co.ke",
    beneficial_owner: "David Kipchoge",
    email: "info@riftvalleydraws.co.ke",
    phone: "+254 712 567 890",
    risk_score: 22,
    annual_ggr: 175000000,
    tax_paid: 22000000,
    tax_due: 26250000,
    monthly_tickets: 41000,
    licence_number: "GRA/RAF/2024/005",
  },
  {
    external_id: "op-006",
    trading_name: "Nairobi Night Wins",
    legal_name: "Nairobi Night Wins Ltd",
    county: "Nairobi",
    region: "Nairobi",
    website: "https://nairobinightwins.co.ke",
    beneficial_owner: "Sarah Njeri",
    email: "compliance@nairobinightwins.co.ke",
    phone: "+254 723 678 901",
    risk_score: 35,
    annual_ggr: 320000000,
    tax_paid: 40000000,
    tax_due: 48000000,
    monthly_tickets: 88000,
    licence_number: "GRA/RAF/2024/006",
    compliance_status: "at_risk" as const,
  },
  {
    external_id: "op-007",
    trading_name: "Savanna Spins",
    legal_name: "Savanna Spins Kenya",
    county: "Machakos",
    region: "Eastern",
    website: "https://savannaspins.co.ke",
    beneficial_owner: "John Mutua",
    email: "hello@savannaspins.co.ke",
    phone: "+254 734 789 012",
    risk_score: 15,
    annual_ggr: 89000000,
    tax_paid: 13350000,
    tax_due: 13350000,
    monthly_tickets: 22000,
    licence_number: "GRA/RAF/2024/007",
  },
  {
    external_id: "op-008",
    trading_name: "Coastal Fortune",
    legal_name: "Coastal Fortune Ltd",
    county: "Kilifi",
    region: "Coast",
    website: "https://coastalfortune.co.ke",
    beneficial_owner: "Fatuma Ali",
    email: "support@coastalfortune.co.ke",
    phone: "+254 715 890 123",
    risk_score: 52,
    annual_ggr: 67000000,
    tax_paid: 5000000,
    tax_due: 20100000,
    monthly_tickets: 15000,
    licence_number: "GRA/RAF/2024/008",
    compliance_status: "non_compliant" as const,
  },
  {
    external_id: "op-009",
    trading_name: "Capital Comps",
    legal_name: "Capital Comps Kenya Ltd",
    county: "Nairobi",
    region: "Nairobi",
    website: "https://capitalcomps.co.ke",
    beneficial_owner: "Michael Ochieng",
    email: "finance@capitalcomps.co.ke",
    phone: "+254 716 901 234",
    risk_score: 20,
    annual_ggr: 410000000,
    tax_paid: 61500000,
    tax_due: 61500000,
    monthly_tickets: 102000,
    licence_number: "GRA/RAF/2024/009",
  },
  {
    external_id: "op-010",
    trading_name: "Western Wins",
    legal_name: "Western Wins Ltd",
    county: "Kakamega",
    region: "Western",
    website: "https://westernwins.co.ke",
    beneficial_owner: "Lucy Wanjala",
    email: "ops@westernwins.co.ke",
    phone: "+254 717 012 345",
    risk_score: 30,
    annual_ggr: 112000000,
    tax_paid: 14000000,
    tax_due: 16800000,
    monthly_tickets: 29000,
    licence_number: "GRA/RAF/2024/010",
  },
  {
    external_id: "op-011",
    trading_name: "Mount Kenya Raffles",
    legal_name: "Mount Kenya Raffles Ltd",
    county: "Meru",
    region: "Eastern",
    website: "https://mountkenyarraffles.co.ke",
    beneficial_owner: "Daniel Muriuki",
    email: "admin@mountkenyarraffles.co.ke",
    phone: "+254 718 123 456",
    risk_score: 14,
    annual_ggr: 398000000,
    tax_paid: 59700000,
    tax_due: 59700000,
    monthly_tickets: 95000,
    licence_number: "GRA/RAF/2024/011",
  },
  {
    external_id: "op-012",
    trading_name: "Thika Prize Hub",
    legal_name: "Thika Prize Hub Ltd",
    county: "Kiambu",
    region: "Central",
    website: "https://thikaprizehub.co.ke",
    beneficial_owner: "Catherine Wambui",
    email: "info@thikaprizehub.co.ke",
    phone: "+254 719 234 567",
    risk_score: 25,
    annual_ggr: 145000000,
    tax_paid: 18000000,
    tax_due: 21750000,
    monthly_tickets: 36000,
    licence_number: "GRA/RAF/2024/012",
  },
  {
    external_id: "op-013",
    trading_name: "Nakuru Lucky Draw",
    legal_name: "Nakuru Lucky Draw Ltd",
    county: "Nakuru",
    region: "Rift Valley",
    website: "https://nakurulucky.co.ke",
    beneficial_owner: "Joseph Kariuki",
    email: "compliance@nakurulucky.co.ke",
    phone: "+254 720 345 678",
    risk_score: 19,
    annual_ggr: 128000000,
    tax_paid: 19200000,
    tax_due: 19200000,
    monthly_tickets: 31000,
    licence_number: "GRA/RAF/2024/013",
  },
  {
    external_id: "op-014",
    trading_name: "Mombasa Mega Wins",
    legal_name: "Mombasa Mega Wins Ltd",
    county: "Mombasa",
    region: "Coast",
    website: "https://mombasamegawins.co.ke",
    beneficial_owner: "Hassan Omar",
    email: "finance@mombasamegawins.co.ke",
    phone: "+254 721 456 789",
    risk_score: 38,
    annual_ggr: 267000000,
    tax_paid: 30000000,
    tax_due: 40050000,
    monthly_tickets: 67000,
    licence_number: "GRA/RAF/2024/014",
    compliance_status: "at_risk" as const,
  },
  {
    external_id: "op-015",
    trading_name: "Kenya Grand Prize",
    legal_name: "Kenya Grand Prize Ltd",
    county: "Nairobi",
    region: "Nairobi",
    website: "https://kenyagrandprize.co.ke",
    beneficial_owner: "Elizabeth Mwangi",
    email: "ops@kenyagrandprize.co.ke",
    phone: "+254 722 567 890",
    risk_score: 16,
    annual_ggr: 345000000,
    tax_paid: 51750000,
    tax_due: 51750000,
    monthly_tickets: 89000,
    licence_number: "GRA/RAF/2024/015",
  },
];

async function main() {
  console.log("Seeding GRA staff users...");
  let adminUserId: string | undefined;
  for (const user of STAFF_USERS) {
    const password_hash = await bcrypt.hash(user.password, 12);
    await prisma.users.upsert({
      where: { email: user.email },
      update: {
        full_name: user.full_name,
        role: user.role,
        password_hash,
        is_active: true,
      },
      create: {
        email: user.email,
        full_name: user.full_name,
        role: user.role,
        password_hash,
        is_active: true,
      },
    });
    if (user.email === "admin@gra.go.ke") {
      const admin = await prisma.users.findUnique({ where: { email: user.email } });
      adminUserId = admin?.id;
    }
  }

  if (!adminUserId) {
    throw new Error("Admin user not found after seed");
  }

  console.log("Seeding reporting periods...");
  const periods = [];
  for (let m = 1; m <= 6; m++) {
    const year = 2026;
    const label = new Date(year, m - 1, 1).toLocaleString("en-KE", {
      month: "long",
      year: "numeric",
    });
    const starts_at = new Date(year, m - 1, 1);
    const ends_at = new Date(year, m, 0);
    const period = await prisma.reporting_periods.upsert({
      where: { year_month: { year, month: m } },
      update: { label, starts_at, ends_at },
      create: { year, month: m, label, starts_at, ends_at },
    });
    periods.push(period);
  }

  console.log("Seeding operators...");
  const operatorIds: Record<string, string> = {};
  for (const op of OPERATORS) {
    const operator = await prisma.operators.upsert({
      where: { external_id: op.external_id },
      update: {
        legal_name: op.legal_name,
        trading_name: op.trading_name,
        county: op.county,
        region: op.region,
        website: op.website,
        beneficial_owner: op.beneficial_owner,
        email: op.email,
        phone: op.phone,
        risk_score: op.risk_score,
        annual_ggr: op.annual_ggr,
        tax_paid: op.tax_paid,
        tax_due: op.tax_due,
        monthly_tickets: op.monthly_tickets,
        compliance_status: op.compliance_status ?? "compliant",
        status: "active",
        last_submission_at: new Date("2026-04-15"),
      },
      create: {
        external_id: op.external_id,
        legal_name: op.legal_name,
        trading_name: op.trading_name,
        county: op.county,
        region: op.region,
        website: op.website,
        beneficial_owner: op.beneficial_owner,
        email: op.email,
        phone: op.phone,
        risk_score: op.risk_score,
        annual_ggr: op.annual_ggr,
        tax_paid: op.tax_paid,
        tax_due: op.tax_due,
        monthly_tickets: op.monthly_tickets,
        compliance_status: op.compliance_status ?? "compliant",
        status: "active",
        last_submission_at: new Date("2026-04-15"),
      },
    });

    operatorIds[op.external_id] = operator.id;

    const domain = new URL(op.website).hostname;
    const existingSite = await prisma.operator_sites.findFirst({
      where: { operator_id: operator.id, is_primary: true },
    });
    if (existingSite) {
      await prisma.operator_sites.update({
        where: { id: existingSite.id },
        data: { domain, site_name: op.trading_name, status: "active" },
      });
    } else {
      await prisma.operator_sites.create({
        data: {
          operator_id: operator.id,
          domain,
          site_name: op.trading_name,
          is_primary: true,
          status: "active",
        },
      });
    }

    await prisma.licences.upsert({
      where: { licence_number: op.licence_number },
      update: {
        operator_id: operator.id,
        licence_type: "raffle",
        issued_at: new Date("2022-03-15"),
        expires_at: new Date("2027-03-14"),
        status: "active",
      },
      create: {
        operator_id: operator.id,
        licence_number: op.licence_number,
        licence_type: "raffle",
        issued_at: new Date("2022-03-15"),
        expires_at: new Date("2027-03-14"),
        status: "active",
      },
    });

    for (const period of periods) {
      const monthIndex = period.month;
      const variance = 0.85 + (monthIndex % 3) * 0.1;
      const ggr = (Number(op.annual_ggr) / 12) * variance;
      const taxDue = ggr * 0.15;
      const taxPaid =
        op.compliance_status === "non_compliant"
          ? taxDue * 0.25
          : op.compliance_status === "at_risk"
            ? taxDue * 0.7
            : taxDue;

      await prisma.operator_monthly_snapshots.upsert({
        where: {
          operator_id_reporting_period_id: {
            operator_id: operator.id,
            reporting_period_id: period.id,
          },
        },
        update: {
          gross_gaming_revenue: ggr,
          tax_paid: taxPaid,
          tickets_sold: Math.floor((op.monthly_tickets / 12) * variance),
        },
        create: {
          operator_id: operator.id,
          reporting_period_id: period.id,
          gross_gaming_revenue: ggr,
          tax_paid: taxPaid,
          tickets_sold: Math.floor((op.monthly_tickets / 12) * variance),
        },
      });

      const submissionStatus =
        op.compliance_status === "non_compliant" && period.month >= 5
          ? "rejected"
          : op.compliance_status === "at_risk" && period.month === 6
            ? "pending"
            : op.compliance_status === "at_risk" && period.month === 5
              ? "revision_requested"
              : period.month <= 4
                ? "approved"
                : "pending";

      const existingSubmission = await prisma.submissions.findFirst({
        where: { operator_id: operator.id, reporting_period_id: period.id },
      });

      const submissionData = {
        tickets_sold: BigInt(Math.floor((op.monthly_tickets / 12) * variance)),
        gross_revenue: ggr * 1.2,
        prizes_paid: ggr * 0.5,
        expenses: ggr * 0.15,
        gross_gaming_revenue: ggr,
        tax_due: taxDue,
        tax_paid: taxPaid,
        tax_outstanding: taxDue - taxPaid,
        status: submissionStatus as "pending" | "approved" | "rejected" | "revision_requested",
        submitted_at: new Date(2026, period.month - 1, 15),
        reviewed_by:
          submissionStatus === "approved" || submissionStatus === "rejected"
            ? adminUserId
            : null,
        reviewed_at:
          submissionStatus === "approved" || submissionStatus === "rejected"
            ? new Date(2026, period.month - 1, 20)
            : null,
      };

      let submissionId: string;

      if (existingSubmission) {
        const updated = await prisma.submissions.update({
          where: { id: existingSubmission.id },
          data: submissionData,
        });
        submissionId = updated.id;
      } else {
        const created = await prisma.submissions.create({
          data: {
            operator_id: operator.id,
            reporting_period_id: period.id,
            ...submissionData,
          },
        });
        submissionId = created.id;
      }

      if (
        submissionStatus === "pending" ||
        submissionStatus === "revision_requested"
      ) {
        const periodSlug = period.label.replace(/\s+/g, "_");
        const supportingDocs = [
          {
            type: "monthly_return" as const,
            title: `Monthly_Return_${periodSlug}.pdf`,
          },
          {
            type: "bank_statement" as const,
            title: `Bank_Statement_${periodSlug}.pdf`,
          },
        ];

        for (const doc of supportingDocs) {
          const existingSupporting = await prisma.documents.findFirst({
            where: {
              submission_id: submissionId,
              document_type: doc.type,
            },
          });
          if (!existingSupporting) {
            await prisma.documents.create({
              data: {
                operator_id: operator.id,
                submission_id: submissionId,
                document_type: doc.type,
                title: doc.title,
                file_path: `documents/${op.external_id}/${doc.type}-${period.year}-${period.month}.pdf`,
                file_size: BigInt(312000),
                mime_type: "application/pdf",
                uploaded_by: adminUserId,
              },
            });
          }
        }
      }
    }

    const docTypes = [
      { type: "trading_licence" as const, title: "Trading Licence" },
      { type: "registration" as const, title: "Company Registration" },
      { type: "tax_certificate" as const, title: "Tax Compliance Certificate" },
    ];

    for (const doc of docTypes) {
      const existingDoc = await prisma.documents.findFirst({
        where: { operator_id: operator.id, document_type: doc.type },
      });
      if (!existingDoc) {
        await prisma.documents.create({
          data: {
            operator_id: operator.id,
            document_type: doc.type,
            title: doc.title,
            file_path: `documents/${op.external_id}/${doc.type}.pdf`,
            file_size: BigInt(245000),
            mime_type: "application/pdf",
            uploaded_by: adminUserId,
          },
        });
      }
    }
  }

  console.log("Seeding enforcement cases...");
  const enforcementSeed = [
    {
      external_id: "op-003",
      case_number: "ENF-2026-001",
      case_type: "investigation" as const,
      title: "Late tax remittance — Highland Raffles",
      description: "Operator failed to remit Q1 tax within statutory deadline.",
      metadata: {
        nature: "tax_non_compliance",
        priority: "high",
        requires_operator_response: true,
        is_internal: false,
        required_documents: "Q1 tax return, remittance proof, and bank transfer records.",
        allegations_summary:
          "Operator failed to remit Q1 tax within the statutory deadline and has not provided a satisfactory explanation.",
      },
    },
    {
      external_id: "op-006",
      case_number: "ENF-2026-002",
      case_type: "warning" as const,
      title: "Submission quality review — Nairobi Night Wins",
      description: "Repeated discrepancies in monthly GGR reporting.",
      metadata: {
        nature: "inaccurate_reporting",
        priority: "medium",
        requires_operator_response: true,
        is_internal: false,
        required_documents: "Corrected monthly return and supporting GGR audit trail.",
        allegations_summary:
          "Repeated discrepancies were identified between reported GGR and supporting transaction data.",
      },
    },
    {
      external_id: "op-008",
      case_number: "ENF-2026-003",
      case_type: "fine" as const,
      title: "Tax arrears — Coastal Fortune",
      description: "Significant tax outstanding exceeding 60 days.",
      metadata: {
        nature: "tax_non_compliance",
        priority: "high",
        requires_operator_response: true,
        is_internal: false,
        required_documents: "Outstanding tax schedule and payment plan proposal.",
        allegations_summary:
          "Significant tax arrears remain outstanding beyond 60 days without an approved payment plan.",
      },
    },
    {
      external_id: "op-014",
      case_number: "ENF-2026-004",
      case_type: "warning" as const,
      title: "Compliance monitoring — Mombasa Mega Wins",
      description: "At-risk compliance tier; increased monitoring required.",
      metadata: {
        nature: "internal_review",
        priority: "medium",
        requires_operator_response: false,
        is_internal: true,
        allegations_summary:
          "Operator moved to at-risk compliance tier; internal monitoring review initiated.",
      },
    },
  ];

  for (const item of enforcementSeed) {
    const operatorId = operatorIds[item.external_id];
    if (!operatorId) continue;

    const caseRecord = await prisma.enforcement_cases.upsert({
      where: { case_number: item.case_number },
      update: {
        title: item.title,
        description: item.description,
        metadata: item.metadata,
        status: "open",
      },
      create: {
        operator_id: operatorId,
        case_number: item.case_number,
        case_type: item.case_type,
        title: item.title,
        description: item.description,
        metadata: item.metadata,
        status: "open",
        opened_by: adminUserId,
      },
    });

    const existingAction = await prisma.enforcement_actions.findFirst({
      where: { enforcement_case_id: caseRecord.id },
    });

    if (!existingAction) {
      await prisma.enforcement_actions.create({
        data: {
          enforcement_case_id: caseRecord.id,
          action_type:
            item.case_type === "fine" ? "fine" : item.case_type === "warning" ? "warning" : "notice",
          details: `Case opened for ${item.title}`,
          fine_amount: item.case_type === "fine" ? 500000 : null,
          performed_by: adminUserId,
        },
      });
    }
  }

  console.log("Seeding audit log samples...");
  const op003Id = operatorIds["op-003"];
  const op006Id = operatorIds["op-006"];
  const auditSamples = [
    {
      user_id: adminUserId,
      action: "login",
      entity_type: "users",
      entity_id: adminUserId,
      metadata: {
        category: "auth",
        summary: "Signed in as GRA Super Administrator",
      },
    },
    {
      user_id: adminUserId,
      action: "enforcement_case_created",
      entity_type: "enforcement_cases",
      entity_id: op003Id,
      metadata: {
        category: "platform",
        summary: "Opened ENF-2026-001 — Late tax remittance — Highland Raffles",
        case_number: "ENF-2026-001",
        external_id: "op-003",
        operator_name: "Highland Raffles",
      },
    },
    {
      user_id: adminUserId,
      action: "operator_warning",
      entity_type: "operators",
      entity_id: op006Id,
      metadata: {
        category: "platform",
        summary: "Issued warning to Nairobi Night Wins",
        external_id: "op-006",
        operator_name: "Nairobi Night Wins",
        details: "Repeated discrepancies in monthly GGR reporting.",
      },
    },
    {
      user_id: adminUserId,
      action: "submission_approved",
      entity_type: "submissions",
      metadata: {
        category: "platform",
        summary: "Approved submission for Safari Jackpot (July 2026)",
        external_id: "op-001",
        operator_name: "Safari Jackpot",
        status: "approved",
      },
    },
    {
      user_id: adminUserId,
      action: "profile_password_changed",
      entity_type: "users",
      entity_id: adminUserId,
      metadata: {
        category: "auth",
        summary: "Changed account password",
      },
    },
  ];

  for (const sample of auditSamples) {
    const existing = await prisma.audit_logs.findFirst({
      where: { action: sample.action, user_id: sample.user_id },
    });
    if (!existing) {
      await prisma.audit_logs.create({ data: sample });
    }
  }

  console.log("Seeding report catalogue...");
  const REPORT_DEFINITIONS = [
    {
      slug: REPORT_SLUGS.GGR_BY_OPERATOR_MONTHLY,
      title: "GGR by Operator (Monthly)",
      description: "Gross gaming revenue and tax paid per operator for a reporting month.",
      category: report_category.commercial,
      required_role: user_role.analyst,
      parameters_schema: {
        fields: [
          { name: "year", type: "number", label: "Year", default: 2026 },
          { name: "month", type: "number", label: "Month", min: 1, max: 12, default: 7 },
        ],
        defaults: { year: 2026, month: 7 },
      },
      is_scheduled: true,
      schedule_recipients: ["supervisor@gra.go.ke"],
      schedule_cadence: "daily",
    },
    {
      slug: REPORT_SLUGS.TAX_COLLECTED_VS_DUE,
      title: "Tax Collected vs Due",
      description: "Outstanding tax positions across active operators.",
      category: report_category.commercial,
      required_role: user_role.supervisor,
      parameters_schema: { fields: [], defaults: {} },
      is_scheduled: false,
    },
    {
      slug: REPORT_SLUGS.COMPLIANCE_STATUS_SUMMARY,
      title: "Compliance Status Summary",
      description: "Operator counts by compliance tier.",
      category: report_category.compliance,
      required_role: user_role.auditor,
      parameters_schema: { fields: [], defaults: {} },
      is_scheduled: true,
      schedule_recipients: ["supervisor@gra.go.ke", "analyst@gra.go.ke"],
      schedule_cadence: "daily",
    },
    {
      slug: REPORT_SLUGS.REGIONAL_COMMERCIAL_SUMMARY,
      title: "Regional Commercial Summary",
      description: "Active operators and annual GGR grouped by county.",
      category: report_category.regional,
      required_role: user_role.analyst,
      parameters_schema: { fields: [], defaults: {} },
      is_scheduled: false,
    },
    {
      slug: REPORT_SLUGS.PLAYER_SAFETY_AGGREGATES,
      title: "Player Safety Regional Summary",
      description:
        "Anonymised play-safe activations, self-exclusions, and session patterns by county.",
      category: report_category.player_safety,
      required_role: user_role.analyst,
      parameters_schema: { fields: [], defaults: {} },
      is_scheduled: false,
    },
    {
      slug: REPORT_SLUGS.PAYMENT_GATEWAY_DAILY_VOLUME,
      title: "Payment Gateway Daily Volume",
      description: "Daily payment volumes via Harambe Pay (Phase 7).",
      category: report_category.payment,
      required_role: user_role.supervisor,
      parameters_schema: { fields: [], defaults: {} },
      is_scheduled: false,
    },
    {
      slug: REPORT_SLUGS.AML_ALERT_SUMMARY,
      title: "AML Alert Summary",
      description: "Open AML alerts and review status (Phase 7).",
      category: report_category.compliance,
      required_role: user_role.supervisor,
      parameters_schema: { fields: [], defaults: {} },
      is_scheduled: false,
    },
    {
      slug: REPORT_SLUGS.CBK_AML_PAYMENT_EXPORT,
      title: "CBK AML Payment Export",
      description:
        "CBK-oriented export of gateway payments with KYC and AML risk fields.",
      category: report_category.payment,
      required_role: user_role.supervisor,
      parameters_schema: {
        fields: [
          {
            name: "days",
            type: "number",
            label: "Days back",
            default: 30,
            min: 7,
            max: 365,
          },
        ],
        defaults: { days: 30 },
      },
      is_scheduled: false,
    },
    {
      slug: REPORT_SLUGS.OPERATOR_LICENCE_EXPIRY,
      title: "Operator Licence Expiry",
      description: "Licences expiring within the next 90 days.",
      category: report_category.compliance,
      required_role: user_role.analyst,
      parameters_schema: { fields: [], defaults: {} },
      is_scheduled: true,
      schedule_recipients: ["supervisor@gra.go.ke"],
      schedule_cadence: "daily",
    },
  ];

  for (const report of REPORT_DEFINITIONS) {
    await prisma.report_definitions.upsert({
      where: { slug: report.slug },
      update: {
        title: report.title,
        description: report.description,
        category: report.category,
        required_role: report.required_role,
        parameters_schema: report.parameters_schema,
        is_scheduled: report.is_scheduled,
        schedule_recipients: report.schedule_recipients ?? undefined,
        schedule_cadence: report.schedule_cadence ?? undefined,
      },
      create: {
        slug: report.slug,
        title: report.title,
        description: report.description,
        category: report.category,
        required_role: report.required_role,
        parameters_schema: report.parameters_schema,
        is_scheduled: report.is_scheduled,
        schedule_recipients: report.schedule_recipients ?? undefined,
        schedule_cadence: report.schedule_cadence ?? undefined,
      },
    });
  }

  console.log("Seeding sandbox API credentials (op-001)...");
  const sandboxSite = await prisma.operator_sites.findFirst({
    where: {
      is_primary: true,
      operator: { external_id: "op-001" },
    },
  });
  if (sandboxSite) {
    const prefix = SANDBOX_API_KEY.slice(0, 12);
    const existingCred = await prisma.api_credentials.findFirst({
      where: { api_key_prefix: prefix },
    });
    if (!existingCred) {
      await prisma.api_credentials.create({
        data: {
          operator_site_id: sandboxSite.id,
          api_key_hash: createHash("sha256").update(SANDBOX_API_KEY).digest("hex"),
          api_key_prefix: prefix,
          hmac_secret_hash: createHash("sha256")
            .update(SANDBOX_HMAC_SECRET)
            .digest("hex"),
          hmac_secret_encrypted: encryptIngestSecret(SANDBOX_HMAC_SECRET),
          is_active: true,
        },
      });
    }
  }

  console.log("Seeding player safety demo events...");
  const primarySite = await prisma.operator_sites.findFirst({
    where: {
      is_primary: true,
      operator: { external_id: "op-001" },
    },
  });

  if (primarySite) {
    await prisma.player_safety_events.deleteMany({
      where: { operator_site_id: primarySite.id },
    });
    await prisma.session_aggregate_events.deleteMany({
      where: { operator_site_id: primarySite.id },
    });
    await prisma.player_safety_aggregates.deleteMany({});

    const counties = [
      "Nairobi",
      "Mombasa",
      "Kisumu",
      "Nyeri",
      "Kiambu",
      "Nakuru",
    ];
    const stakeBands = [
      "0-50", "51-100", "101-250", "251-500", "501-1000", "1001+",
    ];
    const ageBands = ["18-24", "25-34", "35-44", "45-54", "55+"];

    for (let dayOffset = 13; dayOffset >= 0; dayOffset -= 1) {
      const bucketDate = new Date();
      bucketDate.setUTCDate(bucketDate.getUTCDate() - dayOffset);
      bucketDate.setUTCHours(0, 0, 0, 0);

      for (const county of counties) {
        const playSafeCount = 2 + Math.floor(Math.random() * 8);
        for (let i = 0; i < playSafeCount; i += 1) {
          const occurredAt = new Date(bucketDate);
          occurredAt.setUTCHours(8 + Math.floor(Math.random() * 12));
          occurredAt.setUTCMinutes(Math.floor(Math.random() * 60));
          await prisma.player_safety_events.create({
            data: {
              operator_site_id: primarySite.id,
              event_type: "play_safe",
              county,
              region: county === "Nairobi" ? "Central" : "Coast",
              hour_of_day: occurredAt.getUTCHours(),
              day_of_week: occurredAt.getUTCDay(),
              occurred_at: occurredAt,
            },
          });
        }

        if (Math.random() > 0.6) {
          const occurredAt = new Date(bucketDate);
          occurredAt.setUTCHours(14);
          await prisma.player_safety_events.create({
            data: {
              operator_site_id: primarySite.id,
              event_type: "self_exclusion",
              county,
              hour_of_day: 14,
              day_of_week: occurredAt.getUTCDay(),
              occurred_at: occurredAt,
            },
          });
        }

        for (let hour = 10; hour <= 22; hour += 2) {
          const bucketStart = new Date(bucketDate);
          bucketStart.setUTCHours(hour, 0, 0, 0);
          const sessionCount = 20 + Math.floor(Math.random() * 80);
          const bandDistribution: Record<string, number> = {};
          const ageDistribution: Record<string, number> = {};
          for (const band of stakeBands) {
            bandDistribution[band] = Math.floor(Math.random() * sessionCount / 3);
          }
          for (const band of ageBands) {
            ageDistribution[band] = Math.floor(Math.random() * sessionCount / 4);
          }
          await prisma.session_aggregate_events.upsert({
            where: {
              operator_site_id_county_bucket_start: {
                operator_site_id: primarySite.id,
                county,
                bucket_start: bucketStart,
              },
            },
            create: {
              operator_site_id: primarySite.id,
              county,
              bucket_start: bucketStart,
              day_of_week: bucketStart.getUTCDay(),
              hour_of_day: hour,
              session_count: sessionCount,
              total_session_minutes: sessionCount * (15 + Math.floor(Math.random() * 30)),
              stake_band_distribution: bandDistribution,
              age_band_distribution: ageDistribution,
            },
            update: {
              session_count: sessionCount,
              total_session_minutes: sessionCount * (15 + Math.floor(Math.random() * 30)),
              stake_band_distribution: bandDistribution,
              age_band_distribution: ageDistribution,
            },
          });
        }
      }
    }
    await aggregatePlayerSafetyRange(prisma, 14);
  }

  console.log("Seeding system settings...");
  const superAdmin = await prisma.users.findUnique({
    where: { email: "admin@gra.go.ke" },
  });

  await prisma.system_settings.upsert({
    where: { key: SYSTEM_SETTING_KEYS.TAX_RATE },
    update: { value: { rate: GOVERNMENT_TAX_RATE_DEFAULT } },
    create: {
      key: SYSTEM_SETTING_KEYS.TAX_RATE,
      value: { rate: GOVERNMENT_TAX_RATE_DEFAULT },
      updated_by: superAdmin?.id,
    },
  });

  await prisma.system_settings.upsert({
    where: { key: SYSTEM_SETTING_KEYS.GATEWAY_FEE_RATE },
    update: { value: { rate: GOVERNMENT_GATEWAY_FEE_RATE_DEFAULT } },
    create: {
      key: SYSTEM_SETTING_KEYS.GATEWAY_FEE_RATE,
      value: { rate: GOVERNMENT_GATEWAY_FEE_RATE_DEFAULT },
      updated_by: superAdmin?.id,
    },
  });

  await prisma.system_settings.upsert({
    where: { key: SYSTEM_SETTING_KEYS.TREASURY_ACCOUNT_REF },
    update: { value: { account_ref: "KE-TREASURY-GRA-001" } },
    create: {
      key: SYSTEM_SETTING_KEYS.TREASURY_ACCOUNT_REF,
      value: { account_ref: "KE-TREASURY-GRA-001" },
      updated_by: superAdmin?.id,
    },
  });

  await prisma.system_settings.upsert({
    where: { key: SYSTEM_SETTING_KEYS.REPORT_STAKEHOLDER_EMAILS },
    update: {
      value: { emails: ["supervisor@gra.go.ke", "analyst@gra.go.ke"] },
    },
    create: {
      key: SYSTEM_SETTING_KEYS.REPORT_STAKEHOLDER_EMAILS,
      value: { emails: ["supervisor@gra.go.ke", "analyst@gra.go.ke"] },
      updated_by: superAdmin?.id,
    },
  });

  const demoSite = await prisma.operator_sites.findFirst({
    where: {
      is_primary: true,
      operator: { external_id: "op-001" },
    },
  });

  if (demoSite) {
    const seedGross = 100;
    const seedTax = Math.round(seedGross * GOVERNMENT_TAX_RATE_DEFAULT * 100) / 100;
    const seedOperatorAmount = Math.round((seedGross - seedTax) * 100) / 100;
    const seedGatewayFee =
      Math.round(seedGross * GOVERNMENT_GATEWAY_FEE_RATE_DEFAULT * 100) / 100;

    console.log(
      `Seeding sample gateway payment (${seedGross} KSH gross / ${seedTax} tax / ${seedGatewayFee} gateway fee)...`,
    );
    const externalId = "hpay-seed-demo-100";
    const existingPayment = await prisma.payment_transactions.findUnique({
      where: { external_transaction_id: externalId },
    });

    if (!existingPayment) {
      const op = await prisma.operators.findFirst({
        where: { external_id: "op-001" },
      });
      if (op) {
        const payment = await prisma.payment_transactions.create({
          data: {
            external_transaction_id: externalId,
            operator_id: op.id,
            operator_site_id: demoSite.id,
            ticket_reference: "TKT-SEED-100",
            gross_amount: seedGross,
            operator_amount: seedOperatorAmount,
            tax_amount: seedTax,
            tax_rate: GOVERNMENT_TAX_RATE_DEFAULT,
            gateway_fee_rate: GOVERNMENT_GATEWAY_FEE_RATE_DEFAULT,
            gateway_fee_amount: seedGatewayFee,
            currency: "KES",
            status: "completed",
            kyc_status: "verified",
            aml_risk_score: 0,
            payer_fingerprint: "fp_seed_demo",
            county: op.county,
            completed_at: new Date(),
          },
        });

        await prisma.tax_escrow_entries.create({
          data: {
            payment_transaction_id: payment.id,
            tax_amount: 30,
            status: "earmarked",
          },
        });
      }
    } else if (Number(existingPayment.gateway_fee_amount) === 0) {
      await prisma.payment_transactions.update({
        where: { id: existingPayment.id },
        data: {
          gateway_fee_rate: GOVERNMENT_GATEWAY_FEE_RATE_DEFAULT,
          gateway_fee_amount: seedGatewayFee,
        },
      });
    }

    const payment =
      existingPayment ??
      (await prisma.payment_transactions.findUnique({
        where: { external_transaction_id: externalId },
      }));
    const op = await prisma.operators.findFirst({
      where: { external_id: "op-001" },
    });
    if (payment && op) {
      const existingAlert = await prisma.aml_alerts.findFirst({
        where: { payment_transaction_id: payment.id, status: "open" },
      });
      if (!existingAlert) {
        await prisma.aml_alerts.create({
          data: {
            payment_transaction_id: payment.id,
            operator_id: op.id,
            alert_type: "structuring",
            severity: "medium",
            details: { reason: "Seed demo AML alert for review workflow" },
            status: "open",
          },
        });
      }
    }
  }

  const zeroFeePayments = await prisma.payment_transactions.findMany({
    where: {
      status: "completed",
      gateway_fee_amount: 0,
    },
  });
  for (const payment of zeroFeePayments) {
    const gross = Number(payment.gross_amount);
    const fee = Math.round(gross * GOVERNMENT_GATEWAY_FEE_RATE_DEFAULT * 100) / 100;
    await prisma.payment_transactions.update({
      where: { id: payment.id },
      data: {
        gateway_fee_rate: GOVERNMENT_GATEWAY_FEE_RATE_DEFAULT,
        gateway_fee_amount: fee,
      },
    });
  }

  console.log("Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
