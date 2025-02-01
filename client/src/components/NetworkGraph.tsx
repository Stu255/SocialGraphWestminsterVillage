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

// Base circle for all relationship types
const CIRCLE_PATH = "M12 2a10 10 0 1 1 0 20 10 10 0 0 1 0-20z";
// Chevrons positioned outside the circle
const CHEVRON_DOWN = "M4 22l8 8 8-8"; // Moved down to touch bottom of circle
const CHEVRON_UP = "M4 -8l8 8 8-8";   // Moved up to touch top of circle

const RELATIONSHIP_ICONS = {
  allied: {
    path: `${CIRCLE_PATH} ${CHEVRON_DOWN} ${CHEVRON_UP}`,
    viewBox: "0 0 24 40" // Extended viewBox to accommodate outer chevrons
  },
  trusted: {
    path: `${CIRCLE_PATH} ${CHEVRON_DOWN}`,
    viewBox: "0 0 24 32" // Extended viewBox to accommodate bottom chevron
  },
  circle: {
    path: CIRCLE_PATH,
    viewBox: "0 0 24 24"
  }
};

const getRelationshipIcon = (relationshipId: number | undefined) => {
  switch (relationshipId) {
    case 5: // Allied
      return { 
        ...RELATIONSHIP_ICONS.allied,
        fill: true, 
        strokeDasharray: "none" 
      };
    case 4: // Trusted
      return { 
        ...RELATIONSHIP_ICONS.trusted,
        fill: true, 
        strokeDasharray: "none" 
      };
    case 3: // Close
      return { 
        ...RELATIONSHIP_ICONS.circle,
        fill: true, 
        strokeDasharray: "none" 
      };
    case 2: // Connected
      return { 
        ...RELATIONSHIP_ICONS.circle,
        fill: false, 
        strokeDasharray: "none" 
      };
    case 1: // Acquainted
      return { 
        ...RELATIONSHIP_ICONS.circle,
        fill: false, 
        strokeDasharray: "2,2" 
      };
    default:
      return { 
        ...RELATIONSHIP_ICONS.circle,
        fill: false, 
        strokeDasharray: "2,2" 
      };
  }
};

const getRelationshipLineStyle = (relationshipType: string) => {
  switch (relationshipType) {
    case "Allied":
      return { 
        strokeWidth: 4, 
        strokeDasharray: "none",
        doubleStroke: false 
      };
    case "Trusted":
      return { 
        strokeWidth: 2, 
        strokeDasharray: "none",
        doubleStroke: true,
        doubleStrokeGap: 4
      };
    case "Close":
      return { 
        strokeWidth: 2, 
        strokeDasharray: "none",
        doubleStroke: false 
      };
    case "Connected":
      return { 
        strokeWidth: 1, 
        strokeDasharray: "none",
        doubleStroke: false 
      };
    case "Acquainted":
      return { 
        strokeWidth: 1, 
        strokeDasharray: "4,4",
        doubleStroke: false 
      };
    default:
      return { 
        strokeWidth: 1, 
        strokeDasharray: "none",
        doubleStroke: false 
      };
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
    return "#999";
  };

  useEffect(() => {
    if (!svgRef.current || !nodes.length) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const width = svgRef.current.clientWidth;
    const height = svgRef.current.clientHeight;

    const g = svg.append("g");

    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on("zoom", (event) => {
        g.attr("transform", event.transform);
      });

    svg.call(zoom);

    const filteredNodes = nodes.filter((node) => {
      if (filters.affiliation && node.affiliation !== filters.affiliation) return false;
      return true;
    });

    const uniqueLinks = links.filter((link) => {
      return link.sourcePersonId < link.targetPersonId;
    });

    const filteredLinks = uniqueLinks
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

    const linkGroup = g.append("g").attr("class", "links");

    filteredLinks.forEach(d => {
      const style = getRelationshipLineStyle(d.type);

      if (style.doubleStroke) {
        [-style.doubleStrokeGap/2, style.doubleStrokeGap/2].forEach(offset => {
          linkGroup
            .append("line")
            .datum(d)
            .attr("stroke", getEdgeColor(d.source, d.target))
            .attr("stroke-opacity", 0.6)
            .attr("stroke-width", style.strokeWidth)
            .attr("stroke-dasharray", style.strokeDasharray)
            .attr("transform", `translate(0, ${offset})`);
        });
      } else {
        linkGroup
          .append("line")
          .datum(d)
          .attr("stroke", getEdgeColor(d.source, d.target))
          .attr("stroke-opacity", 0.6)
          .attr("stroke-width", style.strokeWidth)
          .attr("stroke-dasharray", style.strokeDasharray);
      }
    });

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

    nodeGroup
      .append("path")
      .attr("d", d => getRelationshipIcon(d.relationshipToYou).path)
      .attr("viewBox", d => getRelationshipIcon(d.relationshipToYou).viewBox)
      .attr("transform", d => {
        const icon = getRelationshipIcon(d.relationshipToYou);
        // Adjust vertical position to center the circle portion of each icon
        const yOffset = icon.viewBox === "0 0 24 40" ? -20 : 
                       icon.viewBox === "0 0 24 32" ? -16 : -12;
        return `translate(-10, ${yOffset}) scale(0.8)`;
      })
      .attr("fill", d => getRelationshipIcon(d.relationshipToYou).fill ? getNodeColor(d) : "white")
      .attr("stroke", d => getNodeColor(d))
      .attr("stroke-width", 1.5)
      .attr("stroke-dasharray", d => getRelationshipIcon(d.relationshipToYou).strokeDasharray)
      .style("cursor", "pointer")
      .on("click", (_event, d) => onNodeSelect(d));

    nodeGroup
      .append("text")
      .text(d => d.name)
      .attr("font-size", "12px")
      .attr("dx", 15)
      .attr("dy", 4)
      .attr("fill", "#333");

    simulation.on("tick", () => {
      linkGroup.selectAll("line")
        .attr("x1", d => (d.source as any).x)
        .attr("y1", d => (d.source as any).y)
        .attr("x2", d => (d.target as any).x)
        .attr("y2", d => (d.target as any).y);

      nodeGroup.attr("transform", d => `translate(${(d as any).x},${(d as any).y})`);
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