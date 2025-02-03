import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
import { CONNECTION_TYPES } from "./RelationshipTypeManager";
import { useToast } from "@/hooks/use-toast";

interface Person {
  id: number;
  name: string;
  organization: string;
  jobTitle: string;
}

interface Connection {
  id: number;
  sourcePersonId: number;
  targetPersonId: number;
  connectionType: number;
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

  // Fetch people and connections
  const { data: people = [] } = useQuery<Person[]>({
    queryKey: ["/api/people", graphId],
    enabled: !!graphId,
  });

  const { data: connections = [] } = useQuery<Connection[]>({
    queryKey: ["/api/connections", graphId],
    enabled: !!graphId,
  });

  // Update connection - maps names to numbers and sends to API
  const updateConnection = useMutation({
    mutationFn: async ({ sourceId, targetId, connectionType }: {
      sourceId: number;
      targetId: number;
      connectionType: string;
    }) => {
      // Find connection type ID (0-5) from name
      const typeId = CONNECTION_TYPES.find(t => t.name === connectionType)?.id ?? 0;

      const payload = {
        graphId,
        connectionType: typeId,
        sourcePersonId: sourceId,
        targetPersonId: targetId
      };

      // Check if connection exists
      const existingConnection = connections.find(c => 
        (c.sourcePersonId === sourceId && c.targetPersonId === targetId) ||
        (c.targetPersonId === sourceId && c.sourcePersonId === targetId)
      );

      // Update or create
      const endpoint = existingConnection 
        ? `/api/connections/${existingConnection.id}`
        : "/api/connections";

      const response = await fetch(endpoint, {
        method: existingConnection ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error("Failed to update connection");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/connections", graphId] });
      toast({ title: "Success", description: "Connection updated" });
    },
    onError: () => {
      toast({ 
        title: "Error", 
        description: "Failed to update connection",
        variant: "destructive"
      });
    }
  });

  // Get connection type name from numeric value
  const getCurrentConnection = (targetPersonId: number) => {
    const connection = connections.find(c => 
      (c.sourcePersonId === selectedPerson?.id && c.targetPersonId === targetPersonId) ||
      (c.targetPersonId === selectedPerson?.id && c.sourcePersonId === targetPersonId)
    );

    return CONNECTION_TYPES.find(t => t.id === connection?.connectionType)?.name || "None";
  };

  // Handle dropdown selection
  const handleConnectionSelect = (targetPerson: Person, connectionType: string) => {
    if (!selectedPerson) return;

    updateConnection.mutate({
      sourceId: selectedPerson.id,
      targetId: targetPerson.id,
      connectionType
    });
  };

  // Filter out selected person from list
  const filteredPeople = people.filter(p => p.id !== selectedPerson?.id);

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
              {selectedPerson ? `Manage Connections for ${selectedPerson.name}` : "Select Person"}
            </DialogTitle>
          </div>
        </DialogHeader>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Organization</TableHead>
              <TableHead>Position</TableHead>
              {selectedPerson && <TableHead>Connection</TableHead>}
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredPeople.map((person) => (
              <TableRow key={person.id}>
                <TableCell>{person.name}</TableCell>
                <TableCell>{person.organization || "—"}</TableCell>
                <TableCell>{person.jobTitle || "—"}</TableCell>
                {selectedPerson && (
                  <TableCell>
                    <Select
                      value={getCurrentConnection(person.id)}
                      onValueChange={(value) => handleConnectionSelect(person, value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CONNECTION_TYPES.map((type) => (
                          <SelectItem key={type.id} value={type.name}>
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
                      variant="outline"
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