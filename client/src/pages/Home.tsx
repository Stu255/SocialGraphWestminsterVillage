import { NetworkGraph } from "@/components/NetworkGraph";
import { NodeForm } from "@/components/NodeForm";
import { RelationshipForm } from "@/components/RelationshipForm";
import { FilterPanel } from "@/components/FilterPanel";
import { AnalysisPanel } from "@/components/AnalysisPanel";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";

export default function Home() {
  const [selectedNode, setSelectedNode] = useState<any>(null);
  const [filters, setFilters] = useState({
    party: null,
    committee: null,
    relationshipType: null,
  });

  const { data: politicians } = useQuery({
    queryKey: ["/api/politicians"],
  });

  const { data: relationships } = useQuery({
    queryKey: ["/api/relationships"],
  });

  return (
    <div className="h-screen w-full bg-background">
      <ResizablePanelGroup direction="horizontal">
        <ResizablePanel defaultSize={20} minSize={15}>
          <div className="h-full p-4 border-r">
            <FilterPanel filters={filters} onFilterChange={setFilters} />
            <div className="mt-4">
              <NodeForm />
            </div>
            <div className="mt-4">
              <RelationshipForm />
            </div>
          </div>
        </ResizablePanel>
        
        <ResizableHandle />
        
        <ResizablePanel defaultSize={60}>
          <NetworkGraph
            nodes={politicians || []}
            links={relationships || []}
            filters={filters}
            onNodeSelect={setSelectedNode}
          />
        </ResizablePanel>
        
        <ResizableHandle />
        
        <ResizablePanel defaultSize={20} minSize={15}>
          <div className="h-full p-4 border-l">
            <AnalysisPanel 
              selectedNode={selectedNode}
              nodes={politicians || []}
              relationships={relationships || []}
            />
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
