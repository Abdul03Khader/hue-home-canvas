import { Clock, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";

export interface HistoryEntry {
  id: string;
  action: string;
  timestamp: Date;
  canvasData: any;
}

interface HistoryPanelProps {
  history: HistoryEntry[];
  currentIndex: number;
  onRestore: (index: number) => void;
}

export const HistoryPanel = ({ history, currentIndex, onRestore }: HistoryPanelProps) => {
  return (
    <Card className="p-4 mt-4">
      <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
        <Clock className="h-4 w-4" />
        History
      </h3>
      <ScrollArea className="h-[200px]">
        <div className="space-y-1">
          {history.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No history yet
            </p>
          ) : (
            history.map((entry, index) => (
              <button
                key={entry.id}
                onClick={() => onRestore(index)}
                className={`w-full text-left p-2 rounded-lg transition-smooth flex items-center gap-2 ${
                  index === currentIndex
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-accent"
                }`}
              >
                <RotateCcw className="h-3 w-3 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{entry.action}</p>
                  <p className="text-xs opacity-70">
                    {entry.timestamp.toLocaleTimeString()}
                  </p>
                </div>
              </button>
            ))
          )}
        </div>
      </ScrollArea>
    </Card>
  );
};
