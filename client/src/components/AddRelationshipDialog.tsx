import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { CONNECTION_TYPES, getConnectionNameById, getConnectionIdByName } from "./RelationshipTypeManager";
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
  const [filters, setFilters] = useState<Record<string, string>>({});
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

  const { data: organizations = [] } = useQuery({
    queryKey: ["/api/organizations", graphId],
    enabled: !!graphId,
  });

  // Handle connection updates
  const updateConnectionMutation = useMutation({
    mutationFn: async ({ sourceId, targetId, connectionType }: { 
      sourceId: number;
      targetId: number;
      connectionType: string;
    }) => {
      // Convert connection type name to ID (0-5)
      const connectionTypeId = getConnectionIdByName(connectionType);
      
      const payload = {
        graphId,
        connectionType: connectionTypeId,
        sourcePersonId: sourceId,
        targetPersonId: targetId
      };

      console.log("Updating connection with payload:", payload);

      const existingConnection = connections.find(r => 
        (r.sourcePersonId === sourceId && r.targetPersonId === targetId) ||
        (r.targetPersonId === sourceId && r.sourcePersonId === targetId)
      );

      if (existingConnection) {
        const res = await fetch(`/api/connections/${existingConnection.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          const error = await res.json();
          throw new Error(error.message || "Failed to update connection");
        }

        return res.json();
      }

      const res = await fetch("/api/connections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to create connection");
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
      console.error("Connection mutation error:", error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Get current connection type for a person
  const getCurrentConnectionType = (targetPersonId: number): string => {
    if (!selectedPerson) return "None";

    const connection = connections.find(r => 
      (r.sourcePersonId === selectedPerson.id && r.targetPersonId === targetPersonId) ||
      (r.targetPersonId === selectedPerson.id && r.sourcePersonId === targetPersonId)
    );

    if (!connection) return "None";
    return getConnectionNameById(connection.connectionType);
  };

  // Handle connection selection
  const handleConnectionSelect = (targetPerson: Person, connectionType: string) => {
    if (!selectedPerson) return;

    updateConnectionMutation.mutate({
      sourceId: selectedPerson.id,
      targetId: targetPerson.id,
      connectionType,
    });
  };

  // Filter people
  const filteredPeople = people.filter(person => {
    if (selectedPerson && person.id === selectedPerson.id) return false;

    return Object.entries(filters).every(([key, value]) => {
      if (!value) return true;
      const fieldValue = String(person[key as keyof Person] || "").toLowerCase();
      return fieldValue.includes(value.toLowerCase());
    });
  });

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
            <div>
              <DialogTitle>
                {selectedPerson ? `Manage Connections for ${selectedPerson.name}` : "Add Connections"}
              </DialogTitle>
              {selectedPerson && (
                <DialogDescription>
                  {selectedPerson.jobTitle} at {selectedPerson.organization}
                </DialogDescription>
              )}
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Organization</TableHead>
                <TableHead>Position</TableHead>
                {selectedPerson && (
                  <TableHead>Connection</TableHead>
                )}
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
                        value={getCurrentConnectionType(person.id)}
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
        </div>
      </DialogContent>
    </Dialog>
  );
}
