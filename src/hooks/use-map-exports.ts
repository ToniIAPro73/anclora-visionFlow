import { useState, useCallback } from "react";

export interface MapExport {
  id: string;
  format: "png" | "pdf";
  blobUrl: string;
  fileSize: number;
  uploadedAt: string;
  expiresAt?: string;
}

export interface UseMapExportsResult {
  exports: MapExport[];
  loading: boolean;
  error: string | null;
  listExports: (mapId: string) => Promise<void>;
  uploadExport: (mapId: string, file: File, format: "png" | "pdf") => Promise<MapExport | null>;
  downloadExport: (mapId: string, exportId: string) => void;
  deleteExport: (mapId: string, exportId: string) => Promise<void>;
  clearError: () => void;
}

export function useMapExports(): UseMapExportsResult {
  const [exports, setExports] = useState<MapExport[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => setError(null), []);

  const listExports = useCallback(async (mapId: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/vision/maps/${mapId}/exports`);
      if (!res.ok) {
        throw new Error("No se pudo cargar los archivos");
      }
      const data = await res.json();
      setExports(data.exports || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setLoading(false);
    }
  }, []);

  const uploadExport = useCallback(
    async (mapId: string, file: File, format: "png" | "pdf"): Promise<MapExport | null> => {
      setLoading(true);
      setError(null);
      try {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("format", format);

        const res = await fetch(`/api/vision/maps/${mapId}/exports/upload`, {
          method: "POST",
          body: formData,
        });

        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || "Error al subir archivo");
        }

        const exported: MapExport = await res.json();
        setExports((prev) => [exported, ...prev]);
        return exported;
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : "Error al subir";
        setError(errorMsg);
        return null;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const downloadExport = useCallback((mapId: string, exportId: string) => {
    // Browser will handle the redirect and download automatically
    window.location.href = `/api/vision/maps/${mapId}/exports/${exportId}/download`;
  }, []);

  const deleteExport = useCallback(async (mapId: string, exportId: string) => {
    setError(null);
    try {
      const res = await fetch(`/api/vision/maps/${mapId}/exports/${exportId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        throw new Error("No se pudo eliminar el archivo");
      }

      setExports((prev) => prev.filter((exp) => exp.id !== exportId));
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Error al eliminar";
      setError(errorMsg);
      throw err;
    }
  }, []);

  return {
    exports,
    loading,
    error,
    listExports,
    uploadExport,
    downloadExport,
    deleteExport,
    clearError,
  };
}
