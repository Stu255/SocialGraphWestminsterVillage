import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Home } from "lucide-react";
import { cn } from "@/lib/utils";
import { FilterPanel } from "@/components/FilterPanel";
import { NodeForm } from "@/components/NodeForm";
import { RelationshipForm } from "@/components/RelationshipForm";
import { AffiliationManager } from "@/components/AffiliationManager";
import { RelationshipTypeManager } from "@/components/RelationshipTypeManager";
import { AnalysisPanel } from "@/components/AnalysisPanel";

interface MobileLayoutProps {
  children: React.ReactNode; // This will be the graph
  selectedNode: any;
  nodes: any[];
  relationships: any[];
  filters: any;
  onFilterChange: (filters: any) => void;
  onNodeDeleted: () => void;
  onHomeClick: () => void;
}

export function MobileLayout({
  children,
  selectedNode,
  nodes,
  relationships,
  filters,
  onFilterChange,
  onNodeDeleted,
  onHomeClick,
}: MobileLayoutProps) {
  const [currentPanel, setCurrentPanel] = useState(0);

  const panels = [
    { title: "Filters", component: <FilterPanel filters={filters} onFilterChange={onFilterChange} /> },
    { title: "Add Person", component: <NodeForm /> },
    { title: "Add Relationship", component: <RelationshipForm /> },
    { title: "Affiliations", component: <AffiliationManager /> },
    { title: "Relationship Types", component: <RelationshipTypeManager /> },
    { title: "Analysis", component: 
      <AnalysisPanel 
        selectedNode={selectedNode}
        nodes={nodes}
        relationships={relationships}
        onNodeDeleted={onNodeDeleted}
      /> 
    },
  ];

  const nextPanel = () => {
    setCurrentPanel((prev) => (prev + 1) % panels.length);
  };

  const prevPanel = () => {
    setCurrentPanel((prev) => (prev - 1 + panels.length) % panels.length);
  };

  return (
    <div className="flex flex-col h-screen">
      {/* Graph Section */}
      <div className="flex-1 min-h-[50vh] overflow-hidden">
        {children}
      </div>

      {/* Controls Section */}
      <div className="h-[50vh] bg-background border-t">
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={prevPanel}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            {selectedNode && currentPanel === 5 && (
              <Button variant="ghost" size="icon" onClick={onHomeClick}>
                <Home className="h-4 w-4" />
              </Button>
            )}
          </div>
          <h2 className="text-lg font-semibold">{panels[currentPanel].title}</h2>
          <div className="flex items-center gap-2">
            {(!selectedNode || currentPanel !== 5) && (
              <Button variant="ghost" size="icon" onClick={onHomeClick}>
                <Home className="h-4 w-4" />
              </Button>
            )}
            <Button variant="ghost" size="icon" onClick={nextPanel}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="overflow-y-auto h-[calc(50vh-4rem)] p-4">
          <div className="relative w-full h-full">
            {panels.map((panel, index) => (
              <div
                key={index}
                className={cn(
                  "absolute top-0 left-0 w-full transition-transform duration-300 ease-in-out",
                  index === currentPanel ? "visible" : "invisible"
                )}
                style={{
                  transform: `translateX(${(index - currentPanel) * 100}%)`
                }}
              >
                {panel.component}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}