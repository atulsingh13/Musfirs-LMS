import { useMemo, useRef, useState } from "react";
import Papa from "papaparse";
import { FileUp, Loader2, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  bulkImportLeads,
  getLeadErrorMessage,
  type BulkImportLeadInput,
} from "@/services/lead-api";
import { cn } from "@/lib/utils";

const SKIP_VALUE = "__skip__";

type CrmFieldKey =
  | "name"
  | "contactNumber"
  | "destination"
  | "email"
  | "numberOfPax"
  | "leadSource"
  | "city"
  | "dateOfTravel"
  | "campaign";

interface CrmFieldDef {
  key: CrmFieldKey;
  label: string;
  required: boolean;
}

const CRM_FIELDS: CrmFieldDef[] = [
  { key: "name", label: "Name", required: true },
  { key: "contactNumber", label: "Contact", required: true },
  { key: "destination", label: "Destination", required: true },
  { key: "email", label: "Email", required: false },
  { key: "numberOfPax", label: "Pax", required: false },
  { key: "leadSource", label: "Lead Source", required: false },
  { key: "city", label: "City", required: false },
  { key: "dateOfTravel", label: "Date of Travel", required: false },
  { key: "campaign", label: "Campaign", required: false },
];

type FieldMapping = Record<CrmFieldKey, string>;

function emptyMapping(): FieldMapping {
  return {
    name: SKIP_VALUE,
    contactNumber: SKIP_VALUE,
    destination: SKIP_VALUE,
    email: SKIP_VALUE,
    numberOfPax: SKIP_VALUE,
    leadSource: SKIP_VALUE,
    city: SKIP_VALUE,
    dateOfTravel: SKIP_VALUE,
    campaign: SKIP_VALUE,
  };
}

function guessMapping(headers: string[]): FieldMapping {
  const mapping = emptyMapping();
  const normalized = headers.map((h) => ({
    raw: h,
    key: h.trim().toLowerCase().replace(/[\s_-]+/g, ""),
  }));

  const find = (...aliases: string[]) =>
    normalized.find((h) => aliases.includes(h.key))?.raw ?? SKIP_VALUE;

  mapping.name = find("name", "fullname", "fullnamename", "leadname", "clientname");
  mapping.contactNumber = find(
    "contact",
    "contactnumber",
    "phone",
    "phonenumber",
    "mobile",
    "mobilenumber"
  );
  mapping.destination = find("destination", "place", "location");
  mapping.email = find("email", "emailid", "mail");
  mapping.numberOfPax = find("pax", "numberofpax", "passengers", "travellers");
  mapping.leadSource = find("leadsource", "source");
  mapping.city = find("city");
  mapping.dateOfTravel = find(
    "dateoftravel",
    "traveldate",
    "departuredate",
    "travel"
  );
  mapping.campaign = find("campaign");
  return mapping;
}

function mapRowsToLeads(
  rows: Record<string, string>[],
  mapping: FieldMapping
): BulkImportLeadInput[] {
  return rows.map((row) => {
    const get = (field: CrmFieldKey) => {
      const col = mapping[field];
      if (!col || col === SKIP_VALUE) return undefined;
      const value = row[col];
      if (value === undefined || value === null) return undefined;
      const trimmed = String(value).trim();
      return trimmed || undefined;
    };

    const lead: BulkImportLeadInput = {
      name: get("name") ?? "",
      contactNumber: get("contactNumber") ?? "",
      destination: get("destination") ?? "",
    };

    const email = get("email");
    if (email) lead.email = email;

    const pax = get("numberOfPax");
    if (pax) lead.numberOfPax = Number(pax) || undefined;

    const leadSource = get("leadSource");
    if (leadSource) lead.leadSource = leadSource;

    const city = get("city");
    if (city) lead.city = city;

    const dateOfTravel = get("dateOfTravel");
    if (dateOfTravel) lead.dateOfTravel = dateOfTravel;

    const campaign = get("campaign");
    if (campaign) lead.campaign = campaign;

    return lead;
  });
}

export interface ImportLeadsResult {
  imported: number;
  skipped: number;
}

interface ImportLeadsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (result: ImportLeadsResult) => void;
}

type Step = "upload" | "mapping" | "confirm";

