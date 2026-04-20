import { useState, useRef, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Folder,
  FolderPlus,
  FileText,
  Upload,
  Trash2,
  Pencil,
  ArrowLeft,
  Download,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";

const BUCKET = "formatos";

type Entry = {
  name: string;
  isFolder: boolean;
  size?: number;
  updated_at?: string;
};

type UploadProgress = {
  name: string;
  progress: number;
  status: "uploading" | "done" | "error";
  error?: string;
};

export function StorageManager() {
  const qc = useQueryClient();
  const [path, setPath] = useState<string>(""); // current prefix, no leading/trailing slash
  const [uploads, setUploads] = useState<UploadProgress[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [renameTarget, setRenameTarget] = useState<Entry | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<Entry | null>(null);
  const [createFolderOpen, setCreateFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: entries = [], isLoading, refetch } = useQuery({
    queryKey: ["storage", BUCKET, path],
    queryFn: async () => {
      const { data, error } = await supabase.storage
        .from(BUCKET)
        .list(path || undefined, {
          limit: 1000,
          sortBy: { column: "name", order: "asc" },
        });
      if (error) throw error;
      // Folders: entries where id is null OR name has no extension and metadata is null
      const result: Entry[] = (data ?? [])
        .filter((e) => e.name !== ".emptyFolderPlaceholder")
        .map((e) => ({
          name: e.name,
          isFolder: e.id === null,
          size: (e.metadata as any)?.size,
          updated_at: e.updated_at ?? undefined,
        }));
      // Folders first
      result.sort((a, b) => {
        if (a.isFolder !== b.isFolder) return a.isFolder ? -1 : 1;
        return a.name.localeCompare(b.name);
      });
      return result;
    },
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["storage", BUCKET] });

  const segments = path ? path.split("/") : [];

  const goTo = (idx: number) => {
    if (idx < 0) setPath("");
    else setPath(segments.slice(0, idx + 1).join("/"));
  };

  const enterFolder = (name: string) => {
    setPath(path ? `${path}/${name}` : name);
  };

  const fullPath = (name: string) => (path ? `${path}/${name}` : name);

  // ---------- Upload ----------
  const uploadFiles = useCallback(
    async (files: File[]) => {
      if (files.length === 0) return;
      const initial: UploadProgress[] = files.map((f) => ({
        name: f.name,
        progress: 0,
        status: "uploading",
      }));
      setUploads((prev) => [...prev, ...initial]);

      await Promise.all(
        files.map(async (file) => {
          const target = fullPath(file.name);
          try {
            const { error } = await supabase.storage
              .from(BUCKET)
              .upload(target, file, { upsert: true, contentType: file.type });
            if (error) throw error;
            setUploads((prev) =>
              prev.map((u) =>
                u.name === file.name ? { ...u, progress: 100, status: "done" } : u
              )
            );
          } catch (e: any) {
            setUploads((prev) =>
              prev.map((u) =>
                u.name === file.name
                  ? { ...u, status: "error", error: e.message ?? "Error" }
                  : u
              )
            );
            toast.error(`Error subiendo ${file.name}: ${e.message ?? ""}`);
          }
        })
      );
      toast.success(`${files.length} archivo(s) procesados`);
      invalidate();
      // auto-clear successful uploads after a delay
      setTimeout(() => {
        setUploads((prev) => prev.filter((u) => u.status === "error"));
      }, 3000);
    },
    [path]
  );

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    uploadFiles(files);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    uploadFiles(files);
  };

  // ---------- Create folder ----------
  const createFolder = async () => {
    const name = newFolderName.trim();
    if (!name) return;
    if (name.includes("/")) {
      toast.error("El nombre no puede contener '/'");
      return;
    }
    try {
      // Supabase folders are virtual; create a placeholder file
      const placeholder = path
        ? `${path}/${name}/.emptyFolderPlaceholder`
        : `${name}/.emptyFolderPlaceholder`;
      const { error } = await supabase.storage
        .from(BUCKET)
        .upload(placeholder, new Blob([""]), { upsert: true });
      if (error) throw error;
      toast.success(`Carpeta '${name}' creada`);
      setCreateFolderOpen(false);
      setNewFolderName("");
      invalidate();
    } catch (e: any) {
      toast.error(e.message ?? "Error al crear carpeta");
    }
  };

  // ---------- Rename ----------
  const openRename = (entry: Entry) => {
    setRenameTarget(entry);
    setRenameValue(entry.name);
  };

  const doRename = async () => {
    if (!renameTarget) return;
    const newName = renameValue.trim();
    if (!newName || newName === renameTarget.name) {
      setRenameTarget(null);
      return;
    }
    if (newName.includes("/")) {
      toast.error("El nombre no puede contener '/'");
      return;
    }
    try {
      if (renameTarget.isFolder) {
        // Move all files inside the folder
        const oldPrefix = fullPath(renameTarget.name);
        const newPrefix = fullPath(newName);
        const allFiles = await listAllRecursive(oldPrefix);
        if (allFiles.length === 0) {
          toast.error("Carpeta vacía o no accesible");
          return;
        }
        for (const f of allFiles) {
          const dest = newPrefix + f.substring(oldPrefix.length);
          const { error } = await supabase.storage.from(BUCKET).move(f, dest);
          if (error) throw error;
        }
        toast.success(`Carpeta renombrada a '${newName}'`);
      } else {
        const from = fullPath(renameTarget.name);
        const to = fullPath(newName);
        const { error } = await supabase.storage.from(BUCKET).move(from, to);
        if (error) throw error;
        toast.success(`Archivo renombrado a '${newName}'`);
      }
      setRenameTarget(null);
      invalidate();
    } catch (e: any) {
      toast.error(e.message ?? "Error al renombrar");
    }
  };

  // ---------- Delete ----------
  const doDelete = async () => {
    if (!deleteTarget) return;
    try {
      if (deleteTarget.isFolder) {
        const prefix = fullPath(deleteTarget.name);
        const allFiles = await listAllRecursive(prefix);
        if (allFiles.length > 0) {
          const { error } = await supabase.storage.from(BUCKET).remove(allFiles);
          if (error) throw error;
        }
        toast.success(`Carpeta '${deleteTarget.name}' eliminada (${allFiles.length} archivos)`);
      } else {
        const target = fullPath(deleteTarget.name);
        const { error } = await supabase.storage.from(BUCKET).remove([target]);
        if (error) throw error;
        toast.success(`Archivo '${deleteTarget.name}' eliminado`);
      }
      setDeleteTarget(null);
      invalidate();
    } catch (e: any) {
      toast.error(e.message ?? "Error al eliminar");
    }
  };

  // Recursively list all file paths under a prefix
  const listAllRecursive = async (prefix: string): Promise<string[]> => {
    const results: string[] = [];
    const stack = [prefix];
    while (stack.length > 0) {
      const current = stack.pop()!;
      const { data, error } = await supabase.storage
        .from(BUCKET)
        .list(current, { limit: 1000 });
      if (error) throw error;
      for (const item of data ?? []) {
        const itemPath = `${current}/${item.name}`;
        if (item.id === null) {
          stack.push(itemPath);
        } else {
          results.push(itemPath);
        }
      }
    }
    return results;
  };

  const downloadFile = async (entry: Entry) => {
    const target = fullPath(entry.name);
    const { data } = supabase.storage.from(BUCKET).getPublicUrl(target);
    window.open(data.publicUrl, "_blank");
  };

  const formatBytes = (bytes?: number) => {
    if (!bytes) return "—";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1 text-sm">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => goTo(-1)}
            className="h-7 px-2"
          >
            <Folder className="h-3.5 w-3.5" />
            formatos
          </Button>
          {segments.map((seg, i) => (
            <span key={i} className="flex items-center gap-1">
              <span className="text-muted-foreground">/</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => goTo(i)}
                className="h-7 px-2"
              >
                {seg}
              </Button>
            </span>
          ))}
        </div>
        <div className="ml-auto flex gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCreateFolderOpen(true)}
          >
            <FolderPlus className="h-3.5 w-3.5" />
            Nueva carpeta
          </Button>
          <Button size="sm" onClick={() => fileInputRef.current?.click()}>
            <Upload className="h-3.5 w-3.5" />
            Subir
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="application/pdf,.pdf"
            className="hidden"
            onChange={handleFileInput}
          />
        </div>
      </div>

      {/* Drop zone + file list */}
      <Card
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={`min-h-[300px] transition-colors ${
          dragOver ? "border-primary bg-primary/5 border-2 border-dashed" : ""
        }`}
      >
        {dragOver && (
          <div className="p-12 text-center text-sm text-primary font-medium">
            <Upload className="h-8 w-8 mx-auto mb-2" />
            Suelta los archivos aquí para subirlos a /{path || "raíz"}
          </div>
        )}
        {!dragOver && (
          <div className="divide-y">
            {isLoading && (
              <div className="p-6 text-center text-sm text-muted-foreground">
                Cargando...
              </div>
            )}
            {!isLoading && entries.length === 0 && (
              <div className="p-12 text-center text-sm text-muted-foreground">
                Carpeta vacía. Arrastra archivos aquí o usa el botón "Subir".
              </div>
            )}
            {entries.map((entry) => (
              <div
                key={entry.name}
                className="flex items-center gap-3 px-3 py-2 hover:bg-muted/40 group"
              >
                {entry.isFolder ? (
                  <Folder className="h-4 w-4 text-primary shrink-0" />
                ) : (
                  <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                )}
                <button
                  className="flex-1 text-left text-sm truncate hover:underline"
                  onClick={() => entry.isFolder && enterFolder(entry.name)}
                >
                  {entry.name}
                </button>
                {!entry.isFolder && (
                  <Badge variant="outline" className="text-xs">
                    {formatBytes(entry.size)}
                  </Badge>
                )}
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {!entry.isFolder && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0"
                      onClick={() => downloadFile(entry)}
                      title="Descargar"
                    >
                      <Download className="h-3.5 w-3.5" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0"
                    onClick={() => openRename(entry)}
                    title="Renombrar"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 text-destructive"
                    onClick={() => setDeleteTarget(entry)}
                    title="Eliminar"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Upload progress */}
      {uploads.length > 0 && (
        <Card className="p-3 space-y-2">
          <div className="text-xs font-medium text-muted-foreground">
            Subidas ({uploads.length})
          </div>
          {uploads.map((u) => (
            <div key={u.name} className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="truncate">{u.name}</span>
                <span
                  className={
                    u.status === "error"
                      ? "text-destructive"
                      : u.status === "done"
                      ? "text-primary"
                      : "text-muted-foreground"
                  }
                >
                  {u.status === "done"
                    ? "Completado"
                    : u.status === "error"
                    ? u.error ?? "Error"
                    : "Subiendo..."}
                </span>
              </div>
              <Progress
                value={u.status === "done" ? 100 : u.status === "error" ? 0 : 50}
                className="h-1"
              />
            </div>
          ))}
        </Card>
      )}

      {/* Create folder dialog */}
      <Dialog open={createFolderOpen} onOpenChange={setCreateFolderOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nueva carpeta</DialogTitle>
          </DialogHeader>
          <Input
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            placeholder="Nombre de la carpeta"
            onKeyDown={(e) => e.key === "Enter" && createFolder()}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateFolderOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={createFolder}>Crear</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rename dialog */}
      <Dialog open={!!renameTarget} onOpenChange={(o) => !o && setRenameTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Renombrar {renameTarget?.isFolder ? "carpeta" : "archivo"}
            </DialogTitle>
          </DialogHeader>
          <Input
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && doRename()}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameTarget(null)}>
              Cancelar
            </Button>
            <Button onClick={doRename}>Renombrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              ¿Eliminar {deleteTarget?.isFolder ? "carpeta" : "archivo"} '
              {deleteTarget?.name}'?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget?.isFolder
                ? "Se eliminarán todos los archivos contenidos. Esta acción no se puede deshacer."
                : "Esta acción no se puede deshacer."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={doDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}