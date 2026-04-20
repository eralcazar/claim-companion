import { useCallback, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const BUCKET = "formatos";

export type UploadProgress = {
  name: string;
  progress: number;
  status: "uploading" | "done" | "error";
  error?: string;
};

async function listAllRecursive(prefix: string): Promise<string[]> {
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
}

export function useStorageFormatos() {
  const qc = useQueryClient();
  const [uploads, setUploads] = useState<UploadProgress[]>([]);

  const invalidate = useCallback(() => {
    qc.invalidateQueries({ queryKey: ["storage", BUCKET] });
    qc.invalidateQueries({ queryKey: ["formularios"] });
    qc.invalidateQueries({ queryKey: ["aseguradoras"] });
  }, [qc]);

  const uploadFiles = useCallback(
    async (parentPath: string, files: File[]) => {
      if (files.length === 0) return;
      const initial: UploadProgress[] = files.map((f) => ({
        name: f.name,
        progress: 0,
        status: "uploading",
      }));
      setUploads((prev) => [...prev, ...initial]);

      await Promise.all(
        files.map(async (file) => {
          const target = parentPath ? `${parentPath}/${file.name}` : file.name;
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
      setTimeout(() => {
        setUploads((prev) => prev.filter((u) => u.status === "error"));
      }, 3000);
    },
    [invalidate]
  );

  const replaceFile = useCallback(
    async (targetPath: string, file: File) => {
      setUploads((prev) => [
        ...prev,
        { name: file.name, progress: 0, status: "uploading" },
      ]);
      try {
        const { error } = await supabase.storage
          .from(BUCKET)
          .upload(targetPath, file, { upsert: true, contentType: file.type });
        if (error) throw error;
        setUploads((prev) =>
          prev.map((u) =>
            u.name === file.name ? { ...u, progress: 100, status: "done" } : u
          )
        );
        toast.success(`'${targetPath.split("/").pop()}' reemplazado`);
        invalidate();
        setTimeout(() => {
          setUploads((prev) => prev.filter((u) => u.status === "error"));
        }, 3000);
      } catch (e: any) {
        setUploads((prev) =>
          prev.map((u) =>
            u.name === file.name
              ? { ...u, status: "error", error: e.message ?? "Error" }
              : u
          )
        );
        toast.error(e.message ?? "Error al reemplazar");
      }
    },
    [invalidate]
  );

  const createFolder = useCallback(
    async (parentPath: string, name: string) => {
      const trimmed = name.trim();
      if (!trimmed) throw new Error("Nombre requerido");
      if (trimmed.includes("/")) throw new Error("El nombre no puede contener '/'");
      const placeholder = parentPath
        ? `${parentPath}/${trimmed}/.emptyFolderPlaceholder`
        : `${trimmed}/.emptyFolderPlaceholder`;
      const { error } = await supabase.storage
        .from(BUCKET)
        .upload(placeholder, new Blob([""]), { upsert: true });
      if (error) throw error;
      toast.success(`Carpeta '${trimmed}' creada`);
      invalidate();
    },
    [invalidate]
  );

  const renameItem = useCallback(
    async (oldPath: string, newPath: string, isFolder: boolean) => {
      if (oldPath === newPath) return;
      if (isFolder) {
        const allFiles = await listAllRecursive(oldPath);
        if (allFiles.length === 0) throw new Error("Carpeta vacía o no accesible");
        for (const f of allFiles) {
          const dest = newPath + f.substring(oldPath.length);
          const { error } = await supabase.storage.from(BUCKET).move(f, dest);
          if (error) throw error;
        }
        toast.success(`Carpeta renombrada`);
      } else {
        const { error } = await supabase.storage.from(BUCKET).move(oldPath, newPath);
        if (error) throw error;
        toast.success(`Archivo renombrado`);
      }
      invalidate();
    },
    [invalidate]
  );

  const deleteItem = useCallback(
    async (path: string, isFolder: boolean) => {
      if (isFolder) {
        const allFiles = await listAllRecursive(path);
        if (allFiles.length > 0) {
          const { error } = await supabase.storage.from(BUCKET).remove(allFiles);
          if (error) throw error;
        }
        toast.success(`Carpeta eliminada (${allFiles.length} archivos)`);
      } else {
        const { error } = await supabase.storage.from(BUCKET).remove([path]);
        if (error) throw error;
        toast.success(`Archivo eliminado`);
      }
      invalidate();
    },
    [invalidate]
  );

  const downloadFile = useCallback((path: string) => {
    const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
    window.open(data.publicUrl, "_blank");
  }, []);

  return {
    uploads,
    uploadFiles,
    replaceFile,
    createFolder,
    renameItem,
    deleteItem,
    downloadFile,
    refresh: invalidate,
  };
}