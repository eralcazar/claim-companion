import { useRef, useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  FileText,
  Upload,
  FolderPlus,
  RefreshCw,
  Download,
  Pencil,
  Trash2,
} from "lucide-react";
import { useAseguradoras, useFormularios, type Formulario } from "@/hooks/useFormatos";
import { useStorageFormatos } from "@/hooks/useStorageFormatos";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { toast } from "sonner";

interface Props {
  selectedId: string | null;
  onSelect: (form: Formulario) => void;
}

type RenameTarget = {
  path: string;
  name: string;
  isFolder: boolean;
};

type DeleteTarget = RenameTarget;

export function InsurerTree({ selectedId, onSelect }: Props) {
  const { data: aseguradoras, isLoading: loadingA } = useAseguradoras();
  const { data: formularios, isLoading: loadingF } = useFormularios();
  const {
    uploads,
    uploadFiles,
    replaceFile,
    createFolder,
    renameItem,
    deleteItem,
    downloadFile,
    refresh,
  } = useStorageFormatos();

  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [dragOverPath, setDragOverPath] = useState<string | null>(null);

  // root upload + folder
  const rootInputRef = useRef<HTMLInputElement>(null);
  const [rootFolderOpen, setRootFolderOpen] = useState(false);
  const [rootFolderName, setRootFolderName] = useState("");

  // per-insurer upload
  const insurerInputRef = useRef<HTMLInputElement>(null);
  const [insurerUploadTarget, setInsurerUploadTarget] = useState<string | null>(null);

  // per-form replace upload
  const replaceInputRef = useRef<HTMLInputElement>(null);
  const [replaceTarget, setReplaceTarget] = useState<string | null>(null);

  // create subfolder
  const [folderDialog, setFolderDialog] = useState<{ parent: string } | null>(null);
  const [folderName, setFolderName] = useState("");

  // rename / delete
  const [renameTarget, setRenameTarget] = useState<RenameTarget | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);

  const toggle = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  // Build storage path from formulario.storage_path (strip "formatos/" prefix)
  const formStoragePath = (f: Formulario) => f.storage_path.replace(/^formatos\//, "");
  const insurerFolder = (carpeta: string) => carpeta.replace(/^formatos\//, "").replace(/\/$/, "");

  const onDropFiles = async (
    e: React.DragEvent,
    parentPath: string,
    replacePath?: string
  ) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverPath(null);
    const files = Array.from(e.dataTransfer.files).filter((f) =>
      f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf")
    );
    if (files.length === 0) {
      toast.error("Solo se aceptan PDFs");
      return;
    }
    if (replacePath) {
      await replaceFile(replacePath, files[0]);
    } else {
      await uploadFiles(parentPath, files);
    }
  };

  const handleRootFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;
    await uploadFiles("", files);
    if (rootInputRef.current) rootInputRef.current.value = "";
  };

  const handleInsurerFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0 || !insurerUploadTarget) return;
    await uploadFiles(insurerUploadTarget, files);
    setInsurerUploadTarget(null);
    if (insurerInputRef.current) insurerInputRef.current.value = "";
  };

  const handleReplaceFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !replaceTarget) return;
    await replaceFile(replaceTarget, file);
    setReplaceTarget(null);
    if (replaceInputRef.current) replaceInputRef.current.value = "";
  };

  const submitFolder = async (parent: string, name: string) => {
    try {
      await createFolder(parent, name);
      setFolderDialog(null);
      setRootFolderOpen(false);
      setFolderName("");
      setRootFolderName("");
    } catch (e: any) {
      toast.error(e.message ?? "Error al crear carpeta");
    }
  };

  const submitRename = async () => {
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
    const parent = renameTarget.path.includes("/")
      ? renameTarget.path.substring(0, renameTarget.path.lastIndexOf("/"))
      : "";
    const newPath = parent ? `${parent}/${newName}` : newName;
    try {
      await renameItem(renameTarget.path, newPath, renameTarget.isFolder);
      setRenameTarget(null);
    } catch (e: any) {
      toast.error(e.message ?? "Error al renombrar");
    }
  };

  const submitDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteItem(deleteTarget.path, deleteTarget.isFolder);
      setDeleteTarget(null);
    } catch (e: any) {
      toast.error(e.message ?? "Error al eliminar");
    }
  };

  if (loadingA || loadingF) {
    return (
      <div className="space-y-2 p-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-full" />
        ))}
      </div>
    );
  }

  return (
    <>
      {/* Sticky toolbar */}
      <div className="sticky top-0 z-10 flex items-center gap-1 border-b bg-background/95 p-2 backdrop-blur">
        <Button
          size="sm"
          variant="default"
          className="h-8 flex-1"
          onClick={() => rootInputRef.current?.click()}
          title="Subir PDF a la raíz"
        >
          <Upload className="h-3.5 w-3.5" />
          Subir PDF
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="h-8"
          onClick={() => setRootFolderOpen(true)}
          title="Nueva carpeta"
        >
          <FolderPlus className="h-3.5 w-3.5" />
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="h-8 w-8 p-0"
          onClick={() => refresh()}
          title="Refrescar"
        >
          <RefreshCw className="h-3.5 w-3.5" />
        </Button>
        <input
          ref={rootInputRef}
          type="file"
          multiple
          accept="application/pdf,.pdf"
          className="hidden"
          onChange={handleRootFiles}
        />
        <input
          ref={insurerInputRef}
          type="file"
          multiple
          accept="application/pdf,.pdf"
          className="hidden"
          onChange={handleInsurerFiles}
        />
        <input
          ref={replaceInputRef}
          type="file"
          accept="application/pdf,.pdf"
          className="hidden"
          onChange={handleReplaceFile}
        />
      </div>

      <div className="space-y-1 p-2">
        {aseguradoras?.map((a) => {
          const forms = formularios?.filter((f) => f.aseguradora_id === a.id) ?? [];
          const isOpen = expanded.has(a.id);
          const folder = insurerFolder(a.carpeta_storage);
          const isDragOver = dragOverPath === folder;

          return (
            <div
              key={a.id}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOverPath(folder);
              }}
              onDragLeave={(e) => {
                e.stopPropagation();
                if (dragOverPath === folder) setDragOverPath(null);
              }}
              onDrop={(e) => onDropFiles(e, folder)}
              className={cn(
                "rounded-md transition-colors",
                isDragOver && "ring-2 ring-primary bg-primary/5"
              )}
            >
              <div className="flex items-center gap-1 group">
                <button
                  onClick={() => toggle(a.id)}
                  className="flex flex-1 items-center gap-2 rounded-md px-2 py-1.5 text-sm font-medium hover:bg-accent"
                >
                  {isOpen ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                  <span className="flex-1 text-left">{a.nombre}</span>
                  <span className="text-xs text-muted-foreground">({forms.length})</span>
                </button>
                <div className="flex shrink-0 gap-0.5 pr-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      setInsurerUploadTarget(folder);
                      insurerInputRef.current?.click();
                    }}
                    title={`Subir PDF a ${a.nombre}`}
                  >
                    <Upload className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      setFolderDialog({ parent: folder });
                    }}
                    title="Nueva subcarpeta"
                  >
                    <FolderPlus className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>

              {isOpen && (
                <div className="ml-4 mt-1 space-y-0.5 border-l border-border pl-2">
                  {forms.length === 0 && (
                    <div className="px-2 py-1 text-xs text-muted-foreground">
                      Sin formularios. Arrastra un PDF aquí.
                    </div>
                  )}
                  {forms.map((f) => {
                    const fPath = formStoragePath(f);
                    const fName = fPath.split("/").pop() ?? f.nombre;
                    const isFileDragOver = dragOverPath === fPath;
                    return (
                      <div
                        key={f.id}
                        onDragOver={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setDragOverPath(fPath);
                        }}
                        onDragLeave={(e) => {
                          e.stopPropagation();
                          if (dragOverPath === fPath) setDragOverPath(null);
                        }}
                        onDrop={(e) => onDropFiles(e, "", fPath)}
                        className={cn(
                          "flex items-center gap-1 rounded-md group",
                          isFileDragOver && "ring-2 ring-primary bg-primary/5"
                        )}
                      >
                        <button
                          onClick={() => onSelect(f)}
                          className={cn(
                            "flex flex-1 items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent",
                            selectedId === f.id &&
                              "bg-accent font-medium text-accent-foreground"
                          )}
                        >
                          <FileText className="h-3.5 w-3.5 shrink-0" />
                          <span className="truncate text-left">{f.nombre_display}</span>
                        </button>
                        <div className="flex shrink-0 gap-0.5 pr-1 opacity-60 group-hover:opacity-100">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              downloadFile(fPath);
                            }}
                            title="Descargar"
                          >
                            <Download className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              setRenameTarget({
                                path: fPath,
                                name: fName,
                                isFolder: false,
                              });
                              setRenameValue(fName);
                            }}
                            title="Renombrar"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 text-destructive"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteTarget({
                                path: fPath,
                                name: fName,
                                isFolder: false,
                              });
                            }}
                            title="Eliminar"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Floating uploads card */}
      {uploads.length > 0 && (
        <Card className="fixed bottom-4 right-4 z-50 w-80 p-3 shadow-lg space-y-2">
          <div className="text-xs font-medium text-muted-foreground">
            Subidas ({uploads.length})
          </div>
          {uploads.map((u) => (
            <div key={u.name} className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="truncate">{u.name}</span>
                <span
                  className={cn(
                    u.status === "error" && "text-destructive",
                    u.status === "done" && "text-primary",
                    u.status === "uploading" && "text-muted-foreground"
                  )}
                >
                  {u.status === "done"
                    ? "Completado"
                    : u.status === "error"
                      ? (u.error ?? "Error")
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

      {/* Root: Nueva carpeta */}
      <Dialog open={rootFolderOpen} onOpenChange={setRootFolderOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nueva carpeta en raíz</DialogTitle>
          </DialogHeader>
          <Input
            value={rootFolderName}
            onChange={(e) => setRootFolderName(e.target.value)}
            placeholder="Nombre de la carpeta"
            onKeyDown={(e) => e.key === "Enter" && submitFolder("", rootFolderName)}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRootFolderOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={() => submitFolder("", rootFolderName)}>Crear</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Per-insurer: Nueva subcarpeta */}
      <Dialog
        open={!!folderDialog}
        onOpenChange={(open) => !open && setFolderDialog(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Nueva carpeta en /{folderDialog?.parent || "raíz"}
            </DialogTitle>
          </DialogHeader>
          <Input
            value={folderName}
            onChange={(e) => setFolderName(e.target.value)}
            placeholder="Nombre de la carpeta"
            onKeyDown={(e) =>
              e.key === "Enter" &&
              folderDialog &&
              submitFolder(folderDialog.parent, folderName)
            }
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setFolderDialog(null)}>
              Cancelar
            </Button>
            <Button
              onClick={() =>
                folderDialog && submitFolder(folderDialog.parent, folderName)
              }
            >
              Crear
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rename */}
      <Dialog
        open={!!renameTarget}
        onOpenChange={(open) => !open && setRenameTarget(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Renombrar '{renameTarget?.name}'</DialogTitle>
          </DialogHeader>
          <Input
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submitRename()}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameTarget(null)}>
              Cancelar
            </Button>
            <Button onClick={submitRename}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar '{deleteTarget?.name}'?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer.
              {deleteTarget?.isFolder &&
                " Se eliminarán todos los archivos dentro de la carpeta."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={submitDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}