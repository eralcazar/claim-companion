import { useState, useRef, useMemo } from "react";
import Papa from "papaparse";
import { Upload, FileText, Download, AlertCircle, CheckCircle2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

export type CSVValidationResult<T> = {
  ok: boolean;
  row: T | null;
  errors: string[];
};

interface Props<T> {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  templateHeaders: string[];
  templateExampleRow?: string[];
  templateFilename: string;
  parseRow: (raw: Record<string, string>, index: number) => CSVValidationResult<T>;
  previewColumns: { key: string; label: string }[];
  rowToPreview: (row: T) => Record<string, any>;
  onImport: (rows: T[]) => Promise<void> | void;
  isImporting?: boolean;
}

export function CSVImportDialog<T>({
  open,
  onOpenChange,
  title,
  description,
  templateHeaders,
  templateExampleRow,
  templateFilename,
  parseRow,
  previewColumns,
  rowToPreview,
  onImport,
  isImporting,
}: Props<T>) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [filename, setFilename] = useState<string | null>(null);
  const [results, setResults] = useState<CSVValidationResult<T>[]>([]);

  const validRows = useMemo(
    () => results.filter((r) => r.ok).map((r) => r.row as T),
    [results],
  );
  const invalidCount = results.length - validRows.length;

  const reset = () => {
    setFilename(null);
    setResults([]);
    if (inputRef.current) inputRef.current.value = "";
  };

  const handleClose = (next: boolean) => {
    if (!next) reset();
    onOpenChange(next);
  };

  const handleFile = (file: File) => {
    setFilename(file.name);
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h.trim(),
      complete: (res) => {
        const parsed = res.data
          .filter((r) => Object.values(r).some((v) => (v ?? "").toString().trim() !== ""))
          .map((raw, i) => parseRow(raw, i));
        setResults(parsed);
      },
      error: (err) => {
        setResults([{ ok: false, row: null, errors: [`Error al leer CSV: ${err.message}`] }]);
      },
    });
  };

  const downloadTemplate = () => {
    const lines = [templateHeaders.join(",")];
    if (templateExampleRow) lines.push(templateExampleRow.join(","));
    const csv = lines.join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = templateFilename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const doImport = async () => {
    if (validRows.length === 0) return;
    await onImport(validRows);
    handleClose(false);
  };

  const previewRows = results.slice(0, 10);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={downloadTemplate}>
            <Download className="h-4 w-4" />
            Descargar plantilla
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => inputRef.current?.click()}
          >
            <Upload className="h-4 w-4" />
            Seleccionar archivo CSV
          </Button>
          <input
            ref={inputRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
            }}
          />
          {filename && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <FileText className="h-4 w-4" />
              {filename}
            </div>
          )}
        </div>

        {results.length > 0 && (
          <div className="flex flex-wrap gap-2 text-sm">
            <Badge variant="default" className="gap-1">
              <CheckCircle2 className="h-3 w-3" />
              {validRows.length} válidas
            </Badge>
            {invalidCount > 0 && (
              <Badge variant="destructive" className="gap-1">
                <AlertCircle className="h-3 w-3" />
                {invalidCount} con errores (se omitirán)
              </Badge>
            )}
          </div>
        )}

        {results.length > 0 && (
          <ScrollArea className="flex-1 rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead className="w-20">Estado</TableHead>
                  {previewColumns.map((c) => (
                    <TableHead key={c.key}>{c.label}</TableHead>
                  ))}
                  <TableHead>Errores</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {previewRows.map((r, idx) => {
                  const preview = r.row ? rowToPreview(r.row) : {};
                  return (
                    <TableRow key={idx} className={r.ok ? "" : "bg-destructive/5"}>
                      <TableCell className="text-xs text-muted-foreground">
                        {idx + 1}
                      </TableCell>
                      <TableCell>
                        {r.ok ? (
                          <Badge variant="default" className="text-xs">OK</Badge>
                        ) : (
                          <Badge variant="destructive" className="text-xs">Error</Badge>
                        )}
                      </TableCell>
                      {previewColumns.map((c) => (
                        <TableCell key={c.key} className="text-xs">
                          {preview[c.key] ?? "—"}
                        </TableCell>
                      ))}
                      <TableCell className="text-xs text-destructive">
                        {r.errors.join(", ")}
                      </TableCell>
                    </TableRow>
                  );
                })}
                {results.length > 10 && (
                  <TableRow>
                    <TableCell
                      colSpan={previewColumns.length + 3}
                      className="text-center text-xs text-muted-foreground py-2"
                    >
                      … y {results.length - 10} filas más
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => handleClose(false)}>
            Cancelar
          </Button>
          <Button
            onClick={doImport}
            disabled={validRows.length === 0 || isImporting}
          >
            <Upload className="h-4 w-4" />
            Importar {validRows.length} filas
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}