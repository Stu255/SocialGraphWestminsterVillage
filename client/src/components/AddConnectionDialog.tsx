import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";
import { CONNECTION_TYPES, getConnectionNameById } from "./ConnectionManager";
import { useToast } from "@/hooks/use-toast";
import { getUserRelationshipNameById } from "./RelationshipTypeManager";

interface Person {
  id: number;
  name: string;
  organization: string;
  jobTitle: string;
  relationshipToYou: number;
}

interface Connection {
  id: number;
  sourcePersonId: number;
  targetPersonId: number;
  connectionType: number;
  graphId: number;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  graphId: number;
}

export function AddConnectionDialog({ open, onOpenChange, graphId }: Props) {
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: people = [] } = useQuery<Person[]>({
    queryKey: ["/api/people", graphId],
    queryFn: async () => {
      console.log("Fetching people for connection dialog, graphId:", graphId);
      const res = await fetch(`/api/people?graphId=${graphId}`);
      if (!res.ok) throw new Error("Failed to fetch people");
      const data = await res.json();
      console.log("People data for connections:", data);
      return data;
    },
    enabled: !!graphId,
  });

  const { data: connections = [] } = useQuery<Connection[]>({
    queryKey: ["/api/connections", graphId],
    queryFn: async () => {
      console.log("Fetching connections for dialog, graphId:", graphId);
      const res = await fetch(`/api/connections?graphId=${graphId}`);
      if (!res.ok) throw new Error("Failed to fetch connections");
      const data = await res.json();
      console.log("Connections data for dialog:", data);
      return data;
    },
    enabled: !!graphId,
  });

  const updateConnection = useMutation({
    mutationFn: async ({ sourceId, targetId, connectionType }: { 
      sourceId: number, 
      targetId: number, 
      connectionType: number 
    }) => {
      console.log("Updating connection in dialog:", {
        sourceId,
        targetId,
        connectionType,
        graphId
      });

      const res = await fetch(`/api/connections`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          graphId,
          connectionType,
          sourcePersonId: sourceId,
          targetPersonId: targetId
        })
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        console.error("Connection update failed:", errorData);
        throw new Error(
          errorData?.error || 
          `Failed to update connection: ${res.status} ${res.statusText}`
        );
      }

      const data = await res.json();
      console.log("Connection update successful:", data);
      return data;
    },
    onSuccess: () => {
      console.log("Invalidating connections query after update");
      queryClient.invalidateQueries({ queryKey: ["/api/connections", graphId] });
      toast({ title: "Success", description: "Connection updated" });
    },
    onError: (error: any) => {
      console.error("Connection update mutation error:", error);
      toast({ 
        title: "Error", 
        description: error.message || "Failed to update connection",
        variant: "destructive"
      });
    }
  });

  const getCurrentConnection = (targetPersonId: number) => {
    if (!selectedPerson) return 0;
    console.log("Getting current connection for target", targetPersonId, "connections:", connections);
    const connection = connections.find(c => 
      (c.sourcePersonId === selectedPerson.id && c.targetPersonId === targetPersonId) ||
      (c.sourcePersonId === targetPersonId && c.targetPersonId === selectedPerson.id)
    );
    console.log("Found connection:", connection);
    return connection?.connectionType ?? 0;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px]">
        <DialogHeader>
          <div className="flex items-center gap-2">
            {selectedPerson && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSelectedPerson(null)}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
            )}
            <DialogTitle>
              {selectedPerson ? `Manage Connections for ${selectedPerson.name}` : "Select Contact"}
            </DialogTitle>
          </div>
          <DialogDescription>
            Manage connections between contacts in your network
          </DialogDescription>
        </DialogHeader>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Organization</TableHead>
              <TableHead>Position</TableHead>
              <TableHead>Relationship to You</TableHead>
              {selectedPerson && <TableHead>Connection Type</TableHead>}
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {people
              .filter(person => person.id !== selectedPerson?.id)
              .map((person) => (
                <TableRow key={person.id}>
                  <TableCell>{person.name}</TableCell>
                  <TableCell>{person.organization || "—"}</TableCell>
                  <TableCell>{person.jobTitle || "—"}</TableCell>
                  <TableCell>{getUserRelationshipNameById(person.relationshipToYou)}</TableCell>
                  {selectedPerson && (
                    <TableCell>
                      <Select
                        value={String(getCurrentConnection(person.id))}
                        onValueChange={(value) => {
                          const connectionType = parseInt(value, 10);
                          console.log("Setting connection type:", connectionType);
                          updateConnection.mutate({
                            sourceId: selectedPerson.id,
                            targetId: person.id,
                            connectionType
                          });
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue>
                            {getConnectionNameById(getCurrentConnection(person.id))}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {CONNECTION_TYPES.map((type) => (
                            <SelectItem key={type.id} value={String(type.id)}>
                              {type.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                  )}
                  <TableCell>
                    {!selectedPerson && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedPerson(person)}
                      >
                        Manage
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </DialogContent>
    </Dialog>
  );
}