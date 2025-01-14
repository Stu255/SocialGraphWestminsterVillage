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

  const getEdgeColor = (source: Node, target: Node) => {
    if (source.party === target.party) {
      return partyColors[source.party as keyof typeof partyColors] || partyColors.Default;
    }
    return "#999"; // Black for inter-party connections
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
    const filteredNodes = nodes.filter(node => {
      if (filters.party && node.party !== filters.party) return false;
      return true;
    });

    // Transform links data for D3
    const filteredLinks = links.filter(link => {
      if (filters.relationshipType && link.relationshipType !== filters.relationshipType) return false;
      // Only include links where both nodes are in the filtered set
      const sourceExists = filteredNodes.some(n => n.id === link.sourcePoliticianId);
      const targetExists = filteredNodes.some(n => n.id === link.targetPoliticianId);
      return sourceExists && targetExists;
    }).map(link => ({
      source: filteredNodes.find(n => n.id === link.sourcePoliticianId),
      target: filteredNodes.find(n => n.id === link.targetPoliticianId),
      type: link.relationshipType
    }));

    // Create force simulation
    const simulation = d3.forceSimulation(filteredNodes)
      .force("link", d3.forceLink(filteredLinks)
        .id((d: any) => d.id)
        .distance(100))
      .force("charge", d3.forceManyBody().strength(-300))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collision", d3.forceCollide().radius(30));

    // Draw links first (so they appear behind nodes)
    const link = g.append("g")
      .attr("class", "links")
      .selectAll("line")
      .data(filteredLinks)
      .join("line")
      .attr("stroke", d => getEdgeColor(d.source as Node, d.target as Node))
      .attr("stroke-opacity", 0.6)
      .attr("stroke-width", 2);

    // Create node group
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

    // Add circles to node groups
    nodeGroup.append("circle")
      .attr("r", 8)
      .attr("fill", d => partyColors[d.party as keyof typeof partyColors] || partyColors.Default)
      .on("click", (_event, d) => onNodeSelect(d));

    // Add labels to node groups
    nodeGroup.append("text")
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

      nodeGroup.attr("transform", d => `translate(${d.x},${d.y})`);
    });

    return () => {
      simulation.stop();
    };
  }, [nodes, links, filters, onNodeSelect]);

  return (
    <Card className="h-full w-full">
      <svg
        ref={svgRef}
        className="w-full h-full min-h-[600px]"
        style={{ background: 'white' }}
      />
    </Card>
  );
}