export function ImportLeadsModal({
  open,
  onOpenChange,
  onSuccess,
}: ImportLeadsModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<Step>("upload");
  const [fileName, setFileName] = useState("");
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [mapping, setMapping] = useState<FieldMapping>(emptyMapping());
  const [isSubmitting, setIsSubmitting] = useState(false);

  function resetState() {
    setStep("upload");
    setFileName("");
    setHeaders([]);
    setRows([]);
    setMapping(emptyMapping());
    setIsSubmitting(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handleOpenChange(next: boolean) {
    if (!next) resetState();
    onOpenChange(next);
  }

  function handleFileChange(file: File | null) {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".csv")) {
      toast.error("Please upload a .csv file");
      return;
    }

    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (result) => {
        const fields = (result.meta.fields ?? []).filter(Boolean);
        if (fields.length === 0) {
          toast.error("Could not read CSV headers");
          return;
        }
        if (!result.data.length) {
          toast.error("CSV has no data rows");
          return;
        }
        setFileName(file.name);
        setHeaders(fields);
        setRows(result.data);
        setMapping(guessMapping(fields));
        setStep("mapping");
      },
      error: () => {
        toast.error("Failed to parse CSV file");
      },
    });
  }

  const requiredMapped = useMemo(
    () =>
      CRM_FIELDS.filter((f) => f.required).every(
        (f) => mapping[f.key] && mapping[f.key] !== SKIP_VALUE
      ),
    [mapping]
  );

  const previewLeads = useMemo(
    () => mapRowsToLeads(rows.slice(0, 3), mapping),
    [rows, mapping]
  );

  async function handleSubmit() {
    if (!requiredMapped) {
      toast.error("Map all required fields before importing");
      return;
    }

    const leads = mapRowsToLeads(rows, mapping).filter(
      (lead) => lead.name && lead.contactNumber && lead.destination
    );

    if (leads.length === 0) {
      toast.error("No valid rows to import after mapping");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await bulkImportLeads(leads);
      const imported = response.data?.imported ?? 0;
      const skipped = response.data?.skipped ?? 0;
      onSuccess({ imported, skipped });
      handleOpenChange(false);
    } catch (error) {
      toast.error(getLeadErrorMessage(error, "Failed to import leads"));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Import Leads from CSV</DialogTitle>
          <DialogDescription>
            Upload a CSV, map columns to CRM fields, then import. Duplicate
            contact numbers are skipped automatically.
          </DialogDescription>
        </DialogHeader>

        {step === "upload" ? (
          <div className="space-y-4 py-2">
            <button
              type="button"
              className={cn(
                "flex w-full flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border bg-muted/30 px-6 py-10 text-center transition-colors hover:bg-muted/50"
              )}
              onClick={() => fileInputRef.current?.click()}
            >
              <span className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Upload className="size-5" />
              </span>
              <div>
                <p className="text-sm font-medium text-foreground">
                  Choose a CSV file
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Headers in the first row will be used for field mapping
                </p>
              </div>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) =>
                handleFileChange(e.target.files?.[0] ?? null)
              }
            />
          </div>
        ) : null}

        {step === "mapping" ? (
          <div className="space-y-4 py-2">
            <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm">
              <FileUp className="size-4 shrink-0 text-muted-foreground" />
              <span className="min-w-0 truncate font-medium">{fileName}</span>
              <span className="ml-auto shrink-0 text-xs text-muted-foreground">
                {rows.length} row{rows.length === 1 ? "" : "s"}
              </span>
            </div>

            <div className="space-y-3">
              <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                Field mapping
              </p>
              {CRM_FIELDS.map((field) => (
                <div
                  key={field.key}
                  className="grid grid-cols-1 items-center gap-2 sm:grid-cols-2"
                >
                  <Label className="text-sm">
                    {field.label}
                    {field.required ? (
                      <span className="text-destructive"> *</span>
                    ) : null}
                  </Label>
                  <Select
                    value={mapping[field.key]}
                    onValueChange={(value) => {
                      if (!value) return;
                      setMapping((prev) => ({ ...prev, [field.key]: value }));
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select CSV column" />
                    </SelectTrigger>
                    <SelectContent>
                      {!field.required ? (
                        <SelectItem value={SKIP_VALUE}>— Skip —</SelectItem>
                      ) : null}
                      {headers.map((header) => (
                        <SelectItem key={header} value={header}>
                          {header}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {step === "confirm" ? (
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              Ready to import{" "}
              <span className="font-medium text-foreground">{rows.length}</span>{" "}
              row{rows.length === 1 ? "" : "s"} using only the mapped columns.
            </p>
            <div className="rounded-lg border border-border bg-muted/20 p-3">
              <p className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                Preview (first {previewLeads.length})
              </p>
              <ul className="space-y-2 text-sm">
                {previewLeads.map((lead, index) => (
                  <li
                    key={`${lead.contactNumber}-${index}`}
                    className="rounded-md border border-border/60 bg-background px-3 py-2"
                  >
                    <span className="font-medium">{lead.name || "—"}</span>
                    <span className="text-muted-foreground">
                      {" "}
                      · {lead.contactNumber || "—"} ·{" "}
                      {lead.destination || "—"}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ) : null}

        <DialogFooter>
          {step === "upload" ? (
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
            >
              Cancel
            </Button>
          ) : null}

          {step === "mapping" ? (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  resetState();
                  setStep("upload");
                }}
                disabled={isSubmitting}
              >
                Back
              </Button>
              <Button
                type="button"
                disabled={!requiredMapped}
                onClick={() => setStep("confirm")}
              >
                Continue
              </Button>
            </>
          ) : null}

          {step === "confirm" ? (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep("mapping")}
                disabled={isSubmitting}
              >
                Back
              </Button>
              <Button
                type="button"
                onClick={() => void handleSubmit()}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" />
                    Importing…
                  </>
                ) : (
                  "Import Leads"
                )}
              </Button>
            </>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default ImportLeadsModal;
