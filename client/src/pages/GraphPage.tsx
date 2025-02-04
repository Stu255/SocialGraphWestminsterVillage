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
    organization: [] as string[],
    connectionType: [] as number[],
    userRelationshipType: [] as number[],
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

  const preparedNodes = (people || []).map((person: any) => ({
    ...person,
    relationshipToYou: person.relationshipToYou === undefined || person.relationshipToYou === null ? 1 : person.relationshipToYou
  }));

  const graphComponent = (
    <NetworkGraph
      nodes={preparedNodes}
      links={connections || []}
      filters={{
        organization: filters.organization.length > 0 ? filters.organization : undefined,
        userRelationshipType: filters.userRelationshipType.length > 0 ? filters.userRelationshipType : undefined,
        connectionType: filters.connectionType.length > 0 ? filters.connectionType : undefined
      }}
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
    <div className="h-screen w-full bg-background overflow-hidden font-sans">
      <ResizablePanelGroup direction="horizontal">
        {/* Left Sidebar */}
        <ResizablePanel 
          defaultSize={20} 
          minSize={15} 
          maxSize={25}
          className="border-r min-w-[250px] max-w-[350px]"
        >
          <div className="h-full flex flex-col">
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

            <div className="flex-1 overflow-y-auto">
              <div className="p-4 space-y-6">
                {graph && (
                  <div className="space-y-2">
                    <NetworkManager graphId={graphId} currentName={graph.name} />
                  </div>
                )}
                <div className="space-y-2">
                  <NodeForm graphId={graphId} />
                </div>
                <div className="space-y-2">
                  <OrganizationManager graphId={graphId} />
                </div>
                <div className="space-y-2">
                  <ConnectionManager graphId={graphId} />
                </div>
              </div>
            </div>
          </div>
        </ResizablePanel>

        <ResizableHandle />

        {/* Main Content */}
        <ResizablePanel 
          defaultSize={showRightSidebar ? 60 : 80}
          className="relative"
        >
          {graphComponent}
        </ResizablePanel>

        <ResizableHandle />

        {/* Right Sidebar */}
        <ResizablePanel 
          defaultSize={showRightSidebar ? 20 : 0}
          minSize={0}
          maxSize={25}
          className={cn(
            "transition-all duration-300 min-w-[250px] max-w-[350px] relative",
            !showRightSidebar && "!w-0 !min-w-0 !max-w-0 !p-0"
          )}
        >
          <div className="h-full flex flex-col">
            <div className={cn(
              "flex-1 transition-all duration-300 border-l",
              !showRightSidebar ? "opacity-0 pointer-events-none w-0" : "opacity-100 w-full"
            )}>
              <div className="h-full overflow-y-auto">
                <div className="p-6 space-y-6">
                  <FilterPanel filters={filters} onFilterChange={setFilters} graphId={graphId} />
                  <AnalysisPanel
                    selectedNode={selectedNode}
                    graphId={graphId}
                    onNodeDeleted={handleNodeDeleted}
                  />
                </div>
              </div>
            </div>

            {/* Collapse Button - Inside Sidebar */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowRightSidebar(false)}
              className="absolute bottom-4 left-4 z-10 rounded-full bg-background shadow-md border"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </ResizablePanel>

        {/* Fixed Expand Button - Bottom Right of Screen */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setShowRightSidebar(true)}
          className={cn(
            "fixed bottom-4 right-4 z-[5] rounded-full bg-background shadow-md border",
            showRightSidebar && "opacity-0 pointer-events-none"
          )}
        >
          <ChevronRight className="h-4 w-4 rotate-180" />
        </Button>
      </ResizablePanelGroup>
    </div>
  );
}