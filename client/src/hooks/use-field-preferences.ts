import { useQuery } from "@tanstack/react-query";

interface FieldPreferences {
  order: string[];
  hidden: string[];
}

export function useFieldPreferences(graphId: number) {
  return useQuery<FieldPreferences>({
    queryKey: ["/api/field-preferences", graphId],
    queryFn: async () => {
      const res = await fetch(`/api/field-preferences/${graphId}`);
      if (!res.ok) {
        throw new Error("Failed to fetch field preferences");
      }
      return res.json();
    }
  });
}
