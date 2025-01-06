import { NetworkGraph } from "@/components/NetworkGraph";
import { NodeForm } from "@/components/NodeForm";
import { RelationshipForm } from "@/components/RelationshipForm";
import { RelationshipTypeManager } from "@/components/RelationshipTypeManager";
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
    relationshipType: null,
  });

  const { data: politicians } = useQuery({
    queryKey: ["/api/politicians"],
  });

  const { data: relationships } = useQuery({
    queryKey: ["/api/relationships"],
  });

  const handleNodeDeleted = () => {
    setSelectedNode(null);
  };

  return (
    <div className="h-screen w-full bg-background overflow-hidden">
      <ResizablePanelGroup direction="horizontal">
        <ResizablePanel defaultSize={20} minSize={15}>
          <div className="h-full p-4 border-r overflow-y-auto">
            <div className="space-y-4">
              <FilterPanel filters={filters} onFilterChange={setFilters} />
              <RelationshipTypeManager />
              <NodeForm />
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
          <div className="h-full p-4 border-l overflow-y-auto">
            <AnalysisPanel 
              selectedNode={selectedNode}
              nodes={politicians || []}
              relationships={relationships || []}
              onNodeDeleted={handleNodeDeleted}
            />
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}