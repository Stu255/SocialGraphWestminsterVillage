import { NetworkGraph } from "@/components/NetworkGraph";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useMobile } from "@/hooks/use-mobile";
import { MobileLayout } from "@/components/layouts/MobileLayout";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { FilterPanel } from "@/components/FilterPanel";
import { NodeForm } from "@/components/NodeForm";
import { RelationshipForm } from "@/components/RelationshipForm";
import { AffiliationManager } from "@/components/AffiliationManager";
import { RelationshipTypeManager } from "@/components/RelationshipTypeManager";
import { AnalysisPanel } from "@/components/AnalysisPanel";

export default function Home() {
  const isMobile = useMobile();
  const [selectedNode, setSelectedNode] = useState<any>(null);
  const [filters, setFilters] = useState({
    affiliation: null,
    relationshipType: null,
  });

  const { data: people } = useQuery({
    queryKey: ["/api/people"],
  });

  const { data: relationships } = useQuery({
    queryKey: ["/api/relationships"],
  });

  const handleNodeDeleted = () => {
    setSelectedNode(null);
  };

  const graph = (
    <NetworkGraph
      nodes={people || []}
      links={relationships || []}
      filters={filters}
      onNodeSelect={setSelectedNode}
    />
  );

  if (isMobile) {
    return (
      <MobileLayout
        selectedNode={selectedNode}
        nodes={people || []}
        relationships={relationships || []}
        filters={filters}
        onFilterChange={setFilters}
        onNodeDeleted={handleNodeDeleted}
      >
        {graph}
      </MobileLayout>
    );
  }

  return (
    <div className="h-screen w-full bg-background overflow-hidden">
      <ResizablePanelGroup direction="horizontal">
        <ResizablePanel defaultSize={25} minSize={20}>
          <div className="h-full p-6 border-r overflow-y-auto space-y-6">
            <FilterPanel filters={filters} onFilterChange={setFilters} />
            <NodeForm />
            <RelationshipForm />
            <AffiliationManager />
            <RelationshipTypeManager />
          </div>
        </ResizablePanel>

        <ResizableHandle />

        <ResizablePanel defaultSize={55}>
          {graph}
        </ResizablePanel>

        <ResizableHandle />

        <ResizablePanel defaultSize={20} minSize={15}>
          <div className="h-full p-6 border-l overflow-y-auto">
            <AnalysisPanel 
              selectedNode={selectedNode}
              nodes={people || []}
              relationships={relationships || []}
              onNodeDeleted={handleNodeDeleted}
            />
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}