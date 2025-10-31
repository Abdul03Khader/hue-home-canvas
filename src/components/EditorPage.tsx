import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Canvas as FabricCanvas, FabricImage, Polygon, Circle, Polyline } from "fabric";
import { 
  Upload, 
  Mouse, 
  Brush, 
  Undo2, 
  Redo2, 
  Download, 
  Save,
  Home,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Palette,
  Layers
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { LayersPanel, type Layer } from "./editor/LayersPanel";
import { HistoryPanel, type HistoryEntry } from "./editor/HistoryPanel";
import { supabase } from "@/integrations/supabase/client";

// Popular paint colors from Asian Paints, Dulux, Berger, Nippon, Kansai Nerolac
const paintColors = [
  { name: "Pure White", hex: "#FFFFFF", brand: "Asian Paints" },
  { name: "Soft Cream", hex: "#F5F5DC", brand: "Dulux" },
  { name: "Warm Beige", hex: "#D4C5B9", brand: "Berger" },
  { name: "Sky Blue", hex: "#87CEEB", brand: "Asian Paints" },
  { name: "Mint Green", hex: "#98D8C8", brand: "Dulux" },
  { name: "Coral Blush", hex: "#FF7F50", brand: "Berger" },
  { name: "Lavender", hex: "#E6E6FA", brand: "Asian Paints" },
  { name: "Sunshine Yellow", hex: "#FFD700", brand: "Dulux" },
  { name: "Terracotta", hex: "#E2725B", brand: "Berger" },
  { name: "Sage Green", hex: "#9CAF88", brand: "Asian Paints" },
  { name: "Navy Blue", hex: "#001F3F", brand: "Dulux" },
  { name: "Charcoal Gray", hex: "#36454F", brand: "Berger" },
  { name: "Peach", hex: "#FFDAB9", brand: "Asian Paints" },
  { name: "Aqua", hex: "#00FFFF", brand: "Dulux" },
  { name: "Rose Pink", hex: "#FF66B2", brand: "Berger" },
  { name: "Butter Yellow", hex: "#FFFACD", brand: "Nippon" },
  { name: "Ocean Blue", hex: "#4682B4", brand: "Kansai Nerolac" },
  { name: "Dusty Rose", hex: "#DCAE96", brand: "Asian Paints" },
  { name: "Moss Green", hex: "#8A9A5B", brand: "Dulux" },
  { name: "Burgundy", hex: "#800020", brand: "Berger" },
  { name: "Ivory", hex: "#FFFFF0", brand: "Nippon" },
  { name: "Slate Blue", hex: "#6A5ACD", brand: "Kansai Nerolac" },
  { name: "Sandstone", hex: "#C2B280", brand: "Asian Paints" },
  { name: "Forest Green", hex: "#228B22", brand: "Dulux" },
  { name: "Mauve", hex: "#E0B0FF", brand: "Berger" },
  { name: "Honey Gold", hex: "#FFA500", brand: "Nippon" },
  { name: "Steel Gray", hex: "#71797E", brand: "Kansai Nerolac" },
  { name: "Coral Pink", hex: "#FF6B9D", brand: "Asian Paints" },
  { name: "Olive Green", hex: "#808000", brand: "Dulux" },
  { name: "Plum", hex: "#8E4585", brand: "Berger" },
  { name: "Pearl White", hex: "#F8F6F0", brand: "Nippon" },
  { name: "Teal", hex: "#008080", brand: "Kansai Nerolac" },
  { name: "Mustard", hex: "#FFDB58", brand: "Asian Paints" },
  { name: "Crimson", hex: "#DC143C", brand: "Dulux" },
  { name: "Lilac", hex: "#C8A2C8", brand: "Berger" },
];

export const EditorPage = () => {
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [fabricCanvas, setFabricCanvas] = useState<FabricCanvas | null>(null);
  const [activeTool, setActiveTool] = useState<"select" | "polygon" | "brush">("select");
  const [selectedColor, setSelectedColor] = useState(paintColors[0].hex);
  const [isDrawingPolygon, setIsDrawingPolygon] = useState(false);
  const [polygonPoints, setPolygonPoints] = useState<{ x: number; y: number }[]>([]);
  const [previewPolyline, setPreviewPolyline] = useState<Polyline | null>(null);
  const [previewCircles, setPreviewCircles] = useState<Circle[]>([]);
  const [layers, setLayers] = useState<Layer[]>([]);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [currentHistoryIndex, setCurrentHistoryIndex] = useState(-1);
  const [currentDesignId, setCurrentDesignId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = new FabricCanvas(canvasRef.current, {
      width: 1000,
      height: 700,
      backgroundColor: "#f5f5f5",
    });

    setFabricCanvas(canvas);

    return () => {
      canvas.dispose();
    };
  }, []);

  useEffect(() => {
    if (!fabricCanvas) return;

    fabricCanvas.isDrawingMode = activeTool === "brush";
    
    if (activeTool === "brush" && fabricCanvas.freeDrawingBrush) {
      fabricCanvas.freeDrawingBrush.color = selectedColor;
      fabricCanvas.freeDrawingBrush.width = 5;
    }

    if (activeTool === "polygon") {
      fabricCanvas.on("mouse:down", handlePolygonClick);
    } else {
      fabricCanvas.off("mouse:down", handlePolygonClick);
    }

    return () => {
      fabricCanvas.off("mouse:down", handlePolygonClick);
    };
  }, [activeTool, selectedColor, fabricCanvas, polygonPoints]);

  const handlePolygonClick = (options: any) => {
    if (!fabricCanvas || activeTool !== "polygon") return;

    const pointer = fabricCanvas.getPointer(options.e);
    const newPoints = [...polygonPoints, { x: pointer.x, y: pointer.y }];
    
    // Add circle marker at point
    const circle = new Circle({
      left: pointer.x - 3,
      top: pointer.y - 3,
      radius: 3,
      fill: "red",
      selectable: false,
      evented: false,
    });
    fabricCanvas.add(circle);
    setPreviewCircles([...previewCircles, circle]);

    // Update or create polyline for all points
    if (previewPolyline) {
      fabricCanvas.remove(previewPolyline);
    }
    
    if (newPoints.length > 1) {
      const polyline = new Polyline(newPoints, {
        stroke: selectedColor,
        strokeWidth: 2,
        fill: 'transparent',
        selectable: false,
        evented: false,
        strokeDashArray: [5, 5],
      });
      fabricCanvas.add(polyline);
      setPreviewPolyline(polyline);
    }

    setPolygonPoints(newPoints);
  };

  const addToHistory = (action: string) => {
    if (!fabricCanvas) return;
    
    const newEntry: HistoryEntry = {
      id: Date.now().toString(),
      action,
      timestamp: new Date(),
      canvasData: fabricCanvas.toJSON(),
    };

    const newHistory = history.slice(0, currentHistoryIndex + 1);
    newHistory.push(newEntry);
    setHistory(newHistory);
    setCurrentHistoryIndex(newHistory.length - 1);
  };

  const completePolygon = () => {
    if (!fabricCanvas || polygonPoints.length < 3) {
      toast.error("Need at least 3 points to create a selection");
      return;
    }

    const polygon = new Polygon(polygonPoints, {
      fill: selectedColor,
      opacity: 0.6,
      stroke: selectedColor,
      strokeWidth: 2,
    });

    const layerId = Date.now().toString();
    polygon.set('layerId', layerId);
    fabricCanvas.add(polygon);
    
    // Add to layers
    const newLayer: Layer = {
      id: layerId,
      name: `Selection ${layers.length + 1}`,
      color: selectedColor,
      visible: true,
      fabricObject: polygon,
    };
    setLayers([...layers, newLayer]);
    
    // Clear preview objects efficiently
    if (previewPolyline) {
      fabricCanvas.remove(previewPolyline);
      setPreviewPolyline(null);
    }
    previewCircles.forEach(circle => fabricCanvas.remove(circle));
    setPreviewCircles([]);
    
    setPolygonPoints([]);
    setIsDrawingPolygon(false);
    addToHistory(`Created ${newLayer.name}`);
    toast.success("Area selected! Color applied.");
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !fabricCanvas) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const imgUrl = event.target?.result as string;
      
      FabricImage.fromURL(imgUrl).then((img) => {
        // Scale image to fit canvas
        const scale = Math.min(
          fabricCanvas.width! / img.width!,
          fabricCanvas.height! / img.height!
        );
        img.scale(scale);
        img.set({
          left: 0,
          top: 0,
          selectable: false,
        });
        
        fabricCanvas.clear();
        fabricCanvas.backgroundImage = img;
        fabricCanvas.renderAll();
        toast.success("Image uploaded successfully!");
      });
    };
    reader.readAsDataURL(file);
  };

  const handleDeleteLayer = (layerId: string) => {
    if (!fabricCanvas) return;
    
    const layer = layers.find(l => l.id === layerId);
    if (layer && layer.fabricObject) {
      fabricCanvas.remove(layer.fabricObject);
      setLayers(layers.filter(l => l.id !== layerId));
      addToHistory(`Deleted ${layer.name}`);
      toast.success("Layer deleted");
    }
  };

  const handleToggleVisibility = (layerId: string) => {
    if (!fabricCanvas) return;
    
    const layer = layers.find(l => l.id === layerId);
    if (layer && layer.fabricObject) {
      layer.fabricObject.visible = !layer.visible;
      layer.visible = !layer.visible;
      setLayers([...layers]);
      fabricCanvas.renderAll();
    }
  };

  const handleRestoreHistory = (index: number) => {
    if (!fabricCanvas || !history[index]) return;
    
    fabricCanvas.loadFromJSON(history[index].canvasData, () => {
      fabricCanvas.renderAll();
      setCurrentHistoryIndex(index);
      // Rebuild layers from canvas objects
      const newLayers: Layer[] = [];
      fabricCanvas.getObjects().forEach(obj => {
        if (obj.get('layerId')) {
          newLayers.push({
            id: obj.get('layerId') as string,
            name: `Selection ${newLayers.length + 1}`,
            color: obj.get('fill') as string || selectedColor,
            visible: obj.visible || true,
            fabricObject: obj,
          });
        }
      });
      setLayers(newLayers);
      toast.success("History restored");
    });
  };

  const handleUndo = () => {
    if (currentHistoryIndex > 0) {
      handleRestoreHistory(currentHistoryIndex - 1);
    }
  };

  const handleRedo = () => {
    if (currentHistoryIndex < history.length - 1) {
      handleRestoreHistory(currentHistoryIndex + 1);
    }
  };

  const handleZoomIn = () => {
    if (!fabricCanvas) return;
    const zoom = fabricCanvas.getZoom();
    fabricCanvas.setZoom(zoom * 1.1);
  };

  const handleZoomOut = () => {
    if (!fabricCanvas) return;
    const zoom = fabricCanvas.getZoom();
    fabricCanvas.setZoom(zoom * 0.9);
  };

  const handleReset = () => {
    if (!fabricCanvas) return;
    fabricCanvas.setZoom(1);
    fabricCanvas.viewportTransform = [1, 0, 0, 1, 0, 0];
    fabricCanvas.renderAll();
  };

  const handleDownload = () => {
    if (!fabricCanvas) return;
    
    const dataURL = fabricCanvas.toDataURL({
      format: 'png',
      quality: 1,
      multiplier: 1,
    });
    
    const link = document.createElement('a');
    link.download = 'home-visualizer-design.png';
    link.href = dataURL;
    link.click();
    
    toast.success("Design downloaded!");
  };

  const handleSave = async () => {
    if (!fabricCanvas) return;
    
    const json = fabricCanvas.toJSON();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      // Fallback to localStorage for guest users
      const designs = JSON.parse(localStorage.getItem("visualizer_designs") || "[]");
      designs.push({
        id: Date.now(),
        data: json,
        createdAt: new Date().toISOString(),
      });
      localStorage.setItem("visualizer_designs", JSON.stringify(designs));
      toast.success("Design saved locally!");
      return;
    }

    try {
      if (currentDesignId) {
        // Update existing design
        const { error } = await supabase
          .from("designs")
          .update({
            canvas_data: json,
            updated_at: new Date().toISOString(),
          })
          .eq("id", currentDesignId);

        if (error) throw error;
        
        // Save to history
        await supabase.from("design_history").insert({
          design_id: currentDesignId,
          canvas_data: json,
          action_type: "update",
        });
        
        toast.success("Design updated!");
      } else {
        // Create new design
        const { data, error } = await supabase
          .from("designs")
          .insert({
            user_id: user.id,
            canvas_data: json,
            name: `Design ${new Date().toLocaleDateString()}`,
          })
          .select()
          .single();

        if (error) throw error;
        
        setCurrentDesignId(data.id);
        
        // Save initial history
        await supabase.from("design_history").insert({
          design_id: data.id,
          canvas_data: json,
          action_type: "create",
        });
        
        toast.success("Design saved to database!");
      }
    } catch (error) {
      console.error("Save error:", error);
      toast.error("Failed to save design");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
              <Home className="h-5 w-5" />
            </Button>
            <h1 className="text-xl font-bold text-foreground">
              Home Visualizer Pro
            </h1>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleSave}>
              <Save className="h-4 w-4 mr-2" />
              Save
            </Button>
            <Button variant="hero" size="sm" onClick={handleDownload}>
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
          </div>
        </div>
      </header>

      <div className="flex h-[calc(100vh-4rem)]">
        {/* Left Toolbar */}
        <aside className="w-20 border-r border-border bg-card flex flex-col items-center py-6 gap-4">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            className="hidden"
          />
          <Button
            variant={activeTool === "select" ? "default" : "ghost"}
            size="icon"
            onClick={() => {
              setActiveTool("select");
              fileInputRef.current?.click();
            }}
            title="Upload Image"
          >
            <Upload className="h-5 w-5" />
          </Button>
          
          <Button
            variant={activeTool === "select" ? "default" : "ghost"}
            size="icon"
            onClick={() => setActiveTool("select")}
            title="Select Mode"
          >
            <Mouse className="h-5 w-5" />
          </Button>

          <Button
            variant={activeTool === "polygon" ? "default" : "ghost"}
            size="icon"
            onClick={() => {
              setActiveTool("polygon");
              setIsDrawingPolygon(true);
            }}
            title="Polygon Selection"
          >
            <Palette className="h-5 w-5" />
          </Button>

          <Button
            variant={activeTool === "brush" ? "default" : "ghost"}
            size="icon"
            onClick={() => setActiveTool("brush")}
            title="Brush Tool"
          >
            <Brush className="h-5 w-5" />
          </Button>

          <div className="border-t border-border w-full my-2" />

          <Button variant="ghost" size="icon" onClick={handleZoomIn} title="Zoom In">
            <ZoomIn className="h-5 w-5" />
          </Button>

          <Button variant="ghost" size="icon" onClick={handleZoomOut} title="Zoom Out">
            <ZoomOut className="h-5 w-5" />
          </Button>

          <Button variant="ghost" size="icon" onClick={handleReset} title="Reset View">
            <RotateCcw className="h-5 w-5" />
          </Button>

          <Button 
            variant="ghost" 
            size="icon" 
            onClick={handleUndo} 
            title="Undo"
            disabled={currentHistoryIndex <= 0}
          >
            <Undo2 className="h-5 w-5" />
          </Button>

          <Button 
            variant="ghost" 
            size="icon" 
            onClick={handleRedo} 
            title="Redo"
            disabled={currentHistoryIndex >= history.length - 1}
          >
            <Redo2 className="h-5 w-5" />
          </Button>
        </aside>

        {/* Main Canvas */}
        <main className="flex-1 p-6 overflow-auto">
          <div className="max-w-6xl mx-auto">
            {isDrawingPolygon && polygonPoints.length > 0 && (
              <div className="mb-4 flex gap-2 items-center">
                <Card className="p-3 flex gap-2 items-center animate-fade-in">
                  <span className="text-sm">Points: {polygonPoints.length}</span>
                  <Button size="sm" variant="hero" onClick={completePolygon}>
                    Complete Selection
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={() => {
                      if (previewPolyline && fabricCanvas) {
                        fabricCanvas.remove(previewPolyline);
                        setPreviewPolyline(null);
                      }
                      previewCircles.forEach(circle => fabricCanvas?.remove(circle));
                      setPreviewCircles([]);
                      setPolygonPoints([]);
                      setIsDrawingPolygon(false);
                    }}
                  >
                    Cancel
                  </Button>
                </Card>
              </div>
            )}
            
            <div className="bg-white rounded-lg shadow-2xl overflow-hidden border-2 border-border">
              <canvas ref={canvasRef} />
            </div>
          </div>
        </main>

        {/* Right Sidebar - Color Palette & Layers */}
        <aside className="w-80 border-l border-border bg-card p-6 flex flex-col gap-4">
          <div>
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Palette className="h-5 w-5 text-primary" />
              Paint Colors
            </h2>
          
            <ScrollArea className="h-[300px]">
              <div className="space-y-2">
                {paintColors.map((color) => (
                  <button
                    key={color.hex}
                    onClick={() => setSelectedColor(color.hex)}
                    className={`w-full p-3 rounded-lg border-2 transition-smooth hover:scale-105 flex items-center gap-3 ${
                      selectedColor === color.hex 
                        ? "border-primary shadow-glow" 
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    <div 
                      className="w-10 h-10 rounded-md shadow-md border border-border"
                      style={{ backgroundColor: color.hex }}
                    />
                    <div className="text-left flex-1">
                      <div className="font-medium text-sm">{color.name}</div>
                      <div className="text-xs text-muted-foreground">{color.brand}</div>
                      <div className="text-xs text-muted-foreground font-mono">{color.hex}</div>
                    </div>
                  </button>
                ))}
              </div>
            </ScrollArea>
          </div>

          <LayersPanel
            layers={layers}
            onDeleteLayer={handleDeleteLayer}
            onToggleVisibility={handleToggleVisibility}
          />

          <HistoryPanel
            history={history}
            currentIndex={currentHistoryIndex}
            onRestore={handleRestoreHistory}
          />
        </aside>
      </div>
    </div>
  );
};
