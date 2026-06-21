"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowUpWideNarrow,
  Bookmark,
  Calendar,
  Database,
  Download,
  Euro,
  Eye,
  FileDown,
  FileText,
  Footprints,
  FolderOpen,
  Image as ImageIcon,
  LayoutGrid,
  Lightbulb,
  Maximize2,
  Minus,
  Palette,
  Plus,
  Rocket,
  RotateCcw,
  Save,
  Search,
  Sparkles,
  Star,
  Target,
  Trash2,
  TrendingUp,
  Upload,
  Users,
  Wand2,
  Wrench,
  X,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { VisionNodeCard } from "./VisionNodeCard";
import { ConnectionsLayer } from "./ConnectionsLayer";
import { CatalogDialog } from "./CatalogDialog";
import { downloadSpecMarkdown } from "@/lib/markdown-export";
import { ANCLORA_APPS } from "@/lib/anclora-ecosystem";
import {
  getCategoryMeta,
  CATEGORY_ORDER,
  PALETTES,
  autoConnect,
  layoutVisionMap,
  type NodeCategory,
  type PaletteId,
  type VisionMap,
  type VisionNode,
} from "@/lib/vision-map";
import { useSavedMaps } from "@/hooks/use-saved-maps";

const ICONS: Record<string, LucideIcon> = {
  Lightbulb,
  Target,
  Footprints,
  AlertTriangle,
  Wrench,
  Euro,
  ArrowUpWideNarrow,
  Rocket,
  TrendingUp,
  Users,
  Calendar,
};

const CANVAS_W = 2400;
const CANVAS_H = 1600;

const EXAMPLE_IDEAS = [
  "Lanzar una nueva línea de asesoría energética para clientes premium usando EnergyScan y Advisor AI",
  "Reducir el coste mensual de infraestructura del ecosistema Anclora un 30%",
  "Crear un flujo de captación de partners para Anclora Synergi en mercados DACH",
  "Integrar FileStudio como motor de conversión dentro de Nexus",
  "Posicionar Anclora Private Estates como referencia de lujo en Mallorca en 2026",
];

