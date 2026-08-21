"use client";

import { useEffect, useState } from "react";
import type { CreateEnforcementCaseInput } from "@kenji-government/shared";
import {
  ENFORCEMENT_CASE_NATURES,
  ENFORCEMENT_CASE_PRIORITIES,
  ENFORCEMENT_CASE_TYPES,
} from "@kenji-government/shared";
import { Button } from "@/components/button";
import {
  Dialog,
  DialogBody,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/dialog";
import {
  CASE_NATURE_LABELS,
  CASE_PRIORITY_LABELS,
  CASE_TYPE_LABELS,
} from "@/lib/enforcement";
import { cn } from "@/lib/utils";

const INPUT_CLASS =
  "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20";

const DEFAULT_FORM: CreateEnforcementCaseInput = {
  title: "",
  case_type: "investigation",
  description: "",
  nature: "operational_breach",
  priority: "medium",
  requires_operator_response: true,
  is_internal: false,
  has_allegations: false,
  allegations_summary: "",
  requires_documents: false,
  required_documents: "",
  has_financial_penalty: false,
  fine_amount: "",
  fine_due_by: "",
  fine_payment_notes: "",
  has_supporting_evidence: false,
  supporting_evidence_notes: "",
};

function ToggleField({
  checked,
  onChange,
  title,
  description,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  title: string;
  description: string;
}) {
  return (
    <label className="flex items-start gap-2 rounded-lg border border-border bg-secondary/10 p-3 text-sm">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-1"
      />
      <span>
        <span className="font-medium">{title}</span>
        <span className="mt-0.5 block text-muted-foreground">{description}</span>
      </span>
    </label>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
      {children}
    </p>
  );
}

export function OpenEnforcementCaseDialog({
  open,
  onOpenChange,
  loading,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  loading?: boolean;
  onSubmit: (input: CreateEnforcementCaseInput) => Promise<void>;
}) {
  const [form, setForm] = useState<CreateEnforcementCaseInput>(DEFAULT_FORM);

  function updateField<K extends keyof CreateEnforcementCaseInput>(
    key: K,
    value: CreateEnforcementCaseInput[K],
  ) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function resetAndClose() {
    setForm(DEFAULT_FORM);
    onOpenChange(false);
  }

  useEffect(() => {
    if (form.case_type === "fine" && !form.has_financial_penalty) {
      setForm((current) => ({ ...current, has_financial_penalty: true }));
    }
  }, [form.case_type, form.has_financial_penalty]);

  const penaltyApplies = form.has_financial_penalty || form.case_type === "fine";

  const canSubmit =
    form.title.trim().length >= 3 &&
    form.description.trim().length >= 10 &&
    (!form.has_allegations || (form.allegations_summary?.trim().length ?? 0) >= 10) &&
    (!form.requires_documents || (form.required_documents?.trim().length ?? 0) >= 3) &&
    (!penaltyApplies || (form.fine_amount?.trim().length ?? 0) >= 1) &&
    (!form.has_supporting_evidence ||
      (form.supporting_evidence_notes?.trim().length ?? 0) >= 3);

  async function handleSubmit() {
    if (!canSubmit) return;
    await onSubmit({
      ...form,
      title: form.title.trim(),
      description: form.description.trim(),
      allegations_summary: form.has_allegations
        ? form.allegations_summary?.trim()
        : undefined,
      required_documents: form.requires_documents
        ? form.required_documents?.trim()
        : undefined,
      fine_amount: penaltyApplies ? form.fine_amount?.trim() : undefined,
      fine_due_by: penaltyApplies ? form.fine_due_by?.trim() : undefined,
      fine_payment_notes: penaltyApplies ? form.fine_payment_notes?.trim() : undefined,
      supporting_evidence_notes: form.has_supporting_evidence
        ? form.supporting_evidence_notes?.trim()
        : undefined,
      has_financial_penalty: penaltyApplies,
    });
    setForm(DEFAULT_FORM);
  }

  return (
    <Dialog open={open} onOpenChange={(next) => (!next ? resetAndClose() : onOpenChange(next))}>
      <DialogContent className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden">
        <DialogHeader className="shrink-0">
          <DialogTitle>Open Enforcement Case</DialogTitle>
          <DialogDescription>
            Complete the core case details, then enable only the sections that apply to this matter.
          </DialogDescription>
        </DialogHeader>

        <DialogBody className="min-h-0 flex-1 space-y-5 overflow-y-auto">
          <div className="space-y-4">
            <SectionTitle>Core details</SectionTitle>

            <div>
              <label className="mb-1.5 block text-sm font-medium">Case title</label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => updateField("title", e.target.value)}
                placeholder="e.g. Investigation into non-reporting of June 2026 returns"
                className={INPUT_CLASS}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium">Case type</label>
                <select
                  value={form.case_type}
                  onChange={(e) =>
                    updateField(
                      "case_type",
                      e.target.value as CreateEnforcementCaseInput["case_type"],
                    )
                  }
                  className={INPUT_CLASS}
                >
                  {ENFORCEMENT_CASE_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {CASE_TYPE_LABELS[type]}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium">Nature of issue</label>
                <select
                  value={form.nature}
                  onChange={(e) =>
                    updateField("nature", e.target.value as CreateEnforcementCaseInput["nature"])
                  }
                  className={INPUT_CLASS}
                >
                  {ENFORCEMENT_CASE_NATURES.map((nature) => (
                    <option key={nature} value={nature}>
                      {CASE_NATURE_LABELS[nature]}
                    </option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="mb-1.5 block text-sm font-medium">Priority</label>
                <select
                  value={form.priority}
                  onChange={(e) =>
                    updateField(
                      "priority",
                      e.target.value as CreateEnforcementCaseInput["priority"],
                    )
                  }
                  className={INPUT_CLASS}
                >
                  {ENFORCEMENT_CASE_PRIORITIES.map((priority) => (
                    <option key={priority} value={priority}>
                      {CASE_PRIORITY_LABELS[priority]}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium">
                Case summary <span className="text-danger">*</span>
              </label>
              <textarea
                rows={3}
                value={form.description}
                onChange={(e) => updateField("description", e.target.value)}
                placeholder="Briefly explain why this case is being opened and what GRA is reviewing…"
                className={cn(INPUT_CLASS, "resize-none")}
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Always required — even when there are no formal allegations or document requests.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <SectionTitle>Case handling</SectionTitle>

            <ToggleField
              checked={form.requires_operator_response}
              onChange={(checked) => updateField("requires_operator_response", checked)}
              title="Requires operator response"
              description="The operator must submit an explanation, documents, or a formal reply."
            />

            <ToggleField
              checked={form.is_internal}
              onChange={(checked) => updateField("is_internal", checked)}
              title="Internal investigation only"
              description="Case remains internal until GRA decides to notify the operator."
            />
          </div>

          <div className="space-y-3">
            <SectionTitle>Optional sections</SectionTitle>

            <ToggleField
              checked={form.has_allegations}
              onChange={(checked) => updateField("has_allegations", checked)}
              title="Formal allegations documented"
              description="Enable when specific allegations or suspected breaches need to be recorded."
            />
            {form.has_allegations && (
              <div className="ml-2 border-l-2 border-primary/30 pl-4">
                <label className="mb-1.5 block text-sm font-medium">
                  Allegations / issue details
                </label>
                <textarea
                  rows={4}
                  value={form.allegations_summary ?? ""}
                  onChange={(e) => updateField("allegations_summary", e.target.value)}
                  placeholder="Describe what is suspected, inaccurate, missing, or under review…"
                  className={cn(INPUT_CLASS, "resize-none")}
                />
              </div>
            )}

            <ToggleField
              checked={form.requires_documents}
              onChange={(checked) => updateField("requires_documents", checked)}
              title="Request documents or evidence from operator"
              description="Enable when the operator must submit specific records or supporting files."
            />
            {form.requires_documents && (
              <div className="ml-2 border-l-2 border-primary/30 pl-4">
                <label className="mb-1.5 block text-sm font-medium">
                  Required documents or evidence
                </label>
                <textarea
                  rows={3}
                  value={form.required_documents ?? ""}
                  onChange={(e) => updateField("required_documents", e.target.value)}
                  placeholder="e.g. Monthly return, bank statement, audit trail, correspondence…"
                  className={cn(INPUT_CLASS, "resize-none")}
                />
              </div>
            )}

            <ToggleField
              checked={penaltyApplies}
              onChange={(checked) => {
                updateField("has_financial_penalty", checked);
                if (form.case_type === "fine" && !checked) {
                  updateField("case_type", "investigation");
                }
              }}
              title="Financial penalty applies"
              description="Enable when a fine or financial penalty is being imposed as part of this case."
            />
            {penaltyApplies && (
              <div className="ml-2 space-y-3 border-l-2 border-primary/30 pl-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium">
                      Penalty amount (KES)
                    </label>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={form.fine_amount ?? ""}
                      onChange={(e) => updateField("fine_amount", e.target.value)}
                      placeholder="e.g. 500000"
                      className={INPUT_CLASS}
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium">Payment due by</label>
                    <input
                      type="date"
                      value={form.fine_due_by ?? ""}
                      onChange={(e) => updateField("fine_due_by", e.target.value)}
                      className={INPUT_CLASS}
                    />
                  </div>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium">
                    Payment instructions (optional)
                  </label>
                  <textarea
                    rows={2}
                    value={form.fine_payment_notes ?? ""}
                    onChange={(e) => updateField("fine_payment_notes", e.target.value)}
                    placeholder="Reference number, payment channel, or special instructions…"
                    className={cn(INPUT_CLASS, "resize-none")}
                  />
                </div>
              </div>
            )}

            <ToggleField
              checked={form.has_supporting_evidence}
              onChange={(checked) => updateField("has_supporting_evidence", checked)}
              title="Supporting evidence already on file"
              description="Enable when GRA already holds documents, audit material, or investigation evidence."
            />
            {form.has_supporting_evidence && (
              <div className="ml-2 border-l-2 border-primary/30 pl-4">
                <label className="mb-1.5 block text-sm font-medium">Evidence on file</label>
                <textarea
                  rows={3}
                  value={form.supporting_evidence_notes ?? ""}
                  onChange={(e) => updateField("supporting_evidence_notes", e.target.value)}
                  placeholder="Describe what evidence GRA already holds (reports, statements, correspondence…)…"
                  className={cn(INPUT_CLASS, "resize-none")}
                />
              </div>
            )}
          </div>
        </DialogBody>

        <DialogFooter className="shrink-0">
          <DialogClose asChild>
            <Button variant="outline" size="sm" onClick={resetAndClose}>
              Cancel
            </Button>
          </DialogClose>
          <Button size="sm" loading={loading} disabled={!canSubmit} onClick={handleSubmit}>
            Open Case
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
