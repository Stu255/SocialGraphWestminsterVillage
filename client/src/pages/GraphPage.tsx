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
      const res = await fetch(`/api/people?graphId=${graphId}`);
      if (!res.ok) throw new Error("Failed to fetch people");
      const data = await res.json();
      return data;
    },
  });

  const { data: connections } = useQuery({
    queryKey: ["/api/connections", graphId],
    queryFn: async () => {
      const res = await fetch(`/api/connections?graphId=${graphId}`);
      if (!res.ok) throw new Error("Failed to fetch connections");
      const data = await res.json();
      return data;
    },
  });

  const { data: graph } = useQuery({
    queryKey: ["/api/graphs", graphId],
    queryFn: async () => {
      const res = await fetch(`/api/graphs/${graphId}`);
      if (!res.ok) throw new Error("Failed to fetch graph");
      const data = await res.json();
      return data;
    },
  });

  const handleNodeDeleted = () => {
    setSelectedNode(null);
  };

  const handleHomeClick = () => {
    setLocation("/");
  };

  const preparedNodes = (people || []).map(person => ({
    ...person,
    relationshipToYou: person.relationshipToYou === undefined || person.relationshipToYou === null ? 1 : person.relationshipToYou
  }));

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
        relationships={connections || []}
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
      <ResizablePanelGroup direction="horizontal">
        <ResizablePanel defaultSize={20} minSize={20} maxSize={20}>
          <div className="h-full flex flex-col">
            {/* Header section for navigation buttons */}
            <div className="p-4 border-b flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={handleHomeClick}
                className="h-8 w-8"
              >
                <Home className="h-4 w-4" />
              </Button>
            </div>

            {/* Main content section with fixed height panels */}
            <div className="flex-1 flex flex-col p-4 gap-4">
              {graph && (
                <div className="h-[60px]">
                  <NetworkManager graphId={graphId} currentName={graph.name} />
                </div>
              )}
              <div className="h-[140px]">
                <NodeForm graphId={graphId} />
              </div>
              <div className="h-[140px]">
                <OrganizationManager graphId={graphId} />
              </div>
              <div className="h-[140px]">
                <ConnectionManager graphId={graphId} title="Connections" />
              </div>
            </div>
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