export function VisionBoard() {
  const [idea, setIdea] = useState("");
  const [map, setMap] = useState<VisionMap | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [activeNodeId, setActiveNodeId] = useState<string | null>(null);
  const [highlightedCategory, setHighlightedCategory] = useState<NodeCategory | null>(null);
  const [zoom, setZoom] = useState(0.55);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const [presentationMode, setPresentationMode] = useState(false);

  // Persistence + palette
  const [palette, setPalette] = useState<PaletteId>("anclora");
  const [savedId, setSavedId] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [saveTitle, setSaveTitle] = useState("");
  const [saveTags, setSaveTags] = useState("");

  const savedMaps = useSavedMaps();

  const boardRef = useRef<HTMLDivElement>(null);
  const dragStart = useRef<{ x: number; y: number; nodeX: number; nodeY: number } | null>(null);
  const panStart = useRef<{ x: number; y: number; panX: number; panY: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Library filters
  const [libSearch, setLibSearch] = useState("");
  const [libPaletteFilter, setLibPaletteFilter] = useState<PaletteId | "all">("all");
  const [libStarredOnly, setLibStarredOnly] = useState(false);
  const [libTagFilter, setLibTagFilter] = useState<string>("all");

  // Drag node
  const handleNodeDragStart = useCallback((id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const node = map?.nodes.find((n) => n.id === id);
    if (!node) return;
    setDraggingNodeId(id);
    setActiveNodeId(id);
    dragStart.current = {
      x: e.clientX,
      y: e.clientY,
      nodeX: node.x,
      nodeY: node.y,
    };
  }, [map]);

  useEffect(() => {
    if (!draggingNodeId) return;
    function onMove(e: MouseEvent) {
      if (!dragStart.current || !map) return;
      const dx = (e.clientX - dragStart.current.x) / zoom;
      const dy = (e.clientY - dragStart.current.y) / zoom;
      setMap((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          nodes: prev.nodes.map((n) =>
            n.id === draggingNodeId
              ? { ...n, x: dragStart.current!.nodeX + dx, y: dragStart.current!.nodeY + dy }
              : n
          ),
        };
      });
    }
    function onUp() {
      setDraggingNodeId(null);
      dragStart.current = null;
    }
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [draggingNodeId, map, zoom]);

  // Pan canvas
  const handleCanvasMouseDown = useCallback(
    (e: React.MouseEvent) => {
      // Only pan when clicking on empty space
      if (e.target === e.currentTarget || (e.target as HTMLElement).classList.contains("vision-canvas-bg")) {
        setIsPanning(true);
        panStart.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y };
      }
    },
    [pan]
  );

  useEffect(() => {
    if (!isPanning) return;
    function onMove(e: MouseEvent) {
      if (!panStart.current) return;
      const dx = e.clientX - panStart.current.x;
      const dy = e.clientY - panStart.current.y;
      setPan({ x: panStart.current.panX + dx, y: panStart.current.panY + dy });
    }
    function onUp() {
      setIsPanning(false);
      panStart.current = null;
    }
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [isPanning]);

  const generateMap = useCallback(async () => {
    if (!idea.trim()) {
      toast.error("Escribe una idea primero");
      return;
    }
    setLoading(true);
    setError(null);
    setMap(null);
    setPan({ x: 0, y: 0 });
    setZoom(0.55);
    setActiveNodeId(null);
    setSavedId(null);
    setIsDirty(false);

    try {
      const res = await fetch("/api/vision/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idea }),
      });

      // Handle non-JSON responses (e.g. 502 Bad Gateway HTML from the preview gateway)
      const contentType = res.headers.get("content-type") || "";
      if (!contentType.includes("application/json")) {
        if (res.status === 502 || res.status === 504) {
          throw new Error(
            "El servidor tardó demasiado en responder. Inténtalo de nuevo — la generación debería ser más rápida ahora."
          );
        }
        throw new Error(
          `Respuesta inesperada del servidor (HTTP ${res.status}). Inténtalo de nuevo.`
        );
      }

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "No se pudo generar el mapa");
      }
      if (!data.nodes || !Array.isArray(data.nodes) || data.nodes.length === 0) {
        throw new Error("El mapa generado no contiene nodos. Prueba con otra idea.");
      }
      setMap({ ...data, palette });
      toast.success(`Mapa visual generado · ${data.nodes.length} nodos`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error desconocido";
      setError(msg);
      toast.error(`Error: ${msg}`);
    } finally {
      setLoading(false);
    }
  }, [idea, palette]);

  const relayout = useCallback(() => {
    if (!map) return;
    const laidOut = layoutVisionMap(map.nodes);
    const connections = autoConnect(laidOut);
    setMap({ ...map, nodes: laidOut, connections });
    setIsDirty(true);
    toast.success("Layout reiniciado");
  }, [map]);

  // Inline node editing
  const updateNode = useCallback((id: string, patch: Partial<VisionNode>) => {
    setMap((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        nodes: prev.nodes.map((n) => (n.id === id ? { ...n, ...patch } : n)),
      };
    });
    setIsDirty(true);
    toast.success("Nodo actualizado");
  }, []);

  // Persist map
  const openSaveDialog = useCallback(() => {
    if (!map) return;
    setSaveTitle(map.idea.slice(0, 80) || "Mapa sin título");
    setSaveTags("");
    setSaveDialogOpen(true);
  }, [map]);

  const confirmSave = useCallback(async () => {
    if (!map) return;
    try {
      const result = await savedMaps.saveMap({
        id: savedId || undefined,
        map: { ...map, palette },
        title: saveTitle.trim() || map.idea.slice(0, 80),
        tags: saveTags.split(",").map((t) => t.trim()).filter(Boolean),
      });
      setSavedId(result.id);
      setIsDirty(false);
      setSaveDialogOpen(false);
      toast.success("Mapa guardado");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al guardar");
    }
  }, [map, palette, savedId, saveTitle, saveTags, savedMaps]);

  const loadMapById = useCallback(
    async (id: string) => {
      try {
        const loaded = await savedMaps.loadMap(id);
        setMap(loaded.map);
        setIdea(loaded.map.idea);
        setPalette(loaded.map.palette || "anclora");
        setSavedId(loaded.id);
        setIsDirty(false);
        setActiveNodeId(null);
        setPan({ x: 0, y: 0 });
        setZoom(0.55);
        setLibraryOpen(false);
        toast.success(`Mapa cargado: ${loaded.title}`);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Error al cargar");
      }
    },
    [savedMaps]
  );

  const deleteMapById = useCallback(
    async (id: string, title: string) => {
      if (!confirm(`¿Eliminar "${title}"? Esta acción no se puede deshacer.`)) return;
      try {
        await savedMaps.deleteMap(id);
        if (id === savedId) {
          setSavedId(null);
          setIsDirty(false);
        }
        toast.success("Mapa eliminado");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Error al eliminar");
      }
    },
    [savedMaps, savedId]
  );

  const toggleStarById = useCallback(
    async (id: string, current: boolean) => {
      try {
        await savedMaps.toggleStar(id, !current);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Error al actualizar");
      }
    },
    [savedMaps]
  );

  // Palette change (live)
  const changePalette = useCallback(
    (p: PaletteId) => {
      setPalette(p);
      if (map) {
        setMap({ ...map, palette: p });
        setIsDirty(true);
      }
    },
    [map]
  );

  // Export current map as JSON file
  const exportJSON = useCallback(() => {
    if (!map) return;
    try {
      const payload = {
        ...map,
        palette,
        _exportedAt: new Date().toISOString(),
        _exportedBy: "AncloraVisionFlow",
        _version: 2,
      };
      const blob = new Blob([JSON.stringify(payload, null, 2)], {
        type: "application/json;charset=utf-8",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      const safeName =
        (map.idea || "anclora-visionflow")
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-+|-+$/g, "")
          .slice(0, 60) || "anclora-visionflow";
      link.download = `${safeName}.json`;
      link.href = url;
      link.click();
      URL.revokeObjectURL(url);
      toast.success("JSON exportado");
    } catch (err) {
      console.error(err);
      toast.error("No se pudo exportar el JSON");
    }
  }, [map, palette]);

  // Export current map as Spec Markdown for LLM/agent consumption
  const exportSpecMD = useCallback(() => {
    if (!map) return;
    try {
      downloadSpecMarkdown(map, { palette });
      toast.success("Spec Markdown exportado — listo para alimentar un agente de IA");
    } catch (err) {
      console.error(err);
      toast.error("No se pudo exportar el Spec Markdown");
    }
  }, [map, palette]);

  // Import map from JSON file
  const handleImportJSON = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const data = JSON.parse(text) as Partial<VisionMap> & {
          nodes?: VisionNode[];
          connections?: VisionMap["connections"];
        };
        if (!data || !Array.isArray(data.nodes) || data.nodes.length === 0) {
          throw new Error("El JSON no contiene nodos válidos.");
        }
        // Basic validation
        const validCats = new Set([
          "idea",
          "objective",
          "step",
          "risk",
          "tool",
          "cost",
          "priority",
          "next",
          "kpi",
          "stakeholder",
          "timeline",
        ]);
        const cleanNodes: VisionNode[] = data.nodes
          .filter((n) => n && validCats.has(n.category))
          .map((n, i) => ({
            ...n,
            id: n.id || `node-${i + 1}`,
            x: typeof n.x === "number" ? n.x : 0,
            y: typeof n.y === "number" ? n.y : 0,
          }));
        if (cleanNodes.length === 0) {
          throw new Error("No se encontraron nodos con categorías válidas.");
        }
        const importedMap: VisionMap = {
          idea: data.idea || "Mapa importado",
          summary: data.summary || "",
          nodes: cleanNodes,
          connections: Array.isArray(data.connections) ? data.connections : [],
          apps: Array.isArray(data.apps) ? data.apps : [],
          generatedAt: data.generatedAt || new Date().toISOString(),
          palette: (data.palette as PaletteId) || "anclora",
        };
        setMap(importedMap);
        setIdea(importedMap.idea);
        setPalette(importedMap.palette || "anclora");
        setSavedId(null);
        setIsDirty(true);
        setActiveNodeId(null);
        setPan({ x: 0, y: 0 });
        setZoom(0.55);
        toast.success(`Mapa importado: ${cleanNodes.length} nodos`);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "JSON inválido";
        toast.error(`No se pudo importar: ${msg}`);
        console.error(err);
      } finally {
        // Reset input so the same file can be re-imported
        e.target.value = "";
      }
    },
    []
  );

  // Filtered library maps (memoized)
  const filteredLibraryMaps = useMemo(() => {
    let arr = savedMaps.maps;
    if (libStarredOnly) arr = arr.filter((m) => m.starred);
    if (libPaletteFilter !== "all")
      arr = arr.filter((m) => m.palette === libPaletteFilter);
    if (libTagFilter !== "all")
      arr = arr.filter((m) => m.tags.includes(libTagFilter));
    if (libSearch.trim()) {
      const q = libSearch.toLowerCase().trim();
      arr = arr.filter(
        (m) =>
          m.title.toLowerCase().includes(q) ||
          m.idea.toLowerCase().includes(q) ||
          m.summary.toLowerCase().includes(q) ||
          m.tags.some((t) => t.toLowerCase().includes(q))
      );
    }
    return arr;
  }, [savedMaps.maps, libSearch, libPaletteFilter, libStarredOnly, libTagFilter]);

  // All unique tags across library
  const allLibraryTags = useMemo(() => {
    const set = new Set<string>();
    savedMaps.maps.forEach((m) => m.tags.forEach((t) => set.add(t)));
    return Array.from(set).sort();
  }, [savedMaps.maps]);

  // Reset filters when opening library
  useEffect(() => {
    if (libraryOpen) {
      setLibSearch("");
      setLibPaletteFilter("all");
      setLibStarredOnly(false);
      setLibTagFilter("all");
    }
  }, [libraryOpen]);

  const zoomIn = useCallback(() => setZoom((z) => Math.min(1.5, z + 0.1)), []);
  const zoomOut = useCallback(() => setZoom((z) => Math.max(0.25, z - 0.1)), []);
  const resetView = useCallback(() => {
    setZoom(0.55);
    setPan({ x: 0, y: 0 });
  }, []);

  // Stats
  const stats = useMemo(() => {
    if (!map) return null;
    const totalCost = map.nodes
      .filter((n) => n.cost !== undefined)
      .reduce((sum, n) => sum + (n.cost || 0), 0);
    const byCat = {} as Record<string, number>;
    for (const n of map.nodes) {
      byCat[n.category] = (byCat[n.category] || 0) + 1;
    }
    return {
      totalNodes: map.nodes.length,
      totalCost,
      byCat,
      apps: map.apps.length,
    };
  }, [map]);

  const activeNode = useMemo(() => {
    if (!map || !activeNodeId) return null;
    return map.nodes.find((n) => n.id === activeNodeId) || null;
  }, [map, activeNodeId]);

  const activeConnections = useMemo(() => {
    if (!map || !activeNodeId) return new Set<string>();
    const ids = new Set<string>();
    for (const c of map.connections) {
      if (c.from === activeNodeId) ids.add(c.to);
      if (c.to === activeNodeId) ids.add(c.from);
    }
    return ids;
  }, [map, activeNodeId]);

  // Export functions
  // We bypass html2canvas entirely (it can't parse oklch/lab from Tailwind v4).
  // Instead we build a self-contained SVG snapshot and render it directly to canvas.
  const exportImage = useCallback(async () => {
    if (!map) return;
    toast.info("Generando imagen...");
    try {
      const { buildVisionSVG } = await import("./export-utils");
      const svgString = buildVisionSVG(map);
      const blob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const img = new Image();
      img.crossOrigin = "anonymous";
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error("No se pudo renderizar el SVG"));
        img.src = url;
      });
      const scale = 1.4;
      const canvas = document.createElement("canvas");
      canvas.width = CANVAS_W * scale;
      canvas.height = CANVAS_H * scale;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas no disponible");
      ctx.fillStyle = "#0a0f1f";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      const link = document.createElement("a");
      link.download = `anclora-visionflow-${Date.now()}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
      toast.success("Imagen exportada");
    } catch (err) {
      toast.error("No se pudo exportar la imagen");
      console.error(err);
    }
  }, [map]);

  const exportPDF = useCallback(async () => {
    if (!map) return;
    toast.info("Generando PDF...");
    try {
      const { buildVisionSVG } = await import("./export-utils");
      const svgString = buildVisionSVG(map);
      const blob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const img = new Image();
      img.crossOrigin = "anonymous";
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error("No se pudo renderizar el SVG"));
        img.src = url;
      });
      const scale = 2;
      const canvas = document.createElement("canvas");
      canvas.width = CANVAS_W * scale;
      canvas.height = CANVAS_H * scale;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas no disponible");
      ctx.fillStyle = "#0a0f1f";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      const imgData = canvas.toDataURL("image/png");
      const jsPDF = (await import("jspdf")).default;
      const pdf = new jsPDF({
        orientation: "landscape",
        unit: "px",
        format: [CANVAS_W, CANVAS_H + 160],
      });
      pdf.setFillColor(15, 22, 41);
      pdf.rect(0, 0, CANVAS_W, 120, "F");
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(22);
      pdf.text("AncloraVisionFlow", 40, 50);
      pdf.setFontSize(12);
      pdf.setTextColor(180, 180, 180);
      pdf.text(map.idea.slice(0, 110), 40, 80);
      pdf.setFontSize(10);
      pdf.text(
        `Generado: ${new Date().toLocaleString("es-ES")} · ${map.nodes.length} nodos · ${map.apps.length} apps`,
        40,
        105
      );
      pdf.addImage(imgData, "PNG", 0, 120, CANVAS_W, CANVAS_H);
      pdf.save(`anclora-visionflow-${Date.now()}.pdf`);
      toast.success("PDF exportado");
    } catch (err) {
      toast.error("No se pudo exportar el PDF");
      console.error(err);
    }
  }, [map]);

  // Presentation mode auto-cycle
  const [presoSlide, setPresoSlide] = useState(0);
  useEffect(() => {
    if (!presentationMode || !map) return;
    const slides = ["idea", ...CATEGORY_ORDER.filter((c) => c !== "idea")];
    const interval = setInterval(() => {
      setPresoSlide((s) => (s + 1) % slides.length);
    }, 6500);
    return () => clearInterval(interval);
  }, [presentationMode, map]);

  // Keyboard shortcuts
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        if (presentationMode) setPresentationMode(false);
        else setActiveNodeId(null);
      }
      if (e.key === "+" || e.key === "=") zoomIn();
      if (e.key === "-") zoomOut();
      if (e.key === "0") resetView();
      if (e.key === "p" && map) setPresentationMode((v) => !v);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [zoomIn, zoomOut, resetView, map, presentationMode]);

  const activeApps = useMemo(() => {
    if (!map) return [];
    return ANCLORA_APPS.filter((a) => map.apps.includes(a.slug));
  }, [map]);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Top bar */}
      <header className="sticky top-0 z-50 glass-strong border-b border-border/50">
        <div className="px-4 md:px-6 py-3 flex items-center gap-3 md:gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="relative w-9 h-9 rounded-lg overflow-hidden flex items-center justify-center bg-gradient-to-br from-[#1dab89] via-[#6C48C5] to-[#D4AF37]">
              <div className="absolute inset-1 rounded-md bg-[#0a0f1f] flex items-center justify-center">
                <Eye size={16} className="text-white" strokeWidth={2.4} />
              </div>
            </div>
            <div className="leading-tight">
              <div className="font-bold text-base tracking-tight">
                Anclora<span className="gradient-text">VisionFlow</span>
              </div>
              <div className="text-[10px] text-muted-foreground -mt-0.5">
                Tablero visual inteligente · Anclora Group
              </div>
            </div>
          </div>

          <div className="flex-1 min-w-[280px] max-w-2xl flex items-center gap-2">
            <div className="relative flex-1">
              <Sparkles
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              />
              <Input
                value={idea}
                onChange={(e) => setIdea(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    generateMap();
                  }
                }}
                placeholder="Describe tu idea, proyecto o problema del ecosistema Anclora..."
                className="pl-9 pr-3 h-10 bg-background/60"
                disabled={loading}
              />
            </div>
            <Button
              onClick={generateMap}
              disabled={loading || !idea.trim()}
              className="h-10 glow-primary bg-gradient-to-r from-[#1dab89] to-[#6C48C5] hover:opacity-90 border-0 text-white"
            >
              {loading ? (
                <>
                  <Wand2 size={15} className="animate-pulse" />
                  <span className="hidden sm:inline">Generando…</span>
                </>
              ) : (
                <>
                  <Wand2 size={15} />
                  <span className="hidden sm:inline">Generar mapa</span>
                </>
              )}
            </Button>
          </div>

          {/* Catalog button — always visible so users can import before generating */}
          <TooltipProvider delayDuration={300}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setCatalogOpen(true)}
                  className="h-9 w-9 bg-background/60"
                  title="Catálogo del ecosistema Anclora"
                >
                  <Database size={15} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Catálogo Anclora · Importar .txt / GitHub</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {map && (
            <div className="flex items-center gap-1.5">
              <TooltipProvider delayDuration={300}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={openSaveDialog}
                      className="h-9 w-9 bg-background/60 relative"
                    >
                      <Save size={15} />
                      {isDirty && (
                        <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-[#F59E0B]" />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {savedId ? "Guardar cambios" : "Guardar mapa"}
                  </TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => {
                        savedMaps.refresh();
                        setLibraryOpen(true);
                      }}
                      className="h-9 w-9 bg-background/60"
                    >
                      <FolderOpen size={15} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Mapas guardados</TooltipContent>
                </Tooltip>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-9 w-9 bg-background/60"
                      title="Paleta de color"
                    >
                      <Palette size={15} />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel>Paleta de color</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {(Object.values(PALETTES)).map((p) => (
                      <DropdownMenuItem
                        key={p.id}
                        onClick={() => changePalette(p.id)}
                        className="flex items-start gap-2 py-2 cursor-pointer"
                      >
                        <span
                          className="w-6 h-6 rounded-md shrink-0 border border-border"
                          style={{
                            background: `linear-gradient(135deg, ${p.accent}, ${p.surface})`,
                          }}
                        />
                        <span className="flex-1">
                          <span className="block text-xs font-semibold">
                            {p.name}
                            {palette === p.id && (
                              <span className="ml-1.5 text-[10px] text-muted-foreground">●</span>
                            )}
                          </span>
                          <span className="block text-[10px] text-muted-foreground leading-tight">
                            {p.description}
                          </span>
                        </span>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={relayout}
                      className="h-9 w-9 bg-background/60"
                    >
                      <LayoutGrid size={15} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Reordenar (R)</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setPresentationMode(true)}
                      className="h-9 w-9 bg-background/60"
                    >
                      <Maximize2 size={15} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Modo presentación (P)</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={exportImage}
                      className="h-9 w-9 bg-background/60"
                    >
                      <ImageIcon size={15} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Exportar imagen</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={exportPDF}
                      className="h-9 w-9 bg-background/60"
                    >
                      <FileDown size={15} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Exportar PDF</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={exportSpecMD}
                      className="h-9 w-9 bg-background/60"
                    >
                      <FileText size={15} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Exportar Spec Markdown (para agente IA)</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={exportJSON}
                      className="h-9 w-9 bg-background/60"
                    >
                      <Download size={15} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Exportar JSON</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => fileInputRef.current?.click()}
                      className="h-9 w-9 bg-background/60"
                    >
                      <Upload size={15} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Importar JSON</TooltipContent>
                </Tooltip>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="application/json,.json"
                  className="hidden"
                  onChange={handleImportJSON}
                />
              </TooltipProvider>
            </div>
          )}
        </div>
      </header>

      {/* Main content */}
      <div className="flex-1 flex relative overflow-hidden">
        {/* Sidebar (left): categories + apps */}
        {map && (
          <aside className="hidden lg:flex flex-col w-64 shrink-0 glass border-r border-border/50 p-4 gap-4 overflow-y-auto custom-scroll">
            <div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2 font-semibold">
                Categorías
              </div>
              <div className="space-y-1">
                {CATEGORY_ORDER.map((cat) => {
                  const meta = getCategoryMeta(cat, palette);
                  const Icon = ICONS[meta.icon] || Target;
                  const count = stats?.byCat[cat] || 0;
                  const isActive = highlightedCategory === cat;
                  if (count === 0 && cat !== "idea") return null;
                  return (
                    <button
                      key={cat}
                      onClick={() =>
                        setHighlightedCategory(isActive ? null : cat)
                      }
                      className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-md hover:bg-muted/50 transition group"
                      style={isActive ? { background: `${meta.color}22` } : undefined}
                    >
                      <span
                        className="w-6 h-6 rounded-md flex items-center justify-center shrink-0"
                        style={{
                          background: `${meta.color}22`,
                          color: meta.color,
                        }}
                      >
                        <Icon size={13} />
                      </span>
                      <span className="text-xs flex-1 text-left text-foreground/90">
                        {meta.label}
                      </span>
                      <span className="text-[10px] text-muted-foreground font-semibold">
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="border-t border-border/40 pt-3">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2 font-semibold">
                Apps Anclora implicadas
              </div>
              {activeApps.length === 0 ? (
                <div className="text-xs text-muted-foreground/70 italic">
                  Ninguna app específica detectada.
                </div>
              ) : (
                <div className="space-y-1.5">
                  {activeApps.map((a) => (
                    <div
                      key={a.slug}
                      className="px-2 py-1.5 rounded-md border border-border/60 bg-background/40"
                      style={{
                        borderLeft: `2px solid ${a.accent}`,
                      }}
                    >
                      <div className="text-xs font-semibold text-foreground/90 leading-tight">
                        {a.name}
                      </div>
                      <div className="text-[10px] text-muted-foreground truncate">
                        {a.tagline}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="border-t border-border/40 pt-3 mt-auto">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2 font-semibold">
                Resumen
              </div>
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Nodos</span>
                  <span className="font-semibold">{stats?.totalNodes}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Coste total</span>
                  <span className="font-semibold">
                    {stats?.totalCost.toLocaleString("es-ES")} €
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Apps</span>
                  <span className="font-semibold">{stats?.apps}</span>
                </div>
              </div>
            </div>
          </aside>
        )}

        {/* Canvas */}
        <main className="flex-1 relative overflow-hidden vision-board-bg">
          {!map && !loading && (
            <EmptyState
              onPickExample={(ex) => setIdea(ex)}
              palette={palette}
            />
          )}

          {loading && <LoadingState palette={palette} />}

          {error && !loading && (
            <div className="absolute inset-0 flex items-center justify-center p-8">
              <div className="max-w-md text-center">
                <AlertTriangle className="mx-auto mb-3 text-destructive" />
                <div className="font-semibold mb-1">No se pudo generar el mapa</div>
                <div className="text-sm text-muted-foreground">{error}</div>
                <Button
                  className="mt-4"
                  variant="outline"
                  onClick={generateMap}
                >
                  Reintentar
                </Button>
              </div>
            </div>
          )}

          {map && !loading && (
            <div
              className="vision-canvas-bg absolute inset-0 overflow-hidden"
              onMouseDown={handleCanvasMouseDown}
              style={{ cursor: isPanning ? "grabbing" : "grab" }}
            >
              <div
                ref={boardRef}
                className="vision-board-grid absolute origin-top-left"
                style={{
                  width: CANVAS_W,
                  height: CANVAS_H,
                  transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                  transition: isPanning || draggingNodeId ? "none" : "transform 0.2s ease-out",
                }}
                onClick={() => setActiveNodeId(null)}
              >
                <ConnectionsLayer
                  nodes={map.nodes}
                  connections={map.connections}
                  activeNodeId={activeNodeId || undefined}
                  width={CANVAS_W}
                  height={CANVAS_H}
                />
                {map.nodes.map((node) => (
                  <VisionNodeCard
                    key={node.id}
                    node={node}
                    isActive={activeNodeId === node.id}
                    isHighlighted={
                      activeNodeId
                        ? activeConnections.has(node.id) || activeNodeId === node.id
                        : highlightedCategory
                        ? node.category === highlightedCategory
                        : true
                    }
                    onSelect={setActiveNodeId}
                    onDragStart={handleNodeDragStart}
                    onUpdate={updateNode}
                    palette={palette}
                  />
                ))}
              </div>

              {/* Zoom controls */}
              <div className="absolute bottom-4 right-4 flex flex-col gap-1 glass rounded-lg p-1 border border-border/50">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={zoomIn}
                >
                  <Plus size={14} />
                </Button>
                <div className="text-[10px] text-center text-muted-foreground font-mono">
                  {Math.round(zoom * 100)}%
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={zoomOut}
                >
                  <Minus size={14} />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={resetView}
                  title="Reset vista"
                >
                  <RotateCcw size={12} />
                </Button>
              </div>

              {/* Hint */}
              <div className="absolute bottom-4 left-4 text-[11px] text-muted-foreground/70 glass rounded-md px-2.5 py-1.5 border border-border/40">
                Arrastra nodos · clic para destacar · <kbd className="font-mono">P</kbd> presentación · <kbd className="font-mono">±/0</kbd> zoom
              </div>
            </div>
          )}
        </main>

        {/* Right detail panel */}
        {map && activeNode && (
          <aside className="hidden xl:flex flex-col w-80 shrink-0 glass border-l border-border/50 p-4 gap-3 overflow-y-auto custom-scroll">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <span
                  className="w-9 h-9 rounded-lg flex items-center justify-center"
                  style={{
                    background: `${getCategoryMeta(activeNode.category, palette).color}22`,
                    color: getCategoryMeta(activeNode.category, palette).color,
                  }}
                >
                  {(() => {
                    const Icon = ICONS[getCategoryMeta(activeNode.category, palette).icon] || Target;
                    return <Icon size={17} />;
                  })()}
                </span>
                <div>
                  <div
                    className="text-[10px] uppercase tracking-wider font-semibold"
                    style={{ color: getCategoryMeta(activeNode.category, palette).color }}
                  >
                    {getCategoryMeta(activeNode.category, palette).labelSingular}
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    Detalle del nodo
                  </div>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => setActiveNodeId(null)}
              >
                <X size={14} />
              </Button>
            </div>

            <div>
              <div className="font-semibold text-base leading-tight">
                {activeNode.title}
              </div>
              <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                {activeNode.description}
              </p>
            </div>

            {activeNode.bullets && activeNode.bullets.length > 0 && (
              <div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5 font-semibold">
                  Detalle
                </div>
                <ul className="space-y-1.5">
                  {activeNode.bullets.map((b, i) => (
                    <li key={i} className="text-xs flex gap-2">
                      <span
                        className="mt-1.5 w-1 h-1 rounded-full shrink-0"
                        style={{ background: getCategoryMeta(activeNode.category, palette).color }}
                      />
                      <span className="leading-relaxed text-foreground/80">{b}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2 text-xs">
              {activeNode.cost !== undefined && (
                <div className="px-2 py-1.5 rounded-md bg-muted/40">
                  <div className="text-[10px] text-muted-foreground">Coste</div>
                  <div className="font-semibold">
                    {activeNode.cost.toLocaleString("es-ES")} €
                  </div>
                </div>
              )}
              {activeNode.priority && (
                <div className="px-2 py-1.5 rounded-md bg-muted/40">
                  <div className="text-[10px] text-muted-foreground">Prioridad</div>
                  <div className="font-semibold capitalize">{activeNode.priority}</div>
                </div>
              )}
              {activeNode.time && (
                <div className="px-2 py-1.5 rounded-md bg-muted/40">
                  <div className="text-[10px] text-muted-foreground">Tiempo</div>
                  <div className="font-semibold">{activeNode.time}</div>
                </div>
              )}
              {activeNode.owner && (
                <div className="px-2 py-1.5 rounded-md bg-muted/40">
                  <div className="text-[10px] text-muted-foreground">Owner</div>
                  <div className="font-semibold">{activeNode.owner}</div>
                </div>
              )}
            </div>

            {activeNode.appSlug && (
              <div className="border-t border-border/40 pt-3">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5 font-semibold">
                  App Anclora relacionada
                </div>
                {(() => {
                  const app = ANCLORA_APPS.find((a) => a.slug === activeNode.appSlug);
                  if (!app) return <div className="text-xs">{activeNode.appSlug}</div>;
                  return (
                    <div
                      className="p-2.5 rounded-md border"
                      style={{
                        borderLeft: `3px solid ${app.accent}`,
                        background: `${app.accent}10`,
                      }}
                    >
                      <div className="text-sm font-semibold">{app.name}</div>
                      <div className="text-[11px] text-muted-foreground mb-1">
                        {app.tagline}
                      </div>
                      <div className="text-[11px] text-foreground/70">
                        {app.description}
                      </div>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {app.stack.slice(0, 4).map((s) => (
                          <Badge
                            key={s}
                            variant="secondary"
                            className="text-[9px] py-0 px-1.5 font-mono"
                          >
                            {s}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}

            {activeConnections.size > 0 && (
              <div className="border-t border-border/40 pt-3">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5 font-semibold">
                  Conexiones ({activeConnections.size})
                </div>
                <div className="space-y-1">
                  {map.nodes
                    .filter((n) => activeConnections.has(n.id))
                    .map((n) => (
                      <button
                        key={n.id}
                        onClick={() => setActiveNodeId(n.id)}
                        className="w-full text-left px-2 py-1.5 rounded-md hover:bg-muted/50 transition flex items-center gap-2"
                      >
                        <span
                          className="w-2 h-2 rounded-full"
                          style={{ background: getCategoryMeta(n.category, palette).color }}
                        />
                        <span className="text-xs truncate">{n.title}</span>
                      </button>
                    ))}
                </div>
              </div>
            )}
          </aside>
        )}
      </div>

      {/* Presentation mode */}
      <AnimatePresence>
        {presentationMode && map && (
          <PresentationMode
            map={map}
            slide={presoSlide}
            palette={palette}
            onClose={() => setPresentationMode(false)}
            onPrev={() => setPresoSlide((s) => Math.max(0, s - 1))}
            onNext={() =>
              setPresoSlide((s) =>
                Math.min(CATEGORY_ORDER.length - 1, s + 1)
              )
            }
          />
        )}
      </AnimatePresence>

      {/* Save dialog */}
      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {savedId ? "Guardar cambios" : "Guardar mapa visual"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-1 block">
                Título
              </label>
              <Input
                value={saveTitle}
                onChange={(e) => setSaveTitle(e.target.value)}
                placeholder="Título del mapa"
                maxLength={120}
              />
            </div>
            <div>
              <label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-1 block">
                Tags (separados por comas)
              </label>
              <Input
                value={saveTags}
                onChange={(e) => setSaveTags(e.target.value)}
                placeholder="estrategia, q1-2026, premium"
              />
            </div>
            <div className="text-[11px] text-muted-foreground bg-muted/40 rounded-md p-2">
              <strong className="text-foreground">Resumen:</strong> {map?.nodes.length || 0} nodos · {map?.apps.length || 0} apps Anclora · paleta {PALETTES[palette].name}
              {savedId && (
                <div className="mt-1 text-[10px] text-amber-500">● Actualizarás el mapa guardado existente</div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSaveDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={confirmSave}
              className="bg-gradient-to-r from-[#1dab89] to-[#6C48C5] text-white border-0"
            >
              <Save size={14} className="mr-1" />
              {savedId ? "Actualizar" : "Guardar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Catalog dialog — manages the Anclora apps used by the LLM */}
      <CatalogDialog open={catalogOpen} onOpenChange={setCatalogOpen} />

      {/* Library dialog */}
      <Dialog open={libraryOpen} onOpenChange={setLibraryOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bookmark size={16} /> Mapas guardados
              <span className="text-xs text-muted-foreground font-normal">
                ({filteredLibraryMaps.length}
                {filteredLibraryMaps.length !== savedMaps.maps.length
                  ? ` de ${savedMaps.maps.length}`
                  : ""})
              </span>
            </DialogTitle>
          </DialogHeader>

          {/* Filters */}
          {savedMaps.maps.length > 0 && (
            <div className="space-y-2 pb-2 border-b border-border/40">
              <div className="relative">
                <Search
                  size={13}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"
                />
                <Input
                  value={libSearch}
                  onChange={(e) => setLibSearch(e.target.value)}
                  placeholder="Buscar por título, idea, resumen o tag…"
                  className="pl-8 h-9 text-sm"
                />
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  onClick={() => setLibStarredOnly((v) => !v)}
                  className={`inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-md border transition ${
                    libStarredOnly
                      ? "border-[#D4AF37] bg-[#D4AF37]/15 text-[#D4AF37]"
                      : "border-border/60 bg-background/40 text-muted-foreground hover:bg-muted/40"
                  }`}
                  title="Solo favoritos"
                >
                  <Star
                    size={11}
                    className={libStarredOnly ? "fill-[#D4AF37]" : ""}
                  />
                  Favoritos
                </button>
                <span className="text-[10px] text-muted-foreground/60 uppercase tracking-wider px-1">
                  Paleta:
                </span>
                <button
                  onClick={() => setLibPaletteFilter("all")}
                  className={`text-[11px] px-2 py-1 rounded-md border transition ${
                    libPaletteFilter === "all"
                      ? "border-foreground/40 bg-foreground/10 text-foreground"
                      : "border-border/60 bg-background/40 text-muted-foreground hover:bg-muted/40"
                  }`}
                >
                  Todas
                </button>
                {(Object.values(PALETTES)).map((p) => (
                  <button
                    key={p.id}
                    onClick={() =>
                      setLibPaletteFilter(libPaletteFilter === p.id ? "all" : p.id)
                    }
                    className={`inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-md border transition ${
                      libPaletteFilter === p.id
                        ? "border-foreground/40 bg-foreground/10 text-foreground"
                        : "border-border/60 bg-background/40 text-muted-foreground hover:bg-muted/40"
                    }`}
                    title={p.description}
                  >
                    <span
                      className="w-2.5 h-2.5 rounded-sm"
                      style={{ background: p.accent }}
                    />
                    {p.name.replace("Anclora ", "").replace("Premium ", "")}
                  </button>
                ))}
                {allLibraryTags.length > 0 && (
                  <>
                    <span className="text-[10px] text-muted-foreground/60 uppercase tracking-wider px-1 ml-1">
                      Tag:
                    </span>
                    <button
                      onClick={() => setLibTagFilter("all")}
                      className={`text-[11px] px-2 py-1 rounded-md border transition ${
                        libTagFilter === "all"
                          ? "border-foreground/40 bg-foreground/10 text-foreground"
                          : "border-border/60 bg-background/40 text-muted-foreground hover:bg-muted/40"
                      }`}
                    >
                      Todos
                    </button>
                    {allLibraryTags.slice(0, 8).map((t) => (
                      <button
                        key={t}
                        onClick={() =>
                          setLibTagFilter(libTagFilter === t ? "all" : t)
                        }
                        className={`text-[11px] px-2 py-1 rounded-md border transition ${
                          libTagFilter === t
                            ? "border-[#6C48C5] bg-[#6C48C5]/15 text-[#a78bfa]"
                            : "border-border/60 bg-background/40 text-muted-foreground hover:bg-muted/40"
                        }`}
                      >
                        #{t}
                      </button>
                    ))}
                  </>
                )}
              </div>
            </div>
          )}

          <div className="flex-1 overflow-y-auto custom-scroll -mx-2 px-2">
            {savedMaps.loading ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                Cargando…
              </div>
            ) : savedMaps.maps.length === 0 ? (
              <div className="py-12 text-center">
                <Bookmark size={32} className="mx-auto mb-2 text-muted-foreground/50" />
                <div className="text-sm text-muted-foreground">
                  Aún no tienes mapas guardados.
                </div>
                <div className="text-xs text-muted-foreground/70 mt-1">
                  Genera un mapa y pulsa el botón <Save size={11} className="inline" /> para guardarlo.
                </div>
              </div>
            ) : filteredLibraryMaps.length === 0 ? (
              <div className="py-12 text-center">
                <Search size={28} className="mx-auto mb-2 text-muted-foreground/50" />
                <div className="text-sm text-muted-foreground">
                  Ningún mapa coincide con los filtros.
                </div>
                <button
                  onClick={() => {
                    setLibSearch("");
                    setLibPaletteFilter("all");
                    setLibStarredOnly(false);
                    setLibTagFilter("all");
                  }}
                  className="text-xs text-[#1dab89] hover:underline mt-2"
                >
                  Limpiar filtros
                </button>
              </div>
            ) : (
              <div className="space-y-1.5">
                {filteredLibraryMaps.map((m) => (
                  <div
                    key={m.id}
                    className={`group flex items-start gap-3 p-3 rounded-lg border transition cursor-pointer ${
                      savedId === m.id
                        ? "border-[#1dab89] bg-[#1dab89]/8"
                        : "border-border/50 bg-background/40 hover:bg-muted/40"
                    }`}
                    onClick={() => loadMapById(m.id)}
                  >
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleStarById(m.id, m.starred);
                      }}
                      className="mt-0.5 shrink-0"
                      title={m.starred ? "Quitar estrella" : "Marcar como favorito"}
                    >
                      <Star
                        size={16}
                        className={
                          m.starred
                            ? "fill-[#D4AF37] text-[#D4AF37]"
                            : "text-muted-foreground/40 group-hover:text-muted-foreground"
                        }
                      />
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold truncate">{m.title}</span>
                        {savedId === m.id && (
                          <Badge variant="secondary" className="text-[9px] py-0">actual</Badge>
                        )}
                      </div>
                      <div className="text-[11px] text-muted-foreground truncate">
                        {m.summary}
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-[10px] text-muted-foreground/70 flex-wrap">
                        <span>{m.nodesCount} nodos</span>
                        <span>·</span>
                        <span>{m.appsCount} apps</span>
                        <span>·</span>
                        <span className="inline-flex items-center gap-1">
                          <span
                            className="w-2 h-2 rounded-sm"
                            style={{
                              background: PALETTES[m.palette as PaletteId]?.accent || "#888",
                            }}
                          />
                          {PALETTES[m.palette as PaletteId]?.name || m.palette}
                        </span>
                        <span>·</span>
                        <span>{new Date(m.updatedAt).toLocaleDateString("es-ES")}</span>
                        {m.tags.length > 0 && (
                          <>
                            <span>·</span>
                            <div className="flex gap-1 flex-wrap">
                              {m.tags.slice(0, 3).map((t) => (
                                <span
                                  key={t}
                                  className="px-1.5 py-0 rounded bg-muted/60 text-[9px]"
                                >
                                  {t}
                                </span>
                              ))}
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteMapById(m.id, m.title);
                      }}
                      className="shrink-0 p-1.5 rounded hover:bg-destructive/15 text-muted-foreground hover:text-destructive transition opacity-0 group-hover:opacity-100"
                      title="Eliminar"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function EmptyState({
  onPickExample,
  palette = "anclora",
}: {
  onPickExample: (ex: string) => void;
  palette?: PaletteId;
}) {
  const visibleCats = CATEGORY_ORDER.filter((c) => c !== "idea");
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center p-4 md:p-6 overflow-hidden">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-4xl flex flex-col items-center text-center"
      >
        {/* Brand + tagline row — compact premium header */}
        <div className="flex items-center gap-3 mb-3">
          <div className="relative w-10 h-10 rounded-xl overflow-hidden flex items-center justify-center bg-gradient-to-br from-[#1dab89] via-[#6C48C5] to-[#D4AF37] float shrink-0">
            <div className="absolute inset-[3px] rounded-lg bg-[#0a0f1f] flex items-center justify-center">
              <Eye size={16} className="text-white" strokeWidth={2.4} />
            </div>
          </div>
          <div className="leading-tight text-left">
            <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground/70 font-semibold">
              Anclora Group
            </div>
            <div className="text-lg font-bold tracking-tight">
              Anclora<span className="gradient-text">VisionFlow</span>
            </div>
          </div>
        </div>

        {/* Hero headline — single line, big and bold */}
        <h1 className="text-2xl md:text-[2rem] lg:text-[2.2rem] font-bold tracking-tight leading-[1.1] mb-2 max-w-3xl">
          Convierte cualquier idea en un{" "}
          <span className="gradient-text">mapa visual inteligente</span>
        </h1>
        <p className="text-xs md:text-sm text-muted-foreground max-w-2xl mb-4 leading-relaxed">
          Transforma ideas, proyectos o problemas del ecosistema Anclora en un tablero interactivo con
          objetivos, pasos, riesgos, herramientas, costes, prioridades, KPIs, stakeholders y timeline — generados automáticamente.
        </p>

        {/* Category chips — compact horizontal strip */}
        <div className="flex items-center justify-center flex-wrap gap-1.5 mb-5 max-w-3xl">
          {visibleCats.map((cat) => {
            const meta = getCategoryMeta(cat, palette);
            const Icon = ICONS[meta.icon] || Target;
            return (
              <span
                key={cat}
                className="inline-flex items-center gap-1.5 text-[10px] font-medium px-2 py-1 rounded-full border border-border/60 bg-background/40"
                title={meta.description}
              >
                <Icon size={10} style={{ color: meta.color }} />
                <span className="text-foreground/80">{meta.label}</span>
              </span>
            );
          })}
        </div>

        {/* Examples — compact two-column grid */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.15 }}
          className="w-full max-w-3xl"
        >
          <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground/70 mb-2 font-semibold text-center">
            Prueba con un ejemplo
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
            {EXAMPLE_IDEAS.map((ex, i) => (
              <button
                key={i}
                onClick={() => onPickExample(ex)}
                className="text-left text-xs px-3 py-2 rounded-lg bg-muted/30 hover:bg-muted/60 border border-border/50 transition flex items-start gap-2 group"
              >
                <Sparkles
                  size={12}
                  className="mt-0.5 text-[#6C48C5] shrink-0 group-hover:scale-110 transition"
                />
                <span className="text-foreground/80 line-clamp-2 leading-snug">{ex}</span>
              </button>
            ))}
          </div>
        </motion.div>

        {/* Footer hint */}
        <div className="mt-4 text-[10px] text-muted-foreground/50">
          Pulsa <kbd className="font-mono px-1 py-0.5 rounded bg-muted/60 border border-border/40">Enter</kbd> para generar · <kbd className="font-mono px-1 py-0.5 rounded bg-muted/60 border border-border/40">P</kbd> presentación · <kbd className="font-mono px-1 py-0.5 rounded bg-muted/60 border border-border/40">±/0</kbd> zoom
        </div>
      </motion.div>
    </div>
  );
}

function LoadingState({ palette = "anclora" }: { palette?: PaletteId }) {
  return (
    <div className="absolute inset-0 flex items-center justify-center p-8">
      <div className="text-center">
        <div className="relative inline-flex w-20 h-20 mb-4">
          <div className="absolute inset-0 rounded-full border-2 border-muted/40" />
          <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-[#1dab89] border-r-[#6C48C5] spin-slow" />
          <Wand2
            size={26}
            className="absolute inset-0 m-auto text-[#D4AF37] ai-pulse"
          />
        </div>
        <div className="font-semibold text-base mb-1">
          Tejiendo tu mapa visual…
        </div>
        <div className="text-sm text-muted-foreground max-w-sm">
          Analizando tu idea, conectando con el ecosistema Anclora y generando objetivos, pasos, riesgos, herramientas, costes, KPIs, stakeholders y timeline.
        </div>
        <div className="mt-5 flex justify-center gap-1.5">
          {CATEGORY_ORDER.map((c) => (
            <span
              key={c}
              className="w-1.5 h-1.5 rounded-full ai-pulse"
              style={{
                background: getCategoryMeta(c, palette).color,
                animationDelay: `${Math.random() * 0.5}s`,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function PresentationMode({
  map,
  slide,
  palette,
  onClose,
  onPrev,
  onNext,
}: {
  map: VisionMap;
  slide: number;
  palette: PaletteId;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
}) {
  const slides = ["idea", ...CATEGORY_ORDER.filter((c) => c !== "idea")];
  const currentCat = slides[slide] as NodeCategory;
  const meta = getCategoryMeta(currentCat, palette);
  const Icon = ICONS[meta.icon] || Target;
  const nodes = map.nodes.filter((n) => n.category === currentCat);
  const ideaNode = map.nodes.find((n) => n.category === "idea");

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="presentation-mode flex flex-col"
    >
      <div className="flex items-center justify-between p-6 border-b border-white/5">
        <div className="flex items-center gap-4">
          <div className="text-white/40 text-sm font-mono">
            {String(slide + 1).padStart(2, "0")} / {String(slides.length).padStart(2, "0")}
          </div>
          <div className="text-white font-semibold">
            {ideaNode?.title.slice(0, 70)}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={onPrev} className="text-white/80 hover:text-white hover:bg-white/10">
            Anterior
          </Button>
          <Button variant="ghost" size="sm" onClick={onNext} className="text-white/80 hover:text-white hover:bg-white/10">
            Siguiente
          </Button>
          <Button variant="ghost" size="icon" onClick={onClose} className="text-white/80 hover:text-white hover:bg-white/10">
            <X size={16} />
          </Button>
        </div>
      </div>

      <div className="flex-1 flex flex-col p-8 md:p-14 overflow-hidden">
        <motion.div
          key={currentCat + slide}
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="flex-1 flex flex-col"
        >
          <div className="flex items-center gap-3 mb-2">
            <span
              className="inline-flex w-12 h-12 rounded-xl items-center justify-center"
              style={{ background: `${meta.color}22`, color: meta.color }}
            >
              <Icon size={22} />
            </span>
            <div>
              <div
                className="text-xs uppercase tracking-wider font-semibold"
                style={{ color: meta.color }}
              >
                {meta.label}
              </div>
              <h2 className="text-3xl md:text-5xl font-bold text-white tracking-tight">
                {currentCat === "idea" ? ideaNode?.title : meta.label}
              </h2>
            </div>
          </div>

          {currentCat === "idea" ? (
            <div className="max-w-3xl">
              <p className="text-lg md:text-xl text-white/80 leading-relaxed">
                {ideaNode?.description}
              </p>
              <p className="text-base text-white/60 mt-6 leading-relaxed max-w-2xl">
                {map.summary}
              </p>
              <div className="mt-8 flex flex-wrap gap-2">
                {map.apps.map((slug) => {
                  const app = ANCLORA_APPS.find((a) => a.slug === slug);
                  if (!app) return null;
                  return (
                    <span
                      key={slug}
                      className="text-xs px-2.5 py-1 rounded-full border"
                      style={{
                        borderColor: `${app.accent}55`,
                        color: app.accent,
                        background: `${app.accent}10`,
                      }}
                    >
                      {app.name}
                    </span>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mt-4 overflow-y-auto custom-scroll">
              {nodes.length === 0 ? (
                <div className="text-white/50 italic">
                  No se generaron nodos en esta categoría.
                </div>
              ) : (
                nodes.map((n) => (
                  <div
                    key={n.id}
                    className="rounded-xl p-4 border border-white/8"
                    style={{
                      background: `${meta.color}0e`,
                      borderColor: `${meta.color}33`,
                    }}
                  >
                    <div className="font-semibold text-white mb-1.5 leading-tight">
                      {n.title}
                    </div>
                    <p className="text-sm text-white/70 leading-relaxed mb-2">
                      {n.description}
                    </p>
                    {n.bullets && (
                      <ul className="space-y-1 mt-2">
                        {n.bullets.map((b, i) => (
                          <li
                            key={i}
                            className="text-xs text-white/60 flex gap-1.5"
                          >
                            <span
                              className="mt-1.5 w-1 h-1 rounded-full shrink-0"
                              style={{ background: meta.color }}
                            />
                            {b}
                          </li>
                        ))}
                      </ul>
                    )}
                    <div className="flex gap-2 mt-2 flex-wrap">
                      {n.cost !== undefined && (
                        <span className="text-xs text-white/80 font-semibold">
                          {n.cost.toLocaleString("es-ES")} €
                        </span>
                      )}
                      {n.priority && (
                        <span
                          className="text-[10px] uppercase px-1.5 py-0.5 rounded font-bold"
                          style={{
                            background: `${meta.color}22`,
                            color: meta.color,
                          }}
                        >
                          {n.priority}
                        </span>
                      )}
                      {n.time && (
                        <span className="text-xs text-white/50">{n.time}</span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </motion.div>

        {/* Progress bar */}
        <div className="mt-6 h-0.5 bg-white/5 rounded-full overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            style={{
              background: `linear-gradient(90deg, ${meta.color}, #fff)`,
            }}
            initial={{ width: 0 }}
            animate={{ width: `${((slide + 1) / slides.length) * 100}%` }}
            transition={{ duration: 0.4 }}
          />
        </div>
      </div>
    </motion.div>
  );
}
