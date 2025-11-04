import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Canvas as FabricCanvas, FabricImage, Polygon, Circle, Polyline } from "fabric";
import { Upload, Mouse, Brush, Undo2, Redo2, Download, Save, Home, ZoomIn, ZoomOut, RotateCcw, Palette, Layers } from "lucide-react";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { LayersPanel, type Layer } from "./editor/LayersPanel";
import { HistoryPanel, type HistoryEntry } from "./editor/HistoryPanel";
import { supabase } from "@/integrations/supabase/client";
import { colors } from "@/data/colors";

// Convert RGB string to hex
const rgbToHex = (rgb: string): string => {
  const matches = rgb.match(/\d+/g);
  if (!matches || matches.length !== 3) return "#000000";
  
  const r = parseInt(matches[0]);
  const g = parseInt(matches[1]);
  const b = parseInt(matches[2]);
  
  return "#" + [r, g, b].map(x => {
    const hex = x.toString(16);
    return hex.length === 1 ? "0" + hex : hex;
  }).join("");
};

// Edge detection helper functions
const detectEdges = (imageData: ImageData): boolean[][] => {
  const { width, height, data } = imageData;
  const edges: boolean[][] = Array(height).fill(0).map(() => Array(width).fill(false));
  const threshold = 30;

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = (y * width + x) * 4;
      
      const gx = 
        -1 * data[((y - 1) * width + (x - 1)) * 4] + 
        1 * data[((y - 1) * width + (x + 1)) * 4] +
        -2 * data[(y * width + (x - 1)) * 4] + 
        2 * data[(y * width + (x + 1)) * 4] +
        -1 * data[((y + 1) * width + (x - 1)) * 4] + 
        1 * data[((y + 1) * width + (x + 1)) * 4];
      
      const gy = 
        -1 * data[((y - 1) * width + (x - 1)) * 4] + 
        -2 * data[((y - 1) * width + x) * 4] +
        -1 * data[((y - 1) * width + (x + 1)) * 4] +
        1 * data[((y + 1) * width + (x - 1)) * 4] + 
        2 * data[((y + 1) * width + x) * 4] +
        1 * data[((y + 1) * width + (x + 1)) * 4];
      
      const magnitude = Math.sqrt(gx * gx + gy * gy);
      edges[y][x] = magnitude > threshold;
    }
  }
  
  return edges;
};

