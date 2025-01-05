import { useEffect, useRef } from "react";
import * as d3 from "d3";
import { Card } from "@/components/ui/card";

interface Node {
  id: number;
  name: string;
  party: string;
  currentRole?: string;
}

interface Link {
  sourcePoliticianId: number;
  targetPoliticianId: number;
  relationshipType: string;
}

interface Props {
  nodes: Node[];
  links: Link[];
  filters: any;
  onNodeSelect: (node: Node | null) => void;
}

const partyColors = {
  Conservative: "#0087DC",
  Labour: "#DC241f",
  "Liberal Democrat": "#FDBB30",
  SNP: "#FDF38E",
  Default: "#808080",
} as const;

export function NetworkGraph({ nodes, links, filters, onNodeSelect }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);

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
    const filteredNodes = nodes.filter(node => {
      if (filters.party && node.party !== filters.party) return false;
      return true;
    });

    const filteredLinks = links.filter(link => {
      if (filters.relationshipType && link.relationshipType !== filters.relationshipType) return false;
      return true;
    }).map(link => ({
      source: link.sourcePoliticianId,
      target: link.targetPoliticianId,
      type: link.relationshipType
    }));

    // Create force simulation
    const simulation = d3.forceSimulation<any>(filteredNodes)
      .force("link", d3.forceLink<any, any>(filteredLinks)
        .id(d => d.id)
        .distance(100))
      .force("charge", d3.forceManyBody().strength(-200))
      .force("center", d3.forceCenter(width / 2, height / 2));

    // Draw links
    const link = g.append("g")
      .selectAll("line")
      .data(filteredLinks)
      .join("line")
      .attr("stroke", "#999")
      .attr("stroke-opacity", 0.6)
      .attr("stroke-width", 2);

    // Draw nodes
    const node = g.append("g")
      .selectAll("circle")
      .data(filteredNodes)
      .join("circle")
      .attr("r", 8)
      .attr("fill", d => partyColors[d.party as keyof typeof partyColors] || partyColors.Default)
      .on("click", (_event, d) => onNodeSelect(d));

    // Add labels
    const label = g.append("g")
      .selectAll("text")
      .data(filteredNodes)
      .join("text")
      .text(d => d.name)
      .attr("font-size", "12px")
      .attr("dx", 12)
      .attr("dy", 4);

    // Drag behavior
    const drag = d3.drag<SVGCircleElement, any>()
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
      });

    node.call(drag as any);

    // Update positions on each tick
    simulation.on("tick", () => {
      link
        .attr("x1", d => (d.source as any).x)
        .attr("y1", d => (d.source as any).y)
        .attr("x2", d => (d.target as any).x)
        .attr("y2", d => (d.target as any).y);

      node
        .attr("cx", d => d.x)
        .attr("cy", d => d.y);

      label
        .attr("x", d => d.x)
        .attr("y", d => d.y);
    });

    return () => {
      simulation.stop();
    };
  }, [nodes, links, filters, onNodeSelect]);

  return (
    <Card className="h-full w-full overflow-hidden">
      <svg
        ref={svgRef}
        className="w-full h-full"
        style={{ background: 'white' }}
      />
    </Card>
  );
}