import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";

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
  onValueChange: (value: string) => void;
  placeholder?: string;
  excludeIds?: number[];
}

export function TabbedPersonSelect({
  value,
  onValueChange,
  placeholder = "Select person",
  excludeIds = [],
}: Props) {
  const [selectedAffiliation, setSelectedAffiliation] = useState<string | null>(null);

  const { data: affiliations = [] } = useQuery<Affiliation[]>({
    queryKey: ["/api/affiliations"],
  });

  const { data: people = [] } = useQuery<Person[]>({
    queryKey: ["/api/people"],
  });

  // Sort affiliations by member count
  const sortedAffiliations = [...affiliations].sort((a, b) => b.memberCount - a.memberCount);

  // Filter people by selected affiliation and excluded IDs
  const filteredPeople = people.filter(
    (p) =>
      (!selectedAffiliation || p.affiliation === selectedAffiliation) &&
      !excludeIds.includes(p.id)
  );

  return (
    <Select onValueChange={onValueChange} value={value}>
      <SelectTrigger>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <div className="mb-2">
          <ScrollArea className="max-w-[350px] whitespace-nowrap pb-2">
            <div className="flex gap-1">
              <button
                type="button"
                key="all"
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  !selectedAffiliation
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted"
                }`}
                onClick={() => setSelectedAffiliation(null)}
              >
                All
              </button>
              {sortedAffiliations.map((affiliation) => (
                <button
                  type="button"
                  key={affiliation.id}
                  className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                    selectedAffiliation === affiliation.name
                      ? "text-white"
                      : "text-muted-foreground hover:bg-muted"
                  }`}
                  style={{
                    backgroundColor:
                      selectedAffiliation === affiliation.name
                        ? affiliation.color
                        : "transparent",
                  }}
                  onClick={() => setSelectedAffiliation(affiliation.name)}
                >
                  {affiliation.name}
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
}