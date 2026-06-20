"use client";

import { useCallback, useEffect, useState } from "react";

export interface SavedMapMeta {
  id: string;
  title: string;
  idea: string;
  summary: string;
  palette: string;
  tags: string[];
  starred: boolean;
  createdAt: string;
  updatedAt: string;
  appsCount: number;
  nodesCount: number;
}

export interface LoadedMap {
  id: string;
  title: string;
  tags: string[];
  starred: boolean;
  createdAt: string;
  updatedAt: string;
  map: import("@/lib/vision-map").VisionMap;
}

export function useSavedMaps() {
  const [maps, setMaps] = useState<SavedMapMeta[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/vision/maps", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al listar mapas");
      setMaps(data.maps || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setLoading(false);
    }
  }, []);

  const saveMap = useCallback(
    async (params: {
      id?: string;
      map: import("@/lib/vision-map").VisionMap;
      title?: string;
      tags?: string[];
      starred?: boolean;
      palette?: string;
    }) => {
      const res = await fetch("/api/vision/maps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al guardar");
      await refresh();
      return data as { id: string; updatedAt: string; createdAt?: string };
    },
    [refresh]
  );

  const loadMap = useCallback(async (id: string): Promise<LoadedMap> => {
    const res = await fetch(`/api/vision/maps/${id}`, { cache: "no-store" });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Error al cargar");
    return data as LoadedMap;
  }, []);

  const deleteMap = useCallback(
    async (id: string) => {
      const res = await fetch(`/api/vision/maps/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Error al eliminar");
      }
      await refresh();
    },
    [refresh]
  );

  const toggleStar = useCallback(
    async (id: string, starred: boolean) => {
      const res = await fetch("/api/vision/maps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, starred }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Error al actualizar");
      }
      await refresh();
    },
    [refresh]
  );

  useEffect(() => {
    refresh();
  }, [refresh]);

  return {
    maps,
    loading,
    error,
    refresh,
    saveMap,
    loadMap,
    deleteMap,
    toggleStar,
  };
}