const findNearestEdge = (x: number, y: number, edges: boolean[][], searchRadius: number = 15): { x: number; y: number } | null => {
  const height = edges.length;
  const width = edges[0]?.length || 0;
  
  let minDist = searchRadius;
  let nearestPoint: { x: number; y: number } | null = null;
  
  for (let dy = -searchRadius; dy <= searchRadius; dy++) {
    for (let dx = -searchRadius; dx <= searchRadius; dx++) {
      const checkY = Math.floor(y + dy);
      const checkX = Math.floor(x + dx);
      
      if (checkY >= 0 && checkY < height && checkX >= 0 && checkX < width && edges[checkY][checkX]) {
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < minDist) {
          minDist = dist;
          nearestPoint = { x: checkX, y: checkY };
        }
      }
    }
  }
  
  return nearestPoint;
};
export const EditorPage = () => {
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [fabricCanvas, setFabricCanvas] = useState<FabricCanvas | null>(null);
  const [activeTool, setActiveTool] = useState<"select" | "polygon" | "brush">("select");
  const [selectedColor, setSelectedColor] = useState(rgbToHex(colors[0].colorValue));
  const [isDrawingPolygon, setIsDrawingPolygon] = useState(false);
  const [polygonPoints, setPolygonPoints] = useState<{
    x: number;
    y: number;
  }[]>([]);
  const [previewPolyline, setPreviewPolyline] = useState<Polyline | null>(null);
  const [previewCircles, setPreviewCircles] = useState<Circle[]>([]);
  const [layers, setLayers] = useState<Layer[]>([]);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [currentHistoryIndex, setCurrentHistoryIndex] = useState(-1);
  const [currentDesignId, setCurrentDesignId] = useState<string | null>(null);
  const [edgeMap, setEdgeMap] = useState<boolean[][] | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas = new FabricCanvas(canvasRef.current, {
      width: 1000,
      height: 700,
      backgroundColor: "#f5f5f5"
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
    
    let finalX = pointer.x;
    let finalY = pointer.y;
    
    // Snap to nearest edge if edge detection is available
    if (edgeMap) {
      const nearestEdge = findNearestEdge(pointer.x, pointer.y, edgeMap, 20);
      if (nearestEdge) {
        finalX = nearestEdge.x;
        finalY = nearestEdge.y;
      }
    }
    
    const newPoints = [...polygonPoints, {
      x: finalX,
      y: finalY
    }];

    // Add circle marker at point
    const circle = new Circle({
      left: finalX - 4,
      top: finalY - 4,
      radius: 4,
      fill: "#00ff00",
      stroke: "#ffffff",
      strokeWidth: 2,
      selectable: false,
      evented: false
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
        strokeWidth: 3,
        fill: 'transparent',
        selectable: false,
        evented: false,
        strokeDashArray: [5, 5]
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
      canvasData: fabricCanvas.toJSON()
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
      strokeWidth: 2
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
      fabricObject: polygon
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
    reader.onload = event => {
      const imgUrl = event.target?.result as string;
      FabricImage.fromURL(imgUrl).then(img => {
        // Scale image to fit canvas
        const scale = Math.min(fabricCanvas.width! / img.width!, fabricCanvas.height! / img.height!);
        img.scale(scale);
        img.set({
          left: 0,
          top: 0,
          selectable: false
        });
        fabricCanvas.clear();
        fabricCanvas.backgroundImage = img;
        fabricCanvas.renderAll();
        
        // Perform edge detection on uploaded image
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = fabricCanvas.width!;
        tempCanvas.height = fabricCanvas.height!;
        const ctx = tempCanvas.getContext('2d');
        
        if (ctx) {
          ctx.drawImage(img.getElement() as HTMLImageElement, 0, 0, tempCanvas.width, tempCanvas.height);
          const imageData = ctx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
          const edges = detectEdges(imageData);
          setEdgeMap(edges);
          toast.success("Image uploaded! Edge detection active - points will snap to edges.");
        } else {
          toast.success("Image uploaded successfully!");
        }
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
            fabricObject: obj
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
      multiplier: 1
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
    const {
      data: {
        user
      }
    } = await supabase.auth.getUser();
    if (!user) {
      // Fallback to localStorage for guest users
      const designs = JSON.parse(localStorage.getItem("visualizer_designs") || "[]");
      designs.push({
        id: Date.now(),
        data: json,
        createdAt: new Date().toISOString()
      });
      localStorage.setItem("visualizer_designs", JSON.stringify(designs));
      toast.success("Design saved locally!");
      return;
    }
    try {
      if (currentDesignId) {
        // Update existing design
        const {
          error
        } = await supabase.from("designs").update({
          canvas_data: json,
          updated_at: new Date().toISOString()
        }).eq("id", currentDesignId);
        if (error) throw error;

        // Save to history
        await supabase.from("design_history").insert({
          design_id: currentDesignId,
          canvas_data: json,
          action_type: "update"
        });
        toast.success("Design updated!");
      } else {
        // Create new design
        const {
          data,
          error
        } = await supabase.from("designs").insert({
          user_id: user.id,
          canvas_data: json,
          name: `Design ${new Date().toLocaleDateString()}`
        }).select().single();
        if (error) throw error;
        setCurrentDesignId(data.id);

        // Save initial history
        await supabase.from("design_history").insert({
          design_id: data.id,
          canvas_data: json,
          action_type: "create"
        });
        toast.success("Design saved to database!");
      }
    } catch (error) {
      console.error("Save error:", error);
      toast.error("Failed to save design");
    }
  };
  return <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background">
      {/* Header */}
      <header className="border-b border-border/50 bg-card/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/")} className="hover:bg-primary/10 hover:text-primary transition-smooth">
              <Home className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-xl font-bold text-gradient">
                Home Visualizer Pro
              </h1>
              <p className="text-xs text-muted-foreground">Smart edge detection • Precision coloring</p>
            </div>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" size="sm" onClick={handleSave} className="hover:border-primary/50 transition-smooth group">
              <Save className="h-4 w-4 mr-2 group-hover:text-primary transition-smooth" />
              Save
            </Button>
            <Button variant="default" size="sm" onClick={handleDownload} className="bg-primary hover:bg-primary-glow shadow-glow transition-smooth">
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
          </div>
        </div>
      </header>

      <div className="flex h-[calc(100vh-4rem)]">
        {/* Left Toolbar */}
        <aside className="w-20 border-r border-border/50 bg-card/50 backdrop-blur-sm flex flex-col items-center py-6 gap-3">
          <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
          
          <div className="flex flex-col gap-2 pb-3 border-b border-border/50 w-full items-center">
            <Button 
              variant={activeTool === "select" ? "default" : "ghost"} 
              size="icon" 
              onClick={() => {
                setActiveTool("select");
                fileInputRef.current?.click();
              }} 
              title="Upload Image"
              className="transition-smooth hover:scale-110 hover-scale relative group"
            >
              <Upload className="h-5 w-5" />
              <span className="absolute left-full ml-2 px-2 py-1 bg-popover text-popover-foreground text-xs rounded opacity-0 group-hover:opacity-100 transition-smooth whitespace-nowrap pointer-events-none">
                Upload Image
              </span>
            </Button>
          </div>
          
          <div className="flex flex-col gap-2 pb-3 border-b border-border/50 w-full items-center">
            <Button 
              variant={activeTool === "select" ? "default" : "ghost"} 
              size="icon" 
              onClick={() => setActiveTool("select")} 
              title="Select Mode"
              className="transition-smooth hover:scale-110 relative group"
            >
              <Mouse className="h-5 w-5" />
              <span className="absolute left-full ml-2 px-2 py-1 bg-popover text-popover-foreground text-xs rounded opacity-0 group-hover:opacity-100 transition-smooth whitespace-nowrap pointer-events-none">
                Select
              </span>
            </Button>

            <Button 
              variant={activeTool === "polygon" ? "default" : "ghost"} 
              size="icon" 
              onClick={() => {
                setActiveTool("polygon");
                setIsDrawingPolygon(true);
              }} 
              title="Polygon Selection"
              className="transition-smooth hover:scale-110 relative group"
            >
              <Palette className="h-5 w-5" />
              <span className="absolute left-full ml-2 px-2 py-1 bg-popover text-popover-foreground text-xs rounded opacity-0 group-hover:opacity-100 transition-smooth whitespace-nowrap pointer-events-none">
                Polygon Tool
              </span>
            </Button>

            <Button 
              variant={activeTool === "brush" ? "default" : "ghost"} 
              size="icon" 
              onClick={() => setActiveTool("brush")} 
              title="Brush Tool"
              className="transition-smooth hover:scale-110 relative group"
            >
              <Brush className="h-5 w-5" />
              <span className="absolute left-full ml-2 px-2 py-1 bg-popover text-popover-foreground text-xs rounded opacity-0 group-hover:opacity-100 transition-smooth whitespace-nowrap pointer-events-none">
                Brush
              </span>
            </Button>
          </div>

          <div className="flex flex-col gap-2 flex-1">
            <Button variant="ghost" size="icon" onClick={handleZoomIn} title="Zoom In" className="transition-smooth hover:scale-110 hover:bg-primary/10 hover:text-primary">
              <ZoomIn className="h-5 w-5" />
            </Button>

            <Button variant="ghost" size="icon" onClick={handleZoomOut} title="Zoom Out" className="transition-smooth hover:scale-110 hover:bg-primary/10 hover:text-primary">
              <ZoomOut className="h-5 w-5" />
            </Button>

            <Button variant="ghost" size="icon" onClick={handleReset} title="Reset View" className="transition-smooth hover:scale-110 hover:bg-primary/10 hover:text-primary">
              <RotateCcw className="h-5 w-5" />
            </Button>
          </div>

          <div className="flex flex-col gap-2 pt-3 border-t border-border/50 w-full items-center">
            <Button variant="ghost" size="icon" onClick={handleUndo} title="Undo" disabled={currentHistoryIndex <= 0} className="transition-smooth hover:scale-110 disabled:opacity-30">
              <Undo2 className="h-5 w-5" />
            </Button>

            <Button variant="ghost" size="icon" onClick={handleRedo} title="Redo" disabled={currentHistoryIndex >= history.length - 1} className="transition-smooth hover:scale-110 disabled:opacity-30">
              <Redo2 className="h-5 w-5" />
            </Button>
          </div>
        </aside>

        {/* Main Canvas */}
        <main className="flex-1 p-8 overflow-auto">
          <div className="max-w-6xl mx-auto">
            {isDrawingPolygon && polygonPoints.length > 0 && (
              <div className="mb-6 flex gap-3 items-center animate-fade-in">
                <Card className="p-4 flex gap-3 items-center bg-card/80 backdrop-blur-sm border-primary/20 shadow-glow">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-primary animate-glow-pulse" />
                    <span className="text-sm font-medium">Points: <span className="text-primary">{polygonPoints.length}</span></span>
                  </div>
                  <Button 
                    size="sm" 
                    onClick={completePolygon} 
                    className="bg-primary hover:bg-primary-glow transition-smooth shadow-glow"
                  >
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
                    className="hover:bg-destructive/10 hover:border-destructive/50 hover:text-destructive transition-smooth"
                  >
                    Cancel
                  </Button>
                </Card>
              </div>
            )}
            
            <div className="rounded-xl shadow-2xl overflow-hidden border border-border/50 bg-gradient-to-br from-card to-muted/20 p-4">
              <div className="bg-background/50 backdrop-blur-sm rounded-lg overflow-hidden border border-border/30">
                <canvas ref={canvasRef} />
              </div>
            </div>
          </div>
        </main>

        {/* Right Sidebar - Color Palette & Layers */}
        <aside className="w-80 border-l border-border/50 bg-card/50 backdrop-blur-sm p-6 flex flex-col gap-6 overflow-hidden">
          <div className="flex-1 flex flex-col min-h-0">
            <div className="mb-4">
              <h2 className="text-lg font-semibold flex items-center gap-2 mb-2">
                <Palette className="h-5 w-5 text-primary" />
                <span className="text-gradient">All Colors</span>
              </h2>
              <p className="text-xs text-muted-foreground">Select a color to apply</p>
            </div>
          
            <ScrollArea className="flex-1">
              <div className="space-y-2 pr-4">
                {colors.map((color, index) => {
                  const hexColor = rgbToHex(color.colorValue);
                  const isSelected = selectedColor === hexColor;
                  return (
                    <button 
                      key={`${color.colorCode}-${index}`} 
                      onClick={() => setSelectedColor(hexColor)} 
                      className={`w-full p-3 rounded-lg border transition-smooth hover:scale-[1.02] flex items-center gap-3 group ${
                        isSelected 
                          ? "border-primary bg-primary/5 shadow-glow" 
                          : "border-border/50 hover:border-primary/50 hover:bg-muted/30"
                      }`}
                    >
                      <div 
                        className="w-12 h-12 rounded-md shadow-md border-2 border-border/30 transition-smooth group-hover:scale-110" 
                        style={{ backgroundColor: hexColor }} 
                      />
                      <div className="text-left flex-1 min-w-0">
                        <div className={`font-medium text-sm truncate ${isSelected ? 'text-primary' : ''}`}>
                          {color.colorName}
                        </div>
                        <div className="text-xs text-muted-foreground truncate">{color.colorCode}</div>
                        <div className="text-xs text-muted-foreground/70 truncate">{color.colorTone}</div>
                      </div>
                      {isSelected && (
                        <div className="w-2 h-2 rounded-full bg-primary animate-glow-pulse flex-shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>
            </ScrollArea>
          </div>

          <LayersPanel layers={layers} onDeleteLayer={handleDeleteLayer} onToggleVisibility={handleToggleVisibility} />

          <HistoryPanel history={history} currentIndex={currentHistoryIndex} onRestore={handleRestoreHistory} />
        </aside>
      </div>
    </div>;
};