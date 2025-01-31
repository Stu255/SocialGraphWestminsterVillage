import { useEffect, useRef } from "react";
import * as d3 from "d3";
import { Card } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";

interface Node {
  id: number;
  name: string;
  affiliation: string;
  organization?: string;
  relationshipToYou?: number;
  currentRole?: string;
}

interface Link {
  sourcePersonId: number;
  targetPersonId: number;
  relationshipType: string;
}

interface Organization {
  id: number;
  name: string;
  brandColor: string;
}

interface Props {
  nodes: Node[];
  links: Link[];
  filters: any;
  onNodeSelect: (node: Node | null) => void;
  graphId: number;
}

// SVG paths for relationship icons
const RELATIONSHIP_ICONS = {
  shield: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z",
  star: "M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z",
  doubleRing: "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm0 4a6 6 0 1 1 0 12 6 6 0 0 1 0-12z",
  circle: "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z",
  smallCircle: "M12 2a5 5 0 1 0 0 10 5 5 0 0 0 0-10z"
};

// Map relationship IDs to icon types
const getRelationshipIcon = (relationshipId: number | undefined) => {
  switch (relationshipId) {
    case 5:
      return "shield"; // Allied
    case 4:
      return "star"; // Trusted
    case 3:
      return "doubleRing"; // Close
    case 2:
      return "circle"; // Connected
    case 1:
      return "smallCircle"; // Acquainted
    default:
      return "smallCircle";
  }
};

export function NetworkGraph({ nodes, links, filters, onNodeSelect, graphId }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);

  // Fetch organizations data to get brand colors
  const { data: organizations = [] } = useQuery<Organization[]>({
    queryKey: ["/api/organizations", graphId],
    enabled: !!graphId,
  });

  // Create a map of organization colors
  const organizationColors = new Map(
    organizations.map(org => [org.name, org.brandColor])
  );

  // Debug log the organization colors
  console.log("Organization colors map:", Object.fromEntries(organizationColors));

  const getNodeColor = (node: Node) => {
    if (!node.organization) {
      console.log(`No organization for node: ${node.name}`);
      return "hsl(var(--primary))";
    }

    const color = organizationColors.get(node.organization);
    console.log(`Color for ${node.name} (${node.organization}):`, color);

    return color || "hsl(var(--primary))";
  };

  const getEdgeColor = (source: Node, target: Node) => {
    if (source.organization && target.organization && source.organization === target.organization) {
      return getNodeColor(source);
    }
    return "#999"; // Gray for inter-organization connections
  };

  useEffect(() => {
    if (!svgRef.current || !nodes.length) return;

    // Clear existing SVG
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const width = svgRef.current.clientWidth;
    const height = svgRef.current.clientHeight;

    // Create container group
    const g = svg.append("g");

    // Setup zoom behavior
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on("zoom", (event) => {
        g.attr("transform", event.transform);
      });

    svg.call(zoom);

    // Filter nodes and links based on filters
    const filteredNodes = nodes.filter((node) => {
      if (filters.affiliation && node.affiliation !== filters.affiliation) return false;
      return true;
    });

    // Transform links data for D3
    const filteredLinks = links
      .filter((link) => {
        if (filters.relationshipType && link.relationshipType !== filters.relationshipType) return false;
        const sourceExists = filteredNodes.some((n) => n.id === link.sourcePersonId);
        const targetExists = filteredNodes.some((n) => n.id === link.targetPersonId);
        return sourceExists && targetExists;
      })
      .map((link) => ({
        source: filteredNodes.find((n) => n.id === link.sourcePersonId)!,
        target: filteredNodes.find((n) => n.id === link.targetPersonId)!,
        type: link.relationshipType,
      }));

    // Create force simulation
    const simulation = d3
      .forceSimulation(filteredNodes)
      .force(
        "link",
        d3
          .forceLink(filteredLinks)
          .id((d: any) => d.id)
          .distance(100)
      )
      .force("charge", d3.forceManyBody().strength(-300))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collision", d3.forceCollide().radius(30));

    // Draw links first
    const link = g
      .append("g")
      .attr("class", "links")
      .selectAll("line")
      .data(filteredLinks)
      .join("line")
      .attr("stroke", d => getEdgeColor(d.source, d.target))
      .attr("stroke-opacity", 0.6)
      .attr("stroke-width", 2);

    // Create node group
    const nodeGroup = g
      .append("g")
      .attr("class", "nodes")
      .selectAll("g")
      .data(filteredNodes)
      .join("g")
      .call(
        d3
          .drag<any, any>()
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
          })
      );

    // Add relationship icons with organization colors
    nodeGroup
      .append("path")
      .attr("d", d => RELATIONSHIP_ICONS[getRelationshipIcon(d.relationshipToYou)])
      .attr("transform", d => {
        const isSmallCircle = getRelationshipIcon(d.relationshipToYou) === "smallCircle";
        return `translate(12,${isSmallCircle ? "7" : "12"}) scale(${isSmallCircle ? "1.6" : "0.8"})`;
      })
      .attr("fill", d => {
        const color = getNodeColor(d);
        console.log(`Setting color for ${d.name}:`, color);
        return color;
      })
      .attr("stroke", "#fff")
      .attr("stroke-width", 1.5)
      .style("cursor", "pointer")
      .on("click", (_event, d) => onNodeSelect(d));

    // Add labels
    nodeGroup
      .append("text")
      .text(d => d.name)
      .attr("font-size", "12px")
      .attr("dx", 12)
      .attr("dy", 4)
      .attr("fill", "#333");

    // Update positions on each tick
    simulation.on("tick", () => {
      link
        .attr("x1", d => (d.source as any).x)
        .attr("y1", d => (d.source as any).y)
        .attr("x2", d => (d.target as any).x)
        .attr("y2", d => (d.target as any).y);

      nodeGroup.attr("transform", d => `translate(${(d as any).x - 12},${(d as any).y - 12})`);
    });

    return () => {
      simulation.stop();
    };
  }, [nodes, links, filters, onNodeSelect, organizationColors, graphId]);

  return (
    <Card className="h-full w-full">
      <svg ref={svgRef} className="w-full h-full min-h-[600px]" style={{ background: "white" }} />
    </Card>
  );
}