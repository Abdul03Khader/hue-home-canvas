import { Trash2, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";

export interface Layer {
  id: string;
  name: string;
  color: string;
  visible: boolean;
  fabricObject: any;
}

interface LayersPanelProps {
  layers: Layer[];
  onDeleteLayer: (id: string) => void;
  onToggleVisibility: (id: string) => void;
}

export const LayersPanel = ({ layers, onDeleteLayer, onToggleVisibility }: LayersPanelProps) => {
  return (
    <Card className="p-4">
      <h3 className="text-sm font-semibold mb-3">Layers</h3>
      <ScrollArea className="h-[300px]">
        <div className="space-y-2">
          {layers.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No layers yet. Create a selection to add layers.
            </p>
          ) : (
            layers.map((layer) => (
              <div
                key={layer.id}
                className="flex items-center gap-2 p-2 rounded-lg border border-border hover:bg-accent transition-smooth"
              >
                <div
                  className="w-4 h-4 rounded border border-border flex-shrink-0"
                  style={{ backgroundColor: layer.color }}
                />
                <span className="text-sm flex-1 truncate">{layer.name}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => onToggleVisibility(layer.id)}
                >
                  {layer.visible ? (
                    <Eye className="h-4 w-4" />
                  ) : (
                    <EyeOff className="h-4 w-4" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-destructive"
                  onClick={() => onDeleteLayer(layer.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </Card>
  );
};
