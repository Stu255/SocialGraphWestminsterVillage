import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Label } from "@/components/ui/label";
import { TabbedPersonSelect } from "@/components/ui/tabbed-person-select";

interface Person {
  id: number;
  name: string;
  affiliation: string;
}

interface RelationshipType {
  id: number;
  name: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  newPerson: { id: number; name: string } | null;
}

interface RelationshipSelection {
  personId: number;
  type: string;
}

export function MultiStepRelationshipDialog({ open, onOpenChange, newPerson }: Props) {
  const [step, setStep] = useState<1 | 2>(1);
  const [selectedPeople, setSelectedPeople] = useState<number[]>([]);
  const [relationships, setRelationships] = useState<RelationshipSelection[]>([]);

  const queryClient = useQueryClient();

  const { data: people = [] } = useQuery<Person[]>({
    queryKey: ["/api/people"],
  });

  const { data: relationshipTypes = [] } = useQuery<RelationshipType[]>({
    queryKey: ["/api/relationship-types"],
  });

  const createRelationshipMutation = useMutation({
    mutationFn: async (relationship: any) => {
      const res = await fetch("/api/relationships", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(relationship),
      });
      if (!res.ok) throw new Error("Failed to create relationship");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/relationships"] });
    },
  });

  const handleNext = () => {
    if (step === 1) {
      setRelationships(
        selectedPeople.map(id => ({
          personId: id,
          type: "",
        }))
      );
      setStep(2);
    }
  };

  const handleFinish = async () => {
    const promises = relationships.map(rel => {
      if (!newPerson) return;
      return createRelationshipMutation.mutateAsync({
        sourcePersonId: newPerson.id,
        targetPersonId: rel.personId,
        relationshipType: rel.type,
      });
    });

    await Promise.all(promises);
    setStep(1);
    setSelectedPeople([]);
    setRelationships([]);
    onOpenChange(false);
  };

  const handleClose = () => {
    setStep(1);
    setSelectedPeople([]);
    setRelationships([]);
    onOpenChange(false);
  };

  if (!newPerson) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px] dialog-content">
        <DialogHeader>
          <DialogTitle className="dialog-title">
            {step === 1
              ? "Select People"
              : "Define Relationships"}
          </DialogTitle>
          <DialogDescription className="dialog-description">
            {step === 1
              ? "Select people to create relationships with."
              : "Choose relationship types for each selected person."}
          </DialogDescription>
        </DialogHeader>

        {step === 1 ? (
          <ScrollArea className="h-[300px] pr-4">
            <TabbedPersonSelect 
              selectedPeople={selectedPeople}
              setSelectedPeople={setSelectedPeople}
              people={people.filter(p => p.id !== newPerson?.id)}
            />
          </ScrollArea>
        ) : (
          <ScrollArea className="h-[300px] pr-4">
            <div className="space-y-3">
              {relationships.map((rel, index) => {
                const person = people.find(p => p.id === rel.personId);
                return (
                  <div key={rel.personId} className="space-y-2">
                    <Label className="form-label">{person?.name}</Label>
                    <Select
                      value={rel.type || undefined}
                      onValueChange={(value) => {
                        setRelationships(prev => {
                          const newRels = [...prev];
                          newRels[index] = { ...newRels[index], type: value };
                          return newRels;
                        });
                      }}
                    >
                      <SelectTrigger className="form-input">
                        <SelectValue placeholder="Select relationship type" />
                      </SelectTrigger>
                      <SelectContent position="popper" side="top" align="start">
                        {relationshipTypes.map((type) => (
                          <SelectItem key={type.id} value={type.name}>
                            {type.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}

        <DialogFooter>
          {step === 1 ? (
            <Button
              onClick={handleNext}
              disabled={selectedPeople.length === 0}
              className="form-input"
            >
              Next
            </Button>
          ) : (
            <div className="flex justify-between w-full">
              <Button
                variant="outline"
                onClick={() => setStep(1)}
                className="form-input"
              >
                Back
              </Button>
              <Button
                onClick={handleFinish}
                disabled={relationships.some(r => !r.type)}
                className="form-input"
              >
                Create Relationships
              </Button>
            </div>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}