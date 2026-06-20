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
  Euro,
  Eye,
  FileDown,
  Footprints,
  Image as ImageIcon,
  Layers,
  LayoutGrid,
  Lightbulb,
  Maximize2,
  Minus,
  Plus,
  Rocket,
  RotateCcw,
  Sparkles,
  Target,
  Wand2,
  Wrench,
  X,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { toast } from "sonner";
import { VisionNodeCard } from "./VisionNodeCard";
import { ConnectionsLayer } from "./ConnectionsLayer";
import { ANCLORA_APPS } from "@/lib/anclora-ecosystem";
import {
  CATEGORY_META,
  CATEGORY_ORDER,
  autoConnect,
  layoutVisionMap,
  type NodeCategory,
  type VisionMap,
  type VisionNode,
} from "@/lib/vision-map";

const ICONS: Record<string, LucideIcon> = {
  Lightbulb,
  Target,
  Footprints,
  AlertTriangle,
  Wrench,
  Euro,
  ArrowUpWideNarrow,
  Rocket,
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

  const boardRef = useRef<HTMLDivElement>(null);
  const dragStart = useRef<{ x: number; y: number; nodeX: number; nodeY: number } | null>(null);
  const panStart = useRef<{ x: number; y: number; panX: number; panY: number } | null>(null);

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

    try {
      const res = await fetch("/api/vision/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idea }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "No se pudo generar el mapa");
      }
      setMap(data);
      toast.success("Mapa visual generado");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error desconocido";
      setError(msg);
      toast.error(`Error: ${msg}`);
    } finally {
      setLoading(false);
    }
  }, [idea]);

  const relayout = useCallback(() => {
    if (!map) return;
    const laidOut = layoutVisionMap(map.nodes);
    const connections = autoConnect(laidOut);
    setMap({ ...map, nodes: laidOut, connections });
    toast.success("Layout reiniciado");
  }, [map]);

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

          {map && (
            <div className="flex items-center gap-1.5">
              <TooltipProvider delayDuration={300}>
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
              </TooltipProvider>
            </div>
          )}
        </div>

        {/* Example chips */}
        {!map && !loading && (
          <div className="px-4 md:px-6 pb-3 flex items-center gap-2 flex-wrap">
            <span className="text-[11px] text-muted-foreground uppercase tracking-wider">
              Ejemplos:
            </span>
            {EXAMPLE_IDEAS.slice(0, 3).map((ex, i) => (
              <button
                key={i}
                onClick={() => setIdea(ex)}
                className="text-[11px] px-2.5 py-1 rounded-full bg-muted/60 hover:bg-muted border border-border/60 transition text-foreground/80 max-w-md truncate"
                title={ex}
              >
                {ex.length > 60 ? ex.slice(0, 60) + "…" : ex}
              </button>
            ))}
          </div>
        )}
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
                  const meta = CATEGORY_META[cat];
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
          {!map && !loading && <EmptyState onPickExample={(ex) => setIdea(ex)} />}

          {loading && <LoadingState />}

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
                    background: `${CATEGORY_META[activeNode.category].color}22`,
                    color: CATEGORY_META[activeNode.category].color,
                  }}
                >
                  {(() => {
                    const Icon = ICONS[CATEGORY_META[activeNode.category].icon] || Target;
                    return <Icon size={17} />;
                  })()}
                </span>
                <div>
                  <div
                    className="text-[10px] uppercase tracking-wider font-semibold"
                    style={{ color: CATEGORY_META[activeNode.category].color }}
                  >
                    {CATEGORY_META[activeNode.category].labelSingular}
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
                        style={{ background: CATEGORY_META[activeNode.category].color }}
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
                          style={{ background: CATEGORY_META[n.category].color }}
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
    </div>
  );
}

function EmptyState({ onPickExample }: { onPickExample: (ex: string) => void }) {
  return (
    <div className="absolute inset-0 flex items-center justify-center p-6 overflow-y-auto custom-scroll">
      <div className="max-w-3xl w-full text-center">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-[#1dab89] via-[#6C48C5] to-[#D4AF37] mb-4 float">
            <Eye size={28} className="text-white" strokeWidth={2.4} />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-2">
            Convierte cualquier idea en un <span className="gradient-text">mapa visual inteligente</span>
          </h1>
          <p className="text-muted-foreground max-w-xl mx-auto mb-6">
            AncloraVisionFlow transforma ideas, proyectos o problemas del ecosistema Anclora Group en un tablero interactivo con objetivos, pasos, riesgos, herramientas, costes, prioridades y próximos pasos — generados automáticamente.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-2.5 mb-8 max-w-2xl mx-auto"
        >
          {CATEGORY_ORDER.filter((c) => c !== "idea").map((cat) => {
            const meta = CATEGORY_META[cat];
            const Icon = ICONS[meta.icon] || Target;
            return (
              <div
                key={cat}
                className="glass rounded-lg p-3 border border-border/50 text-left"
              >
                <span
                  className="inline-flex w-7 h-7 rounded-md items-center justify-center mb-1.5"
                  style={{ background: `${meta.color}22`, color: meta.color }}
                >
                  <Icon size={14} />
                </span>
                <div className="text-xs font-semibold">{meta.label}</div>
                <div className="text-[10px] text-muted-foreground leading-tight mt-0.5">
                  {meta.description}
                </div>
              </div>
            );
          })}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
        >
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2 font-semibold">
            Prueba con un ejemplo
          </div>
          <div className="flex flex-col gap-1.5 max-w-xl mx-auto">
            {EXAMPLE_IDEAS.map((ex, i) => (
              <button
                key={i}
                onClick={() => onPickExample(ex)}
                className="text-left text-sm px-3 py-2 rounded-md bg-muted/40 hover:bg-muted border border-border/50 transition flex items-start gap-2"
              >
                <Sparkles size={13} className="mt-0.5 text-[#6C48C5] shrink-0" />
                <span className="text-foreground/80">{ex}</span>
              </button>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}

function LoadingState() {
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
          Analizando tu idea, conectando con el ecosistema Anclora y generando objetivos, pasos, riesgos, herramientas y costes.
        </div>
        <div className="mt-5 flex justify-center gap-1.5">
          {CATEGORY_ORDER.map((c) => (
            <span
              key={c}
              className="w-1.5 h-1.5 rounded-full ai-pulse"
              style={{
                background: CATEGORY_META[c].color,
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
  onClose,
  onPrev,
  onNext,
}: {
  map: VisionMap;
  slide: number;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
}) {
  const slides = ["idea", ...CATEGORY_ORDER.filter((c) => c !== "idea")];
  const currentCat = slides[slide] as NodeCategory;
  const meta = CATEGORY_META[currentCat];
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
