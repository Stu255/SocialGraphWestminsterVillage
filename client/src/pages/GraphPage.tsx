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
import { ChevronRight, Home } from "lucide-react";
import { NetworkManager } from "@/components/NetworkManager";
import { cn } from "@/lib/utils";

interface Props {
  params: {
    id: string;
  };
}

export default function GraphPage({ params }: Props) {
  const isMobile = useMobile();
  const [, setLocation] = useLocation();
  const [selectedNode, setSelectedNode] = useState<any>(null);
  const [showRightSidebar, setShowRightSidebar] = useState(true);
  const [filters, setFilters] = useState({
    organization: null as string | null,
    connectionType: null as number | null,
    userRelationshipType: null as number | null,
  });

  const graphId = parseInt(params.id);

  const { data: people } = useQuery({
    queryKey: ["/api/people", graphId],
    queryFn: async () => {
      console.log("Fetching people for graph:", graphId);
      const res = await fetch(`/api/people?graphId=${graphId}`);
      if (!res.ok) throw new Error("Failed to fetch people");
      const data = await res.json();
      console.log("Fetched people data:", data);
      return data;
    },
  });

  const { data: connections } = useQuery({
    queryKey: ["/api/connections", graphId],
    queryFn: async () => {
      console.log("Fetching connections for graph:", graphId);
      const res = await fetch(`/api/connections?graphId=${graphId}`);
      if (!res.ok) throw new Error("Failed to fetch connections");
      const data = await res.json();
      console.log("Fetched connections data:", data);
      return data;
    },
  });

  const { data: graph } = useQuery({
    queryKey: ["/api/graphs", graphId],
    queryFn: async () => {
      console.log("Fetching graph:", graphId);
      const res = await fetch(`/api/graphs/${graphId}`);
      if (!res.ok) throw new Error("Failed to fetch graph");
      const data = await res.json();
      console.log("Fetched graph data:", data);
      return data;
    },
  });

  const handleNodeDeleted = () => {
    setSelectedNode(null);
  };

  const handleHomeClick = () => {
    setLocation("/");
  };

  const preparedNodes = (people || []).map(person => {
    console.log("Processing node:", person.name, "relationshipToYou:", person.relationshipToYou);
    return {
      ...person,
      relationshipToYou: person.relationshipToYou === undefined || person.relationshipToYou === null ? 1 : person.relationshipToYou
    };
  });

  console.log("Prepared nodes:", preparedNodes);
  console.log("Current connections:", connections);

  const graphComponent = (
    <NetworkGraph
      nodes={preparedNodes}
      links={connections || []}
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
        <ResizablePanel defaultSize={20} minSize={15}>
          <div className="h-full p-6 border-r overflow-y-auto space-y-6">
            {graph && <NetworkManager graphId={graphId} currentName={graph.name} />}
            <NodeForm graphId={graphId} />
            <OrganizationManager graphId={graphId} />
            <ConnectionManager graphId={graphId} />
          </div>
        </ResizablePanel>

        <ResizableHandle />

        <ResizablePanel defaultSize={showRightSidebar ? 60 : 80}>
          {graphComponent}
        </ResizablePanel>

        <ResizableHandle />

        <ResizablePanel 
          defaultSize={20} 
          minSize={15}
          className={cn(
            "transition-all duration-300",
            !showRightSidebar && "!w-[40px] !min-w-[40px] flex-none"
          )}
        >
          <div className="relative h-full">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowRightSidebar(!showRightSidebar)}
              className={cn(
                "absolute -left-3 top-3 z-10 rounded-full bg-background shadow-md border",
                !showRightSidebar && "rotate-180"
              )}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <div className={cn(
              "h-full transition-all duration-300",
              showRightSidebar ? "opacity-100" : "opacity-0 pointer-events-none"
            )}>
              <div className="h-full p-6 border-l overflow-y-auto space-y-6">
                <FilterPanel filters={filters} onFilterChange={setFilters} />
                <AnalysisPanel
                  selectedNode={selectedNode}
                  graphId={graphId}
                  onNodeDeleted={handleNodeDeleted}
                />
              </div>
            </div>
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}