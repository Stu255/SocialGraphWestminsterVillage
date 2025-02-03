import { NetworkGraph } from "@/components/NetworkGraph";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useMobile } from "@/hooks/use-mobile";
import { useLocation } from "wouter";
import { MobileLayout } from "@/components/layouts/MobileLayout";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { FilterPanel } from "@/components/FilterPanel";
import { NodeForm } from "@/components/NodeForm";
import { OrganizationManager } from "@/components/OrganizationManager";
import { RelationshipTypeManager } from "@/components/RelationshipTypeManager";
import { ConnectionManager } from "@/components/ConnectionManager";
import { AnalysisPanel } from "@/components/AnalysisPanel";
import { Button } from "@/components/ui/button";
import { Home } from "lucide-react";
import { NetworkManager } from "@/components/NetworkManager";

interface Props {
  params: {
    id: string;
  };
}

export default function GraphPage({ params }: Props) {
  const isMobile = useMobile();
  const [, setLocation] = useLocation();
  const [selectedNode, setSelectedNode] = useState<any>(null);
  const [filters, setFilters] = useState({
    organization: null,
    connectionType: null,
    userRelationshipType: null,
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

  const { data: graph } = useQuery({
    queryKey: ["/api/graphs", graphId],
    queryFn: async () => {
      const res = await fetch(`/api/graphs/${graphId}`);
      if (!res.ok) throw new Error("Failed to fetch graph");
      return res.json();
    },
  });

  const handleNodeDeleted = () => {
    setSelectedNode(null);
  };

  const handleHomeClick = () => {
    setLocation("/");
  };

  // Prepare nodes with proper type information
  const preparedNodes = (people || []).map(person => ({
    ...person,
    // Ensure relationshipToYou is always present
    relationshipToYou: person.relationshipToYou || 1, // Default to "Acquainted" if not set
  }));

  const graphComponent = (
    <NetworkGraph
      nodes={preparedNodes}
      links={relationships || []}
      filters={filters}
      onNodeSelect={setSelectedNode}
      graphId={graphId}
    />
  );

  if (isMobile) {
    return (
      <MobileLayout
        selectedNode={selectedNode}
        nodes={preparedNodes}
        relationships={relationships || []}
        filters={filters}
        graphId={graphId}
        onFilterChange={setFilters}
        onNodeDeleted={handleNodeDeleted}
        onHomeClick={handleHomeClick}
      >
        {graphComponent}
      </MobileLayout>
    );
  }

  return (
    <div className="h-screen w-full bg-background overflow-hidden">
      <div className="absolute top-4 left-4 z-10">
        <Button
          variant="outline"
          size="icon"
          onClick={handleHomeClick}
          className="bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60"
        >
          <Home className="h-4 w-4" />
        </Button>
      </div>
      <ResizablePanelGroup direction="horizontal">
        <ResizablePanel defaultSize={25} minSize={20}>
          <div className="h-full p-6 border-r overflow-y-auto space-y-6">
            {graph && <NetworkManager graphId={graphId} currentName={graph.name} />}
            <FilterPanel filters={filters} onFilterChange={setFilters} />
            <NodeForm graphId={graphId} />
            <OrganizationManager graphId={graphId} />
            <ConnectionManager graphId={graphId} />
          </div>
        </ResizablePanel>

        <ResizableHandle />

        <ResizablePanel defaultSize={55}>
          {graphComponent}
        </ResizablePanel>

        <ResizableHandle />

        <ResizablePanel defaultSize={20} minSize={15}>
          <div className="h-full p-6 border-l overflow-y-auto">
            <AnalysisPanel
              selectedNode={selectedNode}
              graphId={graphId}
              onNodeDeleted={handleNodeDeleted}
            />
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}