import React from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Trash2, Download, Copy, CheckCircle } from "lucide-react";
import type { MapExport } from "@/hooks/use-map-exports";

interface ExportHistoryProps {
  exports: MapExport[];
  mapId: string;
  onDownload: (exportId: string) => void;
  onDelete: (exportId: string) => Promise<void>;
  isLoading?: boolean;
}

export function ExportHistory({
  exports,
  mapId,
  onDownload,
  onDelete,
  isLoading = false,
}: ExportHistoryProps) {
  const [copiedId, setCopiedId] = React.useState<string | null>(null);
  const [deletingId, setDeletingId] = React.useState<string | null>(null);

  const handleCopyUrl = async (exportId: string) => {
    // Copy the authenticated download URL, not the raw blob URL
    const downloadUrl = `/api/vision/maps/${mapId}/exports/${exportId}/download`;
    try {
      await navigator.clipboard.writeText(window.location.origin + downloadUrl);
      setCopiedId(exportId);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      console.error("Failed to copy URL");
    }
  };

  const handleDelete = async (exportId: string) => {
    if (!confirm("¿Eliminar este archivo?")) return;

    setDeletingId(exportId);
    try {
      await onDelete(exportId);
    } finally {
      setDeletingId(null);
    }
  };

  const formatFileSize = (bytes: number) => {
    const units = ["B", "KB", "MB"];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(1)} ${units[unitIndex]}`;
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("es-ES", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (exports.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>Aún no hay archivos guardados en la nube</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold">Archivos guardados</h3>

      <div className="space-y-2 max-h-64 overflow-y-auto">
        {exports.map((exp, idx) => (
          <motion.div
            key={exp.id}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 * idx }}
            className="flex items-center justify-between p-3 rounded-lg bg-accent/50 hover:bg-accent transition-colors"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold uppercase px-2 py-1 rounded bg-primary/20 text-primary">
                  {exp.format}
                </span>
                <span className="text-xs text-muted-foreground">
                  {formatFileSize(exp.fileSize)}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {formatDate(exp.uploadedAt)}
              </p>
            </div>

            <div className="flex items-center gap-2 ml-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleCopyUrl(exp.id)}
                title="Copiar URL"
                disabled={isLoading || deletingId === exp.id}
              >
                {copiedId === exp.id ? (
                  <CheckCircle className="w-4 h-4 text-green-500" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </Button>

              <Button
                size="sm"
                variant="ghost"
                onClick={() => onDownload(exp.id)}
                title="Descargar"
                disabled={isLoading || deletingId === exp.id}
              >
                <Download className="w-4 h-4" />
              </Button>

              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleDelete(exp.id)}
                title="Eliminar"
                disabled={isLoading || deletingId === exp.id}
              >
                <Trash2 className="w-4 h-4 text-destructive" />
              </Button>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
