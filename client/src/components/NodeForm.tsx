import { useState } from "react";
import { useForm } from "react-hook-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { MultiStepRelationshipDialog } from "./MultiStepRelationshipDialog";
import { FieldSettingsDialog } from "./FieldSettingsDialog";
import { useToast } from "@/hooks/use-toast";

interface Affiliation {
  id: number;
  name: string;
  color: string;
}

interface NodeFormProps {
  graphId: number;
}

export function NodeForm({ graphId }: NodeFormProps) {
  const [showRelationshipDialog, setShowRelationshipDialog] = useState(false);
  const [newPerson, setNewPerson] = useState<{ id: number; name: string } | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: affiliations = [] } = useQuery<Affiliation[]>({
    queryKey: ["/api/affiliations", graphId],
  });

  const form = useForm({
    defaultValues: {
      name: "",
      roleTitle: "",
      affiliation: "",
      notes: "",
      graphId,
    },
  });

  const mutation = useMutation({
    mutationFn: async (values: any) => {
      const res = await fetch("/api/people", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText || "Failed to create person");
      }

      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/people", graphId] });
      setNewPerson({ id: data.id, name: data.name });
      setShowRelationshipDialog(true);
      form.reset();
      toast({
        title: "Success",
        description: "Person added successfully",
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

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle>Add Person</CardTitle>
          <FieldSettingsDialog graphId={graphId} />
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit((data) => mutation.mutate(data))} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                rules={{ required: "Name is required" }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="roleTitle"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Role</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="affiliation"
                rules={{ required: "Affiliation is required" }}
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
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Textarea 
                        {...field} 
                        placeholder="Add notes about this person..."
                        className="min-h-[100px]"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <Button 
                type="submit" 
                className="w-full"
                disabled={mutation.isPending}
              >
                {mutation.isPending ? "Adding..." : "Add Person"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      <MultiStepRelationshipDialog
        open={showRelationshipDialog}
        onOpenChange={setShowRelationshipDialog}
        newPerson={newPerson}
      />
    </>
  );
}