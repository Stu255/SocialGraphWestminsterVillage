import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2, X, Check, ArrowLeft } from "lucide-react";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { getConnectionNameById } from "./ConnectionManager";
import {
  USER_RELATIONSHIP_TYPES,
  getUserRelationshipNameById,
  getUserRelationshipIdByName,
} from "./RelationshipTypeManager";

const FIELD_LABELS: Record<string, string> = {
  name: "Name",
  jobTitle: "Job Title",
  organization: "Organization",
  userRelationshipType: "Your Relationship",
  lastContact: "Last Contact",
  officeNumber: "Office Number",
  mobileNumber: "Mobile Number",
  email1: "Email Address 1",
  email2: "Email Address 2",
  linkedin: "LinkedIn",
  twitter: "Twitter",
  notes: "Notes"
};

export function AnalysisPanel({ selectedNode, graphId, onNodeDeleted }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const form = useForm({
    defaultValues: {
      name: "",
      jobTitle: "",
      organization: "",
      userRelationshipType: "",
      lastContact: "",
      officeNumber: "",
      mobileNumber: "",
      email1: "",
      email2: "",
      linkedin: "",
      twitter: "",
      notes: ""
    }
  });

  const updatePersonMutation = useMutation({
    mutationFn: async (values: any) => {
      const relationshipToYou = getUserRelationshipIdByName(values.userRelationshipType);
      console.log("Updating person with relationship:", relationshipToYou);

      const payload = {
        ...values,
        relationshipToYou,
        graphId
      };

      console.log("Sending contact data:", payload);

      const res = await fetch(`/api/people/${selectedNode.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error("Failed to update person");
      }

      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/people", graphId] });
      setIsEditing(false);
      toast({
        title: "Success",
        description: "Contact updated successfully",
      });
    },
  });

  useEffect(() => {
    if (selectedNode) {
      const formValues = {
        name: selectedNode.name || "",
        jobTitle: selectedNode.jobTitle || "",
        organization: selectedNode.organization || "",
        userRelationshipType: getUserRelationshipNameById(selectedNode.relationshipToYou),
        lastContact: selectedNode.lastContact ?
          new Date(selectedNode.lastContact).toISOString().split('T')[0] : "",
        officeNumber: selectedNode.officeNumber || "",
        mobileNumber: selectedNode.mobileNumber || "",
        email1: selectedNode.email1 || "",
        email2: selectedNode.email2 || "",
        linkedin: selectedNode.linkedin || "",
        twitter: selectedNode.twitter || "",
        notes: selectedNode.notes || ""
      };
      console.log("Setting form values:", formValues);
      form.reset(formValues);
    }
  }, [selectedNode, form]);

  const renderField = (fieldName: string) => {
    if (isEditing) {
      return (
        <FormField
          key={fieldName}
          control={form.control}
          name={fieldName}
          render={({ field }) => (
            <FormItem>
              <FormLabel>{FIELD_LABELS[fieldName]}</FormLabel>
              <FormControl>
                {fieldName === "userRelationshipType" ? (
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select relationship type" />
                    </SelectTrigger>
                    <SelectContent>
                      {USER_RELATIONSHIP_TYPES.map(type => (
                        <SelectItem key={type.id} value={type.name}>
                          {type.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : fieldName === "notes" ? (
                  <Textarea {...field} />
                ) : (
                  <Input {...field} />
                )}
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      );
    }

    let value = selectedNode[fieldName];
    if (fieldName === "userRelationshipType") {
      value = getUserRelationshipNameById(selectedNode.relationshipToYou);
    }

    return (
      <p key={fieldName}>
        <strong>{FIELD_LABELS[fieldName]}:</strong> {value || "Not specified"}
      </p>
    );
  };

  const { data: fieldPreferences } = useQuery({
    queryKey: ["/api/field-preferences", graphId],
    enabled: !!graphId,
  });

  const { data: nodes = [] } = useQuery({
    queryKey: ["/api/people", graphId],
    enabled: !!graphId,
  });

  const { data: relationships = [] } = useQuery({
    queryKey: ["/api/relationships", graphId],
    enabled: !!graphId,
  });

  const { data: organizations = [] } = useQuery({
    queryKey: ["/api/organizations", graphId],
    enabled: !!graphId,
  });

  const getOrganizationColor = () => {
    const org = organizations.find((o: any) => o.name === selectedNode?.organization);
    return org?.brandColor || 'hsl(var(--primary))';
  };

  const visibleFields = fieldPreferences?.order.filter(
    field => !fieldPreferences?.hidden.includes(field)
  ) || Object.keys(FIELD_LABELS);

  const { data: centrality } = useQuery({
    queryKey: ["/api/analysis/centrality", graphId],
    enabled: !!nodes.length,
  });

  const topPeople = centrality
    ?.sort((a: any, b: any) => b.centrality - a.centrality)
    .slice(0, 10) || [];

  const deletePersonMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/people/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error("Failed to delete person");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/people", graphId] });
      queryClient.invalidateQueries({ queryKey: ["/api/relationships", graphId] });
      if (onNodeDeleted) onNodeDeleted();
    },
  });

  const deleteConnectionMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/relationships/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error("Failed to delete connection");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/relationships", graphId] });
    },
  });

  const onSubmit = (data: any) => {
    if (!data.name?.trim()) {
      return;
    }
    if (!data.userRelationshipType) {
      return;
    }
    updatePersonMutation.mutate(data);
  };


  if (!selectedNode) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Network Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground mb-4">
              Select a node to view detailed analysis
            </p>

            <div className="space-y-2">
              <h3 className="text-sm font-medium">Top 10 Most Connected People</h3>
              {topPeople.map((person: any, index: number) => (
                <div key={person.id} className="flex justify-between items-center text-sm">
                  <span>{index + 1}. {person.name}</span>
                  <span className="text-muted-foreground">{person.centrality.toFixed(3)}</span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const onNodeDeleted = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/people", graphId] });
  };

  const nodeMetrics = centrality?.find((c: any) => c.id === selectedNode.id);
  const { data: connections = [] } = useQuery({
    queryKey: ["/api/connections", graphId],
    enabled: !!graphId,
  });

  const nodeConnections = connections.filter(r =>
    r.sourcePersonId === selectedNode?.id ||
    r.targetPersonId === selectedNode?.id
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={onNodeDeleted}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h2 className="text-lg font-semibold">{selectedNode.name}</h2>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle>Profile</CardTitle>
          <div className="flex gap-2">
            {isEditing ? (
              <>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setIsEditing(false)}
                >
                  <X className="h-4 w-4" style={{ color: getOrganizationColor() }} />
                </Button>
                <Button
                  variant="default"
                  size="icon"
                  onClick={form.handleSubmit(onSubmit)}
                  disabled={updatePersonMutation.isPending}
                >
                  <Check className="h-4 w-4" style={{ color: getOrganizationColor() }} />
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setIsEditing(true)}
                >
                  <Pencil className="h-4 w-4" style={{ color: getOrganizationColor() }} />
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="icon">
                      <Trash2 className="h-4 w-4" style={{ color: getOrganizationColor() }} />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Person</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will permanently delete {selectedNode.name} and all their connections.
                        This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => deletePersonMutation.mutate(selectedNode.id)}
                      >
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {visibleFields.map(field => renderField(field))}
            </form>
          </Form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Network Metrics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <p><strong>Centrality Score:</strong> {nodeMetrics?.centrality.toFixed(3) || 0}</p>
            <p><strong>Direct Connections:</strong> {nodeConnections.length}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Network Connections</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {nodeConnections.map(rel => {
              const otherNode = nodes.find(n =>
                n.id === (rel.sourcePersonId === selectedNode.id ?
                  rel.targetPersonId :
                  rel.sourcePersonId
                )
              );

              return (
                <div key={rel.id} className="flex items-center justify-between">
                  <span>
                    {rel.sourcePersonId === selectedNode.id ? "→" : "←"} {otherNode?.name}
                    ({getConnectionNameById(rel.connectionType)})
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteConnectionMutation.mutate(rel.id)}
                  >
                    <Trash2 className="h-4 w-4" style={{ color: getOrganizationColor() }} />
                  </Button>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}