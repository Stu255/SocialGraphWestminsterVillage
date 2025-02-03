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
    enabled: !!graphId,
  });

  const { data: connections = [] } = useQuery<Connection[]>({
    queryKey: ["/api/connections", graphId],
    enabled: !!graphId,
  });

  const updateConnection = useMutation({
    mutationFn: async ({ sourceId, targetId, connectionType }: { 
      sourceId: number, 
      targetId: number, 
      connectionType: number 
    }) => {
      const existingConnection = connections.find(c => 
        (c.sourcePersonId === sourceId && c.targetPersonId === targetId) ||
        (c.sourcePersonId === targetId && c.targetPersonId === sourceId)
      );

      console.log("Updating connection:", {
        sourceId,
        targetId,
        connectionType,
        existing: existingConnection,
        graphId
      });

      try {
        const endpoint = existingConnection 
          ? `/api/relationships/${existingConnection.id}`
          : `/api/relationships/new`;

        const response = await fetch(endpoint, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            graphId,
            connectionType,
            sourcePersonId: sourceId,
            targetPersonId: targetId
          })
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => null);
          throw new Error(
            errorData?.error || 
            `Failed to update connection: ${response.status} ${response.statusText}`
          );
        }

        return await response.json();
      } catch (error) {
        console.error("Connection update error:", error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/connections", graphId] });
      toast({ title: "Success", description: "Connection updated" });
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to update connection",
        variant: "destructive"
      });
    }
  });

  const getCurrentConnection = (targetPersonId: number) => {
    const connection = connections.find(c => 
      (c.sourcePersonId === selectedPerson?.id && c.targetPersonId === targetPersonId) ||
      (c.targetPersonId === selectedPerson?.id && c.sourcePersonId === targetPersonId)
    );
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
                          updateConnection.mutate({
                            sourceId: selectedPerson.id,
                            targetId: person.id,
                            connectionType: Number(value)
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