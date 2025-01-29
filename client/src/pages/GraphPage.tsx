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

interface Props {
  params: {
    id: string;
  };
}

export default function GraphPage({ params }: Props) {
  const isMobile = useMobile();
  const [selectedNode, setSelectedNode] = useState<any>(null);
  const [filters, setFilters] = useState({
    affiliation: null,
    relationshipType: null,
  });

  const graphId = parseInt(params.id);

  const { data: people } = useQuery({
    queryKey: ["/api/people", graphId],
    queryFn: async () => {
      const res = await fetch(`/api/people?graphId=${graphId}`);
      if (!res.ok) throw new Error("Failed to fetch people");
      return res.json();
    },
  });

  const { data: relationships } = useQuery({
    queryKey: ["/api/relationships", graphId],
    queryFn: async () => {
      const res = await fetch(`/api/relationships?graphId=${graphId}`);
      if (!res.ok) throw new Error("Failed to fetch relationships");
      return res.json();
    },
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
            <NodeForm graphId={graphId} />
            <RelationshipForm graphId={graphId} />
            <AffiliationManager graphId={graphId} />
            <RelationshipTypeManager graphId={graphId} />
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
