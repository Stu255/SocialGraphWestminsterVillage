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

/**
 * Calculates degree centrality for each node in the network
 * Degree centrality is the number of direct connections a node has
 */
export function calculateCentrality(nodes: Node[], links: Link[]) {
  return nodes.map(node => {
    const degree = links.filter(link => 
      link.sourcePoliticianId === node.id || 
      link.targetPoliticianId === node.id
    ).length;
    return {
      id: node.id,
      name: node.name,
      centrality: degree
    };
  });
}

/**
 * Identifies bridge nodes that connect different communities
 * Bridge nodes are those that have connections to multiple parties
 */
export function findBridgeNodes(nodes: Node[], links: Link[]) {
  return nodes.map(node => {
    const connections = links.filter(link =>
      link.sourcePoliticianId === node.id ||
      link.targetPoliticianId === node.id
    );
    
    const connectedParties = new Set(
      connections.map(link => {
        const connectedNode = nodes.find(n => 
          n.id === (link.sourcePoliticianId === node.id ? 
            link.targetPoliticianId : 
            link.sourcePoliticianId
          )
        );
        return connectedNode?.party;
      })
    );

    return {
      id: node.id,
      name: node.name,
      isBridge: connectedParties.size > 1,
      connectedParties: Array.from(connectedParties)
    };
  });
}

/**
 * Calculates clustering coefficient for each node
 * This measures how well a node's neighbors are connected to each other
 */
export function calculateClustering(nodes: Node[], links: Link[]) {
  return nodes.map(node => {
    const neighbors = new Set(
      links
        .filter(link => 
          link.sourcePoliticianId === node.id || 
          link.targetPoliticianId === node.id
        )
        .map(link => 
          link.sourcePoliticianId === node.id ? 
            link.targetPoliticianId : 
            link.sourcePoliticianId
        )
    );

    const neighborCount = neighbors.size;
    if (neighborCount < 2) return { id: node.id, name: node.name, clustering: 0 };

    let connectionsBetweenNeighbors = 0;
    const maxPossibleConnections = (neighborCount * (neighborCount - 1)) / 2;

    Array.from(neighbors).forEach((neighbor1, i) => {
      Array.from(neighbors).slice(i + 1).forEach(neighbor2 => {
        if (links.some(link => 
          (link.sourcePoliticianId === neighbor1 && link.targetPoliticianId === neighbor2) ||
          (link.sourcePoliticianId === neighbor2 && link.targetPoliticianId === neighbor1)
        )) {
          connectionsBetweenNeighbors++;
        }
      });
    });

    return {
      id: node.id,
      name: node.name,
      clustering: maxPossibleConnections > 0 ? 
        connectionsBetweenNeighbors / maxPossibleConnections : 
        0
    };
  });
}

/**
 * Detects isolated nodes or small clusters
 * Useful for finding politicians with few or no connections
 */
export function findIsolatedNodes(nodes: Node[], links: Link[], threshold: number = 1) {
  return nodes.map(node => {
    const connectionCount = links.filter(link =>
      link.sourcePoliticianId === node.id ||
      link.targetPoliticianId === node.id
    ).length;

    return {
      id: node.id,
      name: node.name,
      isIsolated: connectionCount <= threshold,
      connectionCount
    };
  });
}

/**
 * Groups nodes by party and calculates inter-party connections
 */
export function analyzePartyConnections(nodes: Node[], links: Link[]) {
  const parties = Array.from(new Set(nodes.map(node => node.party)));
  const partyConnections: Record<string, Record<string, number>> = {};

  parties.forEach(party1 => {
    partyConnections[party1] = {};
    parties.forEach(party2 => {
      partyConnections[party1][party2] = 0;
    });
  });

  links.forEach(link => {
    const sourceNode = nodes.find(n => n.id === link.sourcePoliticianId);
    const targetNode = nodes.find(n => n.id === link.targetPoliticianId);
    
    if (sourceNode && targetNode) {
      partyConnections[sourceNode.party][targetNode.party]++;
      if (sourceNode.party !== targetNode.party) {
        partyConnections[targetNode.party][sourceNode.party]++;
      }
    }
  });

  return partyConnections;
}
