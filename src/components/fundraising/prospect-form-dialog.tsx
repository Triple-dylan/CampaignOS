"use client";

import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { createFundraisingProspectAction } from "@/actions/fundraising";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  PROSPECT_STATUS_LABELS,
  PROSPECT_TYPE_LABELS,
  prospectStatusSchema,
  prospectTypeSchema,
  type ProspectStatus,
  type ProspectType,
} from "@/lib/validators/fundraising";

type ProspectFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  topIssues?: string[];
  onSuccess?: () => void;
};

const PROSPECT_TYPES = prospectTypeSchema.options;
const PROSPECT_STATUSES = prospectStatusSchema.options;
const CAPACITY_PRESETS = [1000, 2500, 5000, 10000, 25000] as const;

export function ProspectFormDialog({
  open,
  onOpenChange,
  topIssues = [],
  onSuccess,
}: ProspectFormDialogProps) {
  const [name, setName] = useState("");
  const [prospectType, setProspectType] = useState<ProspectType>("individual");
  const [organizationName, setOrganizationName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [relatedIssue, setRelatedIssue] = useState("");
  const [estimatedCapacity, setEstimatedCapacity] = useState("");
  const [alignmentReason, setAlignmentReason] = useState("");
  const [status, setStatus] = useState<ProspectStatus>("research");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function resetForm() {
    setName("");
    setProspectType("individual");
    setOrganizationName("");
    setEmail("");
    setPhone("");
    setRelatedIssue("");
    setEstimatedCapacity("");
    setAlignmentReason("");
    setStatus("research");
    setNotes("");
    setError(null);
  }

  function handleOpenChange(next: boolean) {
    if (!next) {
      resetForm();
    }
    onOpenChange(next);
  }

  function handleSubmit() {
    setError(null);
    startTransition(async () => {
      const capacityValue = estimatedCapacity.trim()
        ? Number(estimatedCapacity.replace(/,/g, ""))
        : null;

      const result = await createFundraisingProspectAction({
        name: name.trim(),
        prospectType,
        organizationName: organizationName.trim() || null,
        email: email.trim() || null,
        phone: phone.trim() || null,
        relatedIssue: relatedIssue.trim() || null,
        estimatedCapacity:
          capacityValue != null && !Number.isNaN(capacityValue)
            ? capacityValue
            : null,
        alignmentReason: alignmentReason.trim() || null,
        status,
        notes: notes.trim() || null,
      });

      if (!result.ok) {
        setError(result.error);
        return;
      }

      resetForm();
      onOpenChange(false);
      onSuccess?.();
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add prospect</DialogTitle>
          <DialogDescription>
            Track donors, hosts, and community leaders in your fundraising
            pipeline.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[60vh] space-y-4 overflow-y-auto pr-1">
          <div className="space-y-2">
            <Label htmlFor="prospect-name">Name</Label>
            <Input
              id="prospect-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Jane Smith"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="prospect-type">Type</Label>
              <Select
                id="prospect-type"
                value={prospectType}
                onChange={(event) =>
                  setProspectType(event.target.value as ProspectType)
                }
              >
                {PROSPECT_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {PROSPECT_TYPE_LABELS[type]}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="prospect-status">Status</Label>
              <Select
                id="prospect-status"
                value={status}
                onChange={(event) =>
                  setStatus(event.target.value as ProspectStatus)
                }
              >
                {PROSPECT_STATUSES.map((value) => (
                  <option key={value} value={value}>
                    {PROSPECT_STATUS_LABELS[value]}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="prospect-org">Organization</Label>
            <Input
              id="prospect-org"
              value={organizationName}
              onChange={(event) => setOrganizationName(event.target.value)}
              placeholder="Optional"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="prospect-email">Email</Label>
              <Input
                id="prospect-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="prospect-phone">Phone</Label>
              <Input
                id="prospect-phone"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="prospect-issue">Related issue</Label>
              {topIssues.length > 0 ? (
                <Select
                  id="prospect-issue"
                  value={relatedIssue}
                  onChange={(event) => setRelatedIssue(event.target.value)}
                >
                  <option value="">None</option>
                  {topIssues.map((issue) => (
                    <option key={issue} value={issue}>
                      {issue}
                    </option>
                  ))}
                </Select>
              ) : (
                <Input
                  id="prospect-issue"
                  value={relatedIssue}
                  onChange={(event) => setRelatedIssue(event.target.value)}
                  placeholder="Housing, climate, etc."
                />
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="prospect-capacity">Est. capacity ($)</Label>
              <div className="flex flex-wrap gap-2">
                {CAPACITY_PRESETS.map((amount) => (
                  <button
                    key={amount}
                    type="button"
                    onClick={() => setEstimatedCapacity(String(amount))}
                    className={cn(
                      "rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
                      estimatedCapacity === String(amount)
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-background/60 hover:bg-muted",
                    )}
                  >
                    ${amount.toLocaleString()}
                  </button>
                ))}
              </div>
              <Input
                id="prospect-capacity"
                inputMode="numeric"
                value={estimatedCapacity}
                onChange={(event) => setEstimatedCapacity(event.target.value)}
                placeholder="Custom amount"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="prospect-alignment">Alignment reason</Label>
            <textarea
              id="prospect-alignment"
              className="flex min-h-16 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
              value={alignmentReason}
              onChange={(event) => setAlignmentReason(event.target.value)}
              placeholder="Why this prospect may support the campaign"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="prospect-notes">Notes</Label>
            <textarea
              id="prospect-notes"
              className="flex min-h-16 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
            />
          </div>

          {error ? (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={isPending || !name.trim()}
          >
            {isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              "Add prospect"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
