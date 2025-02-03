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

interface AddConnectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  graphId: number;
}

export function AddConnectionDialog({ open, onOpenChange, graphId }: AddConnectionDialogProps) {
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch data
  const { data: people = [] } = useQuery<Person[]>({
    queryKey: ["/api/people", graphId],
    enabled: !!graphId,
  });

  const { data: connections = [] } = useQuery<Connection[]>({
    queryKey: ["/api/connections", graphId],
    enabled: !!graphId,
  });

  // Handle connection updates
  const updateConnection = useMutation({
    mutationFn: async ({ sourceId, targetId, connectionType }: { 
      sourceId: number;
      targetId: number;
      connectionType: string;
    }) => {
      // Convert connection type name to number (0-5)
      const connectionTypeId = CONNECTION_TYPES.find(t => t.name === connectionType)?.id ?? 0;

      const payload = {
        graphId,
        connectionType: connectionTypeId,
        sourcePersonId: sourceId,
        targetPersonId: targetId
      };

      const existingConnection = connections.find(r => 
        (r.sourcePersonId === sourceId && r.targetPersonId === targetId) ||
        (r.targetPersonId === sourceId && r.sourcePersonId === targetId)
      );

      const endpoint = existingConnection 
        ? `/api/connections/${existingConnection.id}`
        : "/api/connections";

      const method = existingConnection ? "PUT" : "POST";

      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to update connection");
      }

      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/connections", graphId] });
      toast({
        title: "Success",
        description: "Connection updated successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Get current connection type name for a person
  const getCurrentConnection = (targetPersonId: number): string => {
    const connection = connections.find(r => 
      (r.sourcePersonId === selectedPerson?.id && r.targetPersonId === targetPersonId) ||
      (r.targetPersonId === selectedPerson?.id && r.sourcePersonId === targetPersonId)
    );

    const connectionType = CONNECTION_TYPES.find(t => t.id === connection?.connectionType);
    return connectionType?.name || "None";
  };

  // Handle connection selection
  const handleConnectionSelect = (targetPerson: Person, connectionType: string) => {
    if (!selectedPerson) return;

    updateConnection.mutate({
      sourceId: selectedPerson.id,
      targetId: targetPerson.id,
      connectionType,
    });
  };

  const filteredPeople = people.filter(person => 
    selectedPerson ? person.id !== selectedPerson.id : true
  );

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