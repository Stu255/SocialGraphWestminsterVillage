import { forwardRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

interface Person {
  id: number;
  name: string;
  affiliation: string;
}

interface Affiliation {
  id: number;
  name: string;
  color: string;
  memberCount: number;
}

interface Props {
  value?: string;
  onValueChange?: (value: string) => void;
  placeholder?: string;
  excludeIds?: number[];
  // For multi-select mode
  selectedPeople?: number[];
  setSelectedPeople?: (ids: number[]) => void;
  people?: Person[];
}

export const TabbedPersonSelect = forwardRef<HTMLButtonElement, Props>(({
  value,
  onValueChange,
  placeholder = "Select person",
  excludeIds = [],
  selectedPeople,
  setSelectedPeople,
  people: propPeople,
}, ref) => {
  const [selectedAffiliation, setSelectedAffiliation] = useState<string | null>(null);

  const { data: affiliations = [] } = useQuery<Affiliation[]>({
    queryKey: ["/api/affiliations"],
  });

  const { data: fetchedPeople = [] } = useQuery<Person[]>({
    queryKey: ["/api/people"],
    enabled: !propPeople, // Only fetch if people are not provided as props
  });

  const people = propPeople || fetchedPeople;

  // Sort affiliations by member count
  const sortedAffiliations = [...affiliations].sort((a, b) => b.memberCount - a.memberCount);

  // Filter people by selected affiliation and excluded IDs
  const filteredPeople = people.filter(
    (p) =>
      (!selectedAffiliation || p.affiliation === selectedAffiliation) &&
      !excludeIds.includes(p.id)
  );

  if (selectedPeople !== undefined && setSelectedPeople !== undefined) {
    // Multi-select mode
    return (
      <div className="space-y-4">
        <ScrollArea className="max-w-[350px] whitespace-nowrap pb-2">
          <div className="flex gap-1">
            <button
              type="button"
              key="all"
              className="w-8 h-8 rounded-full relative"
              style={{
                backgroundColor: !selectedAffiliation ? 'hsl(var(--primary))' : 'hsl(var(--muted))',
              }}
              onClick={() => setSelectedAffiliation(null)}
            >
              {!selectedAffiliation && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-2 h-2 rounded-full bg-white" />
                </div>
              )}
            </button>
            {sortedAffiliations.map((affiliation) => (
              <button
                type="button"
                key={affiliation.id}
                className="w-8 h-8 rounded-full relative"
                style={{
                  backgroundColor: affiliation.color,
                  opacity: selectedAffiliation === affiliation.name ? 1 : 0.7,
                }}
                onClick={() => setSelectedAffiliation(affiliation.name)}
              >
                {selectedAffiliation === affiliation.name && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-2 h-2 rounded-full bg-white" />
                  </div>
                )}
              </button>
            ))}
          </div>
        </ScrollArea>
        <div className="space-y-2">
          {filteredPeople.map(person => (
            <div key={person.id} className="flex items-center space-x-2">
              <Checkbox
                id={`p-${person.id}`}
                checked={selectedPeople.includes(person.id)}
                onCheckedChange={(checked) => {
                  setSelectedPeople(
                    checked
                      ? [...selectedPeople, person.id]
                      : selectedPeople.filter(id => id !== person.id)
                  );
                }}
              />
              <Label htmlFor={`p-${person.id}`}>{person.name}</Label>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Single-select mode
  return (
    <Select onValueChange={onValueChange} value={value}>
      <SelectTrigger ref={ref}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <div className="mb-2">
          <ScrollArea className="max-w-[350px] whitespace-nowrap pb-2">
            <div className="flex gap-1">
              <button
                type="button"
                key="all"
                className="w-8 h-8 rounded-full relative"
                style={{
                  backgroundColor: !selectedAffiliation ? 'hsl(var(--primary))' : 'hsl(var(--muted))',
                }}
                onClick={() => setSelectedAffiliation(null)}
              >
                {!selectedAffiliation && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-2 h-2 rounded-full bg-white" />
                  </div>
                )}
              </button>
              {sortedAffiliations.map((affiliation) => (
                <button
                  type="button"
                  key={affiliation.id}
                  className="w-8 h-8 rounded-full relative"
                  style={{
                    backgroundColor: affiliation.color,
                    opacity: selectedAffiliation === affiliation.name ? 1 : 0.7,
                  }}
                  onClick={() => setSelectedAffiliation(affiliation.name)}
                >
                  {selectedAffiliation === affiliation.name && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-2 h-2 rounded-full bg-white" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </ScrollArea>
        </div>
        <ScrollArea className="h-[200px]">
          {filteredPeople.map((person) => (
            <SelectItem key={person.id} value={person.id.toString()}>
              {person.name}
            </SelectItem>
          ))}
        </ScrollArea>
      </SelectContent>
    </Select>
  );
});

TabbedPersonSelect.displayName = "TabbedPersonSelect";