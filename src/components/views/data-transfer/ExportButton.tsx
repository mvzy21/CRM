import { Download } from "lucide-react";
import { useState } from "react";
import { Button } from "#/components/ui/button.tsx";
import {
  type ExportEntity,
  exportRecords,
} from "#/lib/supabase/data-transfer.ts";

interface ExportButtonProps {
  entity: ExportEntity;
  onError: (message: string) => void;
}

/** US-27: download the current records as CSV (opens directly in Excel). */
export function ExportButton({ entity, onError }: ExportButtonProps) {
  const [exporting, setExporting] = useState(false);

  async function handleExport() {
    setExporting(true);
    const result = await exportRecords({ data: { entity } });
    setExporting(false);

    if (!result.success) {
      onError(result.message);
      return;
    }

    // Excel only honours UTF-8 in a CSV when it starts with a BOM; without
    // it, names with accents arrive mangled.
    const blob = new Blob([`﻿${result.csv}`], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = result.filename;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Button variant="outline" onClick={handleExport} disabled={exporting}>
      <Download className="h-4 w-4" />
      {exporting ? "Exporting..." : "Export CSV"}
    </Button>
  );
}
