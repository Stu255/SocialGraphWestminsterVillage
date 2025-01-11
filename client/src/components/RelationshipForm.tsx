import { useForm } from "react-hook-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { TabbedPersonSelect } from "@/components/ui/tabbed-person-select";

interface Person {
  id: number;
  name: string;
}

interface RelationshipType {
  id: number;
  name: string;
}

interface FormValues {
  sourcePersonId: string;
  targetPersonId: string;
  relationshipType: string;
  startDate: string;
}

export function RelationshipForm() {
  const queryClient = useQueryClient();
  const form = useForm<FormValues>({
    defaultValues: {
      sourcePersonId: "",
      targetPersonId: "",
      relationshipType: "",
      startDate: new Date().toISOString(),
    },
  });

  const { data: relationshipTypes = [] } = useQuery<RelationshipType[]>({
    queryKey: ["/api/relationship-types"],
  });

  const mutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const res = await fetch("/api/relationships", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...values,
          sourcePersonId: parseInt(values.sourcePersonId),
          targetPersonId: parseInt(values.targetPersonId),
        }),
      });
      if (!res.ok) throw new Error("Failed to create relationship");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/relationships"] });
      form.reset();
    },
  });

  const sourceId = form.watch("sourcePersonId");

  return (
    <Card>
      <CardHeader>
        <CardTitle>Add Relationship</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit((data) => mutation.mutate(data))} className="space-y-4">
            <FormField
              control={form.control}
              name="sourcePersonId"
              rules={{ required: "Source person is required" }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Source Person</FormLabel>
                  <FormControl>
                    <TabbedPersonSelect 
                      value={field.value} 
                      onChange={field.onChange}
                      placeholder="Select source person"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="targetPersonId"
              rules={{ required: "Target person is required" }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Target Person</FormLabel>
                  <FormControl>
                    <TabbedPersonSelect 
                      value={field.value} 
                      onChange={field.onChange}
                      placeholder="Select target person"
                      excludeIds={sourceId ? [parseInt(sourceId)] : []}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="relationshipType"
              rules={{ required: "Relationship type is required" }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Relationship Type</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent position="popper" side="top" align="start">
                      {relationshipTypes.map((type) => (
                        <SelectItem key={type.id} value={type.name}>
                          {type.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" className="w-full">
              Add Relationship
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}