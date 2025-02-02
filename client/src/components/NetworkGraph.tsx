import { useEffect, useRef } from "react";
import * as d3 from "d3";
import { Card } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";

interface Node extends d3.SimulationNodeDatum {
  id: number;
  name: string;
  organization?: string;
  relationshipToYou?: number;
  currentRole?: string;
}

interface Link extends d3.SimulationLinkDatum<Node> {
  sourcePersonId: number;
  targetPersonId: number;
  relationshipType: number;
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
    organization: string | null;
    connectionType: string | null;
  };
  onNodeSelect: (node: Node | null) => void;
  graphId: number;
}

const getLineStyle = (relationshipType: number) => {
  switch (relationshipType) {
    case 5: // Allied
      return {
        strokeWidth: 6,
        strokeDasharray: "none",
        doubleStroke: true,
        strokeOpacity: 0.8
      };
    case 4: // Trusted
      return {
        strokeWidth: 4,
        strokeDasharray: "none",
        doubleStroke: false,
        strokeOpacity: 0.7
      };
    case 3: // Close
      return {
        strokeWidth: 3,
        strokeDasharray: "none",
        doubleStroke: false,
        strokeOpacity: 0.6
      };
    case 2: // Familiar
      return {
        strokeWidth: 2,
        strokeDasharray: "none",
        doubleStroke: false,
        strokeOpacity: 0.5
      };
    case 1: // Acquainted
      return {
        strokeWidth: 1,
        strokeDasharray: "4,4",
        doubleStroke: false,
        strokeOpacity: 0.4
      };
    default:
      return {
        strokeWidth: 1,
        strokeDasharray: "2,2",
        doubleStroke: false,
        strokeOpacity: 0.3
      };
  }
};

const getNodeStyle = (relationshipToYou: number | undefined) => {
  switch (relationshipToYou) {
    case 5: // Allied
      return { radius: 12, fill: true };
    case 4: // Trusted
      return { radius: 10, fill: true };
    case 3: // Close
      return { radius: 8, fill: true };
    case 2: // Familiar
      return { radius: 8, fill: false };
    case 1: // Acquainted
      return { radius: 6, fill: false };
    default:
      return { radius: 6, fill: false };
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
    if (!node.organization) return "hsl(var(--primary))";
    return organizationColors.get(node.organization) || "hsl(var(--primary))";
  };

  useEffect(() => {
    if (!svgRef.current || !nodes.length) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const width = svgRef.current.clientWidth;
    const height = svgRef.current.clientHeight;
    const g = svg.append("g");

    // Set up zoom behavior
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on("zoom", (event) => {
        g.attr("transform", event.transform);
      });

    svg.call(zoom);

    // Filter nodes and links based on current filters
    const filteredNodes = nodes.filter(node => {
      if (filters.organization && node.organization !== filters.organization) {
        return false;
      }
      return true;
    });

    const filteredLinks = links.filter(link => {
      if (filters.connectionType && String(link.relationshipType) !== filters.connectionType) {
        return false;
      }
      const sourceExists = filteredNodes.some(n => n.id === link.sourcePersonId);
      const targetExists = filteredNodes.some(n => n.id === link.targetPersonId);
      return sourceExists && targetExists;
    });

    // Set up force simulation
    const simulation = d3.forceSimulation(filteredNodes)
      .force("link", d3.forceLink(filteredLinks)
        .id((d: any) => d.id)
        .distance(100))
      .force("charge", d3.forceManyBody().strength(-300))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collision", d3.forceCollide().radius(30));

    // Create and style links
    const linkGroup = g.append("g")
      .attr("class", "links")
      .selectAll("line")
      .data(filteredLinks)
      .join("line")
      .attr("stroke", "#999")
      .each(function(d: any) {
        const style = getLineStyle(d.relationshipType);
        d3.select(this)
          .attr("stroke-width", style.strokeWidth)
          .attr("stroke-dasharray", style.strokeDasharray)
          .attr("stroke-opacity", style.strokeOpacity);

        if (style.doubleStroke) {
          // Create parallel line for double stroke effect
          g.append("line")
            .datum(d)
            .attr("stroke", "#999")
            .attr("stroke-width", style.strokeWidth)
            .attr("stroke-opacity", style.strokeOpacity)
            .attr("transform", "translate(0, 4)");
        }
      });

    // Create and style nodes
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

    // Add circles for nodes
    nodeGroup.append("circle")
      .each(function(d: any) {
        const style = getNodeStyle(d.relationshipToYou);
        d3.select(this)
          .attr("r", style.radius)
          .attr("fill", style.fill ? getNodeColor(d) : "white")
          .attr("stroke", getNodeColor(d))
          .attr("stroke-width", 1.5)
          .style("cursor", "pointer");
      })
      .on("click", (_event, d) => onNodeSelect(d));

    // Add labels
    nodeGroup.append("text")
      .text(d => d.name)
      .attr("dx", 15)
      .attr("dy", 4)
      .attr("font-size", "12px")
      .attr("fill", "#333");

    // Update positions on simulation tick
    simulation.on("tick", () => {
      linkGroup
        .attr("x1", d => (d.source as any).x)
        .attr("y1", d => (d.source as any).y)
        .attr("x2", d => (d.target as any).x)
        .attr("y2", d => (d.target as any).y);

      nodeGroup
        .attr("transform", d => `translate(${(d as any).x},${(d as any).y})`);
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