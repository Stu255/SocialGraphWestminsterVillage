import { useState } from "react";
import { useForm } from "react-hook-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { MultiStepRelationshipDialog } from "./MultiStepRelationshipDialog";

interface Affiliation {
  id: number;
  name: string;
  color: string;
}

export function NodeForm() {
  const [showRelationshipDialog, setShowRelationshipDialog] = useState(false);
  const [newPolitician, setNewPolitician] = useState<{ id: number; name: string } | null>(null);
  const queryClient = useQueryClient();

  const { data: affiliations = [] } = useQuery<Affiliation[]>({
    queryKey: ["/api/affiliations"],
  });

  const form = useForm({
    defaultValues: {
      name: "",
      constituency: "",
      affiliation: "",
      currentRole: "",
    },
  });

  const mutation = useMutation({
    mutationFn: async (values: any) => {
      const res = await fetch("/api/politicians", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      if (!res.ok) throw new Error("Failed to create politician");
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/politicians"] });
      setNewPolitician({ id: data.id, name: data.name });
      setShowRelationshipDialog(true);
      form.reset();
    },
  });

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Add Politician</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit((data) => mutation.mutate(data))} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="constituency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Constituency</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="affiliation"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Affiliation</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select affiliation" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {affiliations.map((affiliation) => (
                          <SelectItem key={affiliation.id} value={affiliation.name}>
                            {affiliation.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="currentRole"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Current Role</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />

              <Button type="submit" className="w-full">
                Add Politician
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      <MultiStepRelationshipDialog
        open={showRelationshipDialog}
        onOpenChange={setShowRelationshipDialog}
        newPolitician={newPolitician}
      />
    </>
  );
}