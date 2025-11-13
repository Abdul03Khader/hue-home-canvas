import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Canvas as FabricCanvas, FabricImage, Polygon, Circle, Polyline, Group } from "fabric";
import { Upload, Mouse, Brush, Undo2, Redo2, Download, Save, Home, ZoomIn, ZoomOut, RotateCcw, Palette, Layers } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  const [showSelectionDialog, setShowSelectionDialog] = useState(false);
  const [pendingPolygon, setPendingPolygon] = useState<Polygon | null>(null);
  const [selectionName, setSelectionName] = useState("");
  const [selectionGroup, setSelectionGroup] = useState<string>("new");
  const [dialogColor, setDialogColor] = useState(selectedColor);
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
    const newPoints = [...polygonPoints, {
      x: pointer.x,
      y: pointer.y
    }];

    // Add circle marker at point
    const circle = new Circle({
      left: pointer.x - 3,
      top: pointer.y - 3,
      radius: 3,
      fill: "red",
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
        strokeWidth: 2,
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
  const addToHistory = (action: string, layersSnapshot?: Layer[]) => {
    if (!fabricCanvas) return;
    const newEntry: HistoryEntry = {
      id: Date.now().toString(),
      action,
      timestamp: new Date(),
      canvasData: {
        canvas: fabricCanvas.toJSON(),
        layers: layersSnapshot || layers
      }
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
    
    // Store polygon temporarily and show dialog
    setPendingPolygon(polygon);
    setSelectionName(`Selection ${layers.length + 1}`);
    setDialogColor(selectedColor);
    setShowSelectionDialog(true);

    // Clear preview objects
    if (previewPolyline) {
      fabricCanvas.remove(previewPolyline);
      setPreviewPolyline(null);
    }
    previewCircles.forEach(circle => fabricCanvas.remove(circle));
    setPreviewCircles([]);
    setPolygonPoints([]);
    setIsDrawingPolygon(false);
  };

  const finalizeSelection = () => {
    if (!fabricCanvas || !pendingPolygon) return;

    // Update polygon with chosen color
    pendingPolygon.set({
      fill: dialogColor,
      stroke: dialogColor,
      opacity: 0.6,
      strokeWidth: 2
    });

    const layerId = Date.now().toString();
    pendingPolygon.set('layerId', layerId);
    pendingPolygon.set('groupId', selectionGroup === "new" ? layerId : selectionGroup);
    
    fabricCanvas.add(pendingPolygon);

    // Add to layers
    const newLayer: Layer = {
      id: layerId,
      name: selectionName || `Selection ${layers.length + 1}`,
      color: dialogColor,
      visible: true,
      fabricObject: pendingPolygon,
      groupId: selectionGroup === "new" ? undefined : selectionGroup
    };

    const newLayers = [...layers, newLayer];
    setLayers(newLayers);
    addToHistory(`Created ${newLayer.name}`, newLayers);
    toast.success("Selection created!");

    // Reset dialog state
    setShowSelectionDialog(false);
    setPendingPolygon(null);
    setSelectionName("");
    setSelectionGroup("new");
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
      const newLayers = layers.filter(l => l.id !== layerId);
      setLayers(newLayers);
      addToHistory(`Deleted ${layer.name}`, newLayers);
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

  const handleToggleSelection = (layerId: string) => {
    setLayers(layers.map(l => 
      l.id === layerId ? { ...l, selected: !l.selected } : l
    ));
  };

  const handleMergeSelected = () => {
    if (!fabricCanvas) return;
    
    const selectedLayers = layers.filter(l => l.selected);
    if (selectedLayers.length < 2) {
      toast.error("Select at least 2 layers to merge");
      return;
    }

    // Collect fabric objects from selected layers
    const fabricObjects = selectedLayers
      .map(layer => layer.fabricObject)
      .filter(obj => obj);

    if (fabricObjects.length === 0) {
      toast.error("No valid polygons to merge");
      return;
    }

    // Create a group with all selected polygons
    const group = new Group(fabricObjects, {
      selectable: true
    });

    const layerId = Date.now().toString();
    group.set('layerId', layerId);

    // Remove old polygons and add group
    selectedLayers.forEach(layer => {
      fabricCanvas.remove(layer.fabricObject);
    });
    fabricCanvas.add(group);
    fabricCanvas.renderAll();

    // Update layers
    const newLayer: Layer = {
      id: layerId,
      name: `Merged (${selectedLayers.length} layers)`,
      color: selectedLayers[0].color,
      visible: true,
      fabricObject: group,
      selected: false
    };

    const remainingLayers = layers.filter(l => !l.selected);
    const newLayers = [...remainingLayers, newLayer];
    setLayers(newLayers);

    addToHistory(`Merged ${selectedLayers.length} layers`, newLayers);
    toast.success("Layers merged successfully!");
  };
  const handleRestoreHistory = (index: number) => {
    if (!fabricCanvas || !history[index]) return;
    const historyEntry = history[index];
    
    fabricCanvas.loadFromJSON(historyEntry.canvasData.canvas, () => {
      fabricCanvas.renderAll();
      setCurrentHistoryIndex(index);
      
      // Restore layers from history
      const restoredLayers = historyEntry.canvasData.layers.map((layer: Layer) => {
        const fabricObject = fabricCanvas.getObjects().find(obj => obj.get('layerId') === layer.id);
        return {
          ...layer,
          fabricObject: fabricObject || layer.fabricObject
        };
      });
      
      setLayers(restoredLayers);
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
  // Get unique groups for dropdown
  const uniqueGroups = Array.from(new Set(layers.map(l => l.groupId || l.id).filter(Boolean)));

  return <div className="min-h-screen bg-background">
      {/* Selection Dialog */}
      <Dialog open={showSelectionDialog} onOpenChange={setShowSelectionDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Configure Selection</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 overflow-auto flex-1">
            <div className="space-y-2">
              <Label htmlFor="selection-name">Selection Name/Number</Label>
              <Input
                id="selection-name"
                placeholder="e.g., Wall 1, Ceiling, Room A"
                value={selectionName}
                onChange={(e) => setSelectionName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="selection-group">Add to Group</Label>
              <Select value={selectionGroup} onValueChange={setSelectionGroup}>
                <SelectTrigger id="selection-group">
                  <SelectValue placeholder="Create new group" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="new">Create New Group</SelectItem>
                  {uniqueGroups.map((groupId) => {
                    const groupLayer = layers.find(l => l.id === groupId || l.groupId === groupId);
                    return (
                      <SelectItem key={groupId} value={groupId}>
                        {groupLayer?.name || `Group ${groupId.slice(0, 8)}`}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Select Color</Label>
              <ScrollArea className="h-[300px] border rounded-lg p-2">
                <div className="space-y-2">
                  {colors.map((color, index) => {
                    const hexColor = rgbToHex(color.colorValue);
                    return (
                      <button
                        key={`dialog-${color.colorCode}-${index}`}
                        onClick={() => setDialogColor(hexColor)}
                        className={`w-full p-3 rounded-lg border-2 transition-all hover:scale-105 flex items-center gap-3 ${
                          dialogColor === hexColor
                            ? "border-primary bg-primary/10"
                            : "border-border hover:border-primary/50"
                        }`}
                      >
                        <div
                          className="w-10 h-10 rounded-md shadow-md border border-border flex-shrink-0"
                          style={{ backgroundColor: hexColor }}
                        />
                        <div className="text-left flex-1 min-w-0">
                          <div className="font-medium text-sm truncate">{color.colorName}</div>
                          <div className="text-xs text-muted-foreground">{color.colorCode}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </ScrollArea>
            </div>
          </div>

          <div className="flex gap-2 pt-4 border-t">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => {
                setShowSelectionDialog(false);
                setPendingPolygon(null);
                setSelectionName("");
                setSelectionGroup("new");
              }}
            >
              Cancel
            </Button>
            <Button
              variant="default"
              className="flex-1"
              onClick={finalizeSelection}
            >
              Create Selection
            </Button>
          </div>
        </DialogContent>
      </Dialog>

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
            <Button variant="hero" size="sm" onClick={handleDownload} className="text-slate-900">
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
          </div>
        </div>
      </header>

      <div className="flex h-[calc(100vh-4rem)]">
        {/* Left Toolbar */}
        <aside className="w-20 border-r border-border bg-card flex flex-col items-center py-6 gap-4">
          <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
          <Button variant={activeTool === "select" ? "default" : "ghost"} size="icon" onClick={() => {
          setActiveTool("select");
          fileInputRef.current?.click();
        }} title="Upload Image">
            <Upload className="h-5 w-5" />
          </Button>
          
          <Button variant={activeTool === "select" ? "default" : "ghost"} size="icon" onClick={() => setActiveTool("select")} title="Select Mode">
            <Mouse className="h-5 w-5" />
          </Button>

          <Button variant={activeTool === "polygon" ? "default" : "ghost"} size="icon" onClick={() => {
          setActiveTool("polygon");
          setIsDrawingPolygon(true);
        }} title="Polygon Selection">
            <Palette className="h-5 w-5" />
          </Button>

          <Button variant={activeTool === "brush" ? "default" : "ghost"} size="icon" onClick={() => setActiveTool("brush")} title="Brush Tool">
            <Brush className="h-5 w-5" />
          </Button>

          <div className="border-t border-border w-full my-2" />

          <Button variant="ghost" size="icon" onClick={handleZoomIn} title="Zoom In">
            <ZoomIn className="h-5 w-5" />
          </Button>

          <Button variant="ghost" size="icon" onClick={handleZoomOut} title="Zoom Out">
            <ZoomOut className="h-5 w-5" />
          </Button>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={handleReset}>
                  <RotateCcw className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">
                <p>Reset View</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={handleUndo} disabled={currentHistoryIndex <= 0}>
                  <Undo2 className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">
                <p>Undo</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={handleRedo} disabled={currentHistoryIndex >= history.length - 1}>
                  <Redo2 className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">
                <p>Redo</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </aside>

        {/* Main Canvas */}
        <main className="flex-1 p-6 overflow-auto">
          <div className="max-w-6xl mx-auto">
            {isDrawingPolygon && polygonPoints.length > 0 && <div className="mb-4 flex gap-2 items-center">
                <Card className="p-3 flex gap-2 items-center animate-fade-in">
                  <span className="text-sm">Points: {polygonPoints.length}</span>
                  <Button size="sm" variant="hero" onClick={completePolygon} className="text-zinc-900">
                    Complete Selection
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => {
                if (previewPolyline && fabricCanvas) {
                  fabricCanvas.remove(previewPolyline);
                  setPreviewPolyline(null);
                }
                previewCircles.forEach(circle => fabricCanvas?.remove(circle));
                setPreviewCircles([]);
                setPolygonPoints([]);
                setIsDrawingPolygon(false);
              }}>
                    Cancel
                  </Button>
                </Card>
              </div>}
            
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
              All Colors
            </h2>
          
            <ScrollArea className="h-[300px]">
              <div className="space-y-2">
                {colors.map((color, index) => {
                  const hexColor = rgbToHex(color.colorValue);
                  return (
                    <button 
                      key={`${color.colorCode}-${index}`} 
                      onClick={() => setSelectedColor(hexColor)} 
                      className={`w-full p-3 rounded-lg border-2 transition-smooth hover:scale-105 flex items-center gap-3 ${selectedColor === hexColor ? "border-primary shadow-glow" : "border-border hover:border-primary/50"}`}
                    >
                      <div 
                        className="w-10 h-10 rounded-md shadow-md border border-border" 
                        style={{ backgroundColor: hexColor }} 
                      />
                      <div className="text-left flex-1">
                        <div className="font-medium text-sm">{color.colorName}</div>
                        <div className="text-xs text-muted-foreground">{color.colorCode}</div>
                        <div className="text-xs text-muted-foreground">{color.colorTone}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </ScrollArea>
          </div>

          <LayersPanel 
            layers={layers} 
            onDeleteLayer={handleDeleteLayer} 
            onToggleVisibility={handleToggleVisibility}
            onToggleSelection={handleToggleSelection}
            onMergeSelected={handleMergeSelected}
          />

          <HistoryPanel history={history} currentIndex={currentHistoryIndex} onRestore={handleRestoreHistory} />
        </aside>
      </div>
    </div>;
};