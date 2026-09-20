import { useEffect, useRef, useState } from "react";
import { Button } from "#/components/ui/button.tsx";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "#/components/ui/dialog.tsx";
import { Label } from "#/components/ui/label.tsx";
import {
  type ImportEntity,
  type ImportOutcome,
  importRecords,
} from "#/lib/supabase/data-transfer.ts";

const COLUMNS: Record<ImportEntity, string> = {
  contacts: "Name (required), Email, Phone, Company",
  leads:
    "Title (required), Description, Requirements, Budget, Expected Close Date (YYYY-MM-DD), Company, Contact",
};

interface ImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entity: ImportEntity;
  onImported: () => void;
}

/** US-26: bulk import from a spreadsheet saved as CSV. */
export function ImportDialog({
  open,
  onOpenChange,
  entity,
  onImported,
}: ImportDialogProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<ImportOutcome | null>(null);

  useEffect(() => {
    if (!open) return;
    setFile(null);
    setError(null);
    setOutcome(null);
    setImporting(false);
  }, [open]);

  async function handleImport() {
    if (!file) return;
    setError(null);
    setImporting(true);

    const csv = await file.text();
    const result = await importRecords({ data: { entity, csv } });
    setImporting(false);

    if (!result.success) {
      setError(result.message);
      return;
    }

    setOutcome(result.outcome);
    if (result.outcome.imported > 0) onImported();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Import {entity}</DialogTitle>
          <DialogDescription>
            Save your spreadsheet as CSV, then choose it here.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div>
            <Label htmlFor="import-file">CSV file</Label>
            <input
              ref={inputRef}
              id="import-file"
              type="file"
              accept=".csv,text/csv"
              onChange={(event) => {
                setFile(event.target.files?.[0] ?? null);
                setOutcome(null);
                setError(null);
              }}
              className="mt-1.5 block w-full text-sm text-[var(--ink-soft)] file:mr-3 file:rounded-md file:border file:border-[var(--border)] file:bg-transparent file:px-3 file:py-1.5 file:text-sm file:text-[var(--ink)]"
            />
          </div>

          <p className="text-xs text-[var(--ink-soft)]">
            <span className="font-medium text-[var(--ink)]">Columns:</span>{" "}
            {COLUMNS[entity]}. Column order doesn&rsquo;t matter; extra columns
            are ignored.
          </p>

          {error ? (
            <p role="alert" className="text-sm text-[var(--destructive)]">
              {error}
            </p>
          ) : null}

          {outcome ? (
            <div className="rounded-lg border border-[var(--border)] p-3 text-sm">
              <p className="font-medium text-[var(--ink)]">
                Imported {outcome.imported}{" "}
                {outcome.imported === 1 ? "row" : "rows"}.
              </p>

              {outcome.failed.length > 0 ? (
                <div className="mt-2">
                  <p className="text-xs font-medium uppercase tracking-wide text-[var(--destructive)]">
                    Skipped {outcome.failed.length}
                  </p>
                  <ul className="mt-1 flex max-h-32 flex-col gap-0.5 overflow-y-auto">
                    {outcome.failed.map((item) => (
                      <li
                        key={`fail-${item.row}`}
                        className="text-xs text-[var(--ink-soft)]"
                      >
                        Row {item.row}: {item.reason}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {outcome.warnings.length > 0 ? (
                <div className="mt-2">
                  <p className="text-xs font-medium uppercase tracking-wide text-[var(--ink-soft)]">
                    Warnings
                  </p>
                  <ul className="mt-1 flex max-h-32 flex-col gap-0.5 overflow-y-auto">
                    {outcome.warnings.map((item) => (
                      <li
                        key={`warn-${item.row}`}
                        className="text-xs text-[var(--ink-soft)]"
                      >
                        Row {item.row}: {item.note}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            {outcome ? "Done" : "Cancel"}
          </Button>
          <Button
            type="button"
            onClick={handleImport}
            disabled={!file || importing}
          >
            {importing ? "Importing..." : "Import"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
