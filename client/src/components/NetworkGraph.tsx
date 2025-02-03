import { useEffect, useRef } from "react";
import * as d3 from "d3";
import { Card } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";

interface Node extends d3.SimulationNodeDatum {
  id: number;
  name: string;
  affiliation: string;
  organization?: string;
  userRelationshipType?: number;
  currentRole?: string;
}

interface Link {
  sourcePersonId: number;
  targetPersonId: number;
  connectionType: number;
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
  filters: any;
  onNodeSelect: (node: Node | null) => void;
  graphId: number;
}

const CIRCLE_PATH = "M12 2a10 10 0 1 1 0 20 10 10 0 0 1 0-20z";
const CHEVRON_DOWN = "M4 24 L12 30 L20 24";
const CHEVRON_UP = "M4 0 L12 -6 L20 0";

const RELATIONSHIP_ICONS = {
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

const getRelationshipIcon = (relationshipId: number | undefined) => {
  switch (relationshipId) {
    case 5:
      return { 
        ...RELATIONSHIP_ICONS.strong,
        fill: true, 
        strokeDasharray: "none" 
      };
    case 4:
      return { 
        ...RELATIONSHIP_ICONS.regular,
        fill: true, 
        strokeDasharray: "none" 
      };
    case 3:
      return { 
        ...RELATIONSHIP_ICONS.basic,
        fill: true, 
        strokeDasharray: "none" 
      };
    case 2:
      return { 
        ...RELATIONSHIP_ICONS.basic,
        fill: false, 
        strokeDasharray: "none" 
      };
    case 1:
      return { 
        ...RELATIONSHIP_ICONS.basic,
        fill: false, 
        strokeDasharray: "2,2" 
      };
    default:
      return { 
        ...RELATIONSHIP_ICONS.basic,
        fill: false, 
        strokeDasharray: "2,2" 
      };
  }
};

const getConnectionLineStyle = (connectionType: number) => {
  console.log("Getting line style for connection type:", connectionType);
  switch (connectionType) {
    case 5: // Allied
      return { 
        strokeWidth: 6, 
        strokeDasharray: "none",
        doubleStroke: true,
        doubleStrokeGap: 8
      };
    case 4: // Trusted
      return { 
        strokeWidth: 4, 
        strokeDasharray: "none",
        doubleStroke: false 
      };
    case 3: // Close
      return { 
        strokeWidth: 2, 
        strokeDasharray: "none",
        doubleStroke: false 
      };
    case 2: // Familiar
      return { 
        strokeWidth: 1, 
        strokeDasharray: "none",
        doubleStroke: false 
      };
    case 1: // Acquainted
      return { 
        strokeWidth: 1, 
        strokeDasharray: "4,4",
        doubleStroke: false 
      };
    default:
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
    return "#999";
  };

  useEffect(() => {
    if (!svgRef.current || !nodes.length) return;

    console.log("NetworkGraph rendering with data:", {
      nodes,
      links,
      filters,
      graphId
    });

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

    console.log("Filtered nodes:", filteredNodes.map(n => n.id));

    const filteredLinks = links
      .filter((link) => {
        console.log("Processing link:", {
          link,
          sourceExists: filteredNodes.some(n => n.id === link.sourcePersonId),
          targetExists: filteredNodes.some(n => n.id === link.targetPersonId),
          connectionType: link.connectionType
        });

        // Only filter by relationship type if specified
        if (filters.relationshipType && link.connectionType !== filters.relationshipType) {
          console.log("Link filtered - wrong type:", link);
          return false;
        }

        const sourceExists = filteredNodes.some((n) => n.id === link.sourcePersonId);
        const targetExists = filteredNodes.some((n) => n.id === link.targetPersonId);

        if (!sourceExists || !targetExists) {
          console.log("Link filtered - missing node:", link);
          return false;
        }

        return true;
      })
      .map((link) => ({
        source: filteredNodes.find((n) => n.id === link.sourcePersonId)!,
        target: filteredNodes.find((n) => n.id === link.targetPersonId)!,
        type: link.connectionType,
      }));

    console.log("Filtered links for rendering:", filteredLinks);

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
      const style = getConnectionLineStyle(d.type);
      console.log("Style for link:", { link: d, style });

      if (!style) {
        console.log("No style returned for link type:", d.type);
        return;
      }

      if (style.doubleStroke && style.doubleStrokeGap) {
        [-style.doubleStrokeGap/2, style.doubleStrokeGap/2].forEach(offset => {
          linkGroup
            .append("line")
            .datum(d)
            .attr("stroke", getEdgeColor(d.source as Node, d.target as Node))
            .attr("stroke-opacity", 0.6)
            .attr("stroke-width", style.strokeWidth)
            .attr("stroke-dasharray", style.strokeDasharray)
            .attr("transform", `translate(0, ${offset})`);
        });
      } else {
        linkGroup
          .append("line")
          .datum(d)
          .attr("stroke", getEdgeColor(d.source as Node, d.target as Node))
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
      .attr("d", d => getRelationshipIcon(d.userRelationshipType).path)
      .attr("viewBox", d => getRelationshipIcon(d.userRelationshipType).viewBox)
      .attr("transform", d => {
        const icon = getRelationshipIcon(d.userRelationshipType);
        const yOffset = icon.viewBox === "0 -6 24 36" ? -15 : 
                       icon.viewBox === "0 0 24 32" ? -16 : -12;
        return `translate(-12, ${yOffset}) scale(1)`;
      })
      .attr("fill", d => getRelationshipIcon(d.userRelationshipType).fill ? getNodeColor(d) : "white")
      .attr("stroke", d => getNodeColor(d))
      .attr("stroke-width", 1.5)
      .attr("stroke-dasharray", d => getRelationshipIcon(d.userRelationshipType).strokeDasharray)
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
        .attr("x1", (d: any) => d.source.x)
        .attr("y1", (d: any) => d.source.y)
        .attr("x2", (d: any) => d.target.x)
        .attr("y2", (d: any) => d.target.y);

      nodeGroup.attr("transform", (d: any) => `translate(${d.x},${d.y})`);
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