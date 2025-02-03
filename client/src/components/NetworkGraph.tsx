import { useEffect, useRef } from "react";
import * as d3 from "d3";
import { Card } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { USER_RELATIONSHIP_TYPES } from "./RelationshipTypeManager";
import { CONNECTION_TYPES } from "./ConnectionManager";

interface Node extends d3.SimulationNodeDatum {
  id: number;
  name: string;
  affiliation: string;
  organization?: string;
  userRelationshipType?: number; // How user relates to this contact
  currentRole?: string;
}

interface Link {
  sourcePersonId: number;
  targetPersonId: number;
  connectionType: number; // How contacts are connected to each other
  graphId: number;
  id: number;
}

interface Organization {
  id: number;
  name: string;
  brandColor: string;
}

interface Props {
  nodes: Node[];
  links: Link[];
  filters: {
    affiliation?: string;
    userRelationshipType?: number; // Filter by user's relationship to contacts
    connectionType?: number; // Filter by connection type between contacts
  };
  onNodeSelect: (node: Node | null) => void;
  graphId: number;
}

// Node icon paths for different user relationship types
const CIRCLE_PATH = "M12 2a10 10 0 1 1 0 20 10 10 0 0 1 0-20z";
const CHEVRON_DOWN = "M4 24 L12 30 L20 24";
const CHEVRON_UP = "M4 0 L12 -6 L20 0";

const USER_RELATIONSHIP_ICONS = {
  strong: {
    path: `${CIRCLE_PATH} ${CHEVRON_DOWN} ${CHEVRON_UP}`,
    viewBox: "0 -6 24 36"
  },
  regular: {
    path: `${CIRCLE_PATH} ${CHEVRON_DOWN}`,
    viewBox: "0 0 24 32"
  },
  basic: {
    path: CIRCLE_PATH,
    viewBox: "0 0 24 24"
  }
};

// Get node icon based on user's relationship to contact
const getUserRelationshipIcon = (relationshipType: number | undefined) => {
  switch (relationshipType) {
    case 5: // Allied
      return { 
        ...USER_RELATIONSHIP_ICONS.strong,
        fill: true, 
        strokeDasharray: "none" 
      };
    case 4: // Trusted
      return { 
        ...USER_RELATIONSHIP_ICONS.regular,
        fill: true, 
        strokeDasharray: "none" 
      };
    case 3: // Close
      return { 
        ...USER_RELATIONSHIP_ICONS.basic,
        fill: true, 
        strokeDasharray: "none" 
      };
    case 2: // Familiar
      return { 
        ...USER_RELATIONSHIP_ICONS.basic,
        fill: false, 
        strokeDasharray: "none" 
      };
    case 1: // Acquainted
      return { 
        ...USER_RELATIONSHIP_ICONS.basic,
        fill: false, 
        strokeDasharray: "2,2" 
      };
    default:
      return { 
        ...USER_RELATIONSHIP_ICONS.basic,
        fill: false, 
        strokeDasharray: "2,2" 
      };
  }
};

// Fix for the doubleStrokeGap TypeScript error and connection rendering
const getConnectionLineStyle = (connectionType: number) => {
  switch (connectionType) {
    case 5: // Allied
      return { 
        strokeWidth: 3, 
        strokeDasharray: "none",
        doubleStroke: true,
        doubleStrokeGap: 4 // Explicitly define gap
      } as const;
    case 4: // Trusted
      return { 
        strokeWidth: 2.5, 
        strokeDasharray: "none",
        doubleStroke: true,
        doubleStrokeGap: 3
      } as const;
    case 3: // Close
      return { 
        strokeWidth: 2, 
        strokeDasharray: "none",
        doubleStroke: false
      } as const;
    case 2: // Familiar
      return { 
        strokeWidth: 1.5, 
        strokeDasharray: "none",
        doubleStroke: false
      } as const;
    case 1: // Acquainted
      return { 
        strokeWidth: 1, 
        strokeDasharray: "4,4",
        doubleStroke: false
      } as const;
    default: // None (0) or invalid
      return null;
  }
};

export function NetworkGraph({ nodes, links, filters, onNodeSelect, graphId }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);

  const { data: organizations = [] } = useQuery<Organization[]>({
    queryKey: ["/api/organizations", graphId],
    enabled: !!graphId,
  });

  const organizationColors = new Map(
    organizations.map(org => [org.name, org.brandColor])
  );

  const getNodeColor = (node: Node) => {
    if (!node.organization) {
      return "hsl(var(--primary))";
    }
    return organizationColors.get(node.organization) || "hsl(var(--primary))";
  };

  const getEdgeColor = (source: Node, target: Node) => {
    if (source.organization && target.organization && source.organization === target.organization) {
      return getNodeColor(source);
    }
    return "#666";
  };

  useEffect(() => {
    if (!svgRef.current || !nodes.length) return;

    console.log("NetworkGraph rendering with data:", { nodes, links, filters });

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const width = svgRef.current.clientWidth;
    const height = svgRef.current.clientHeight;

    const g = svg.append("g");

    // Setup zoom behavior
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on("zoom", (event) => {
        g.attr("transform", event.transform);
      });

    svg.call(zoom);

    // Filter nodes by user relationship type and affiliation
    const filteredNodes = nodes.filter((node) => {
      if (filters.affiliation && node.affiliation !== filters.affiliation) return false;
      if (filters.userRelationshipType && node.userRelationshipType !== filters.userRelationshipType) return false;
      return true;
    });

    // Create a map for quick node lookup
    const nodeMap = new Map(filteredNodes.map(node => [node.id, node]));

    // Process links to create visible connections
    const processedLinks = links
      .filter(link => {
        // Skip if connection type filter is set and doesn't match
        if (filters.connectionType && link.connectionType !== filters.connectionType) {
          return false;
        }

        // Only keep links where both nodes exist in the filtered set
        const sourceNode = nodeMap.get(link.sourcePersonId);
        const targetNode = nodeMap.get(link.targetPersonId);
        return sourceNode && targetNode;
      })
      .map(link => ({
        source: nodeMap.get(link.sourcePersonId)!,
        target: nodeMap.get(link.targetPersonId)!,
        type: link.connectionType
      }));

    console.log("Processed links for rendering:", processedLinks);

    // Create force simulation
    const simulation = d3.forceSimulation(filteredNodes)
      .force("link", d3.forceLink(processedLinks)
        .id((d: any) => d.id)
        .distance(100))
      .force("charge", d3.forceManyBody().strength(-300))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collision", d3.forceCollide().radius(30));

    // Create links group
    const linkGroup = g.append("g")
      .attr("class", "links");

    // Render all connection lines
    processedLinks.forEach(link => {
      const style = getConnectionLineStyle(link.type);

      if (!style) return;

      if (style.doubleStroke) {
        // Create double stroke effect for strong connections
        [-style.doubleStrokeGap/2, style.doubleStrokeGap/2].forEach(offset => {
          linkGroup.append("line")
            .datum(link)
            .attr("stroke", getEdgeColor(link.source as Node, link.target as Node))
            .attr("stroke-opacity", 0.6)
            .attr("stroke-width", style.strokeWidth)
            .attr("stroke-dasharray", style.strokeDasharray)
            .attr("transform", `translate(0, ${offset})`);
        });
      } else {
        // Single line for other connection types
        linkGroup.append("line")
          .datum(link)
          .attr("stroke", getEdgeColor(link.source as Node, link.target as Node))
          .attr("stroke-opacity", 0.6)
          .attr("stroke-width", style.strokeWidth)
          .attr("stroke-dasharray", style.strokeDasharray);
      }
    });

    // Create nodes group with relationship-specific icons
    const nodeGroup = g.append("g")
      .attr("class", "nodes")
      .selectAll("g")
      .data(filteredNodes)
      .join("g")
      .call(d3.drag<any, any>()
        .on("start", (event, d) => {
          if (!event.active) simulation.alphaTarget(0.3).restart();
          d.fx = d.x;
          d.fy = d.y;
        })
        .on("drag", (event, d) => {
          d.fx = event.x;
          d.fy = event.y;
        })
        .on("end", (event, d) => {
          if (!event.active) simulation.alphaTarget(0);
          d.fx = null;
          d.fy = null;
        }));

    // Add relationship-based node icons
    nodeGroup
      .append("path")
      .attr("d", d => getUserRelationshipIcon(d.userRelationshipType).path)
      .attr("viewBox", d => getUserRelationshipIcon(d.userRelationshipType).viewBox)
      .attr("transform", d => {
        const icon = getUserRelationshipIcon(d.userRelationshipType);
        const yOffset = icon.viewBox === "0 -6 24 36" ? -15 : 
                       icon.viewBox === "0 0 24 32" ? -16 : -12;
        return `translate(-12, ${yOffset}) scale(1)`;
      })
      .attr("fill", d => getUserRelationshipIcon(d.userRelationshipType).fill ? getNodeColor(d) : "white")
      .attr("stroke", d => getNodeColor(d))
      .attr("stroke-width", 1.5)
      .attr("stroke-dasharray", d => getUserRelationshipIcon(d.userRelationshipType).strokeDasharray)
      .style("cursor", "pointer")
      .on("click", (_event, d) => onNodeSelect(d));

    // Add node labels
    nodeGroup
      .append("text")
      .text(d => d.name)
      .attr("font-size", "12px")
      .attr("dx", 15)
      .attr("dy", 4)
      .attr("fill", "#333");

    // Update positions on simulation tick
    simulation.on("tick", () => {
      linkGroup.selectAll("line")
        .attr("x1", (d: any) => d.source.x)
        .attr("y1", (d: any) => d.source.y)
        .attr("x2", (d: any) => d.target.x)
        .attr("y2", (d: any) => d.target.y);

      nodeGroup.attr("transform", (d: any) => `translate(${d.x},${d.y})`);
    });

    return () => {
      simulation.stop();
    };
  }, [nodes, links, filters, onNodeSelect, organizationColors]);

  return (
    <Card className="h-full w-full">
      <svg ref={svgRef} className="w-full h-full min-h-[600px]" style={{ background: "white" }} />
    </Card>
  );
}