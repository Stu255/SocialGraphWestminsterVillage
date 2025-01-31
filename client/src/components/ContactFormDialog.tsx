import { useState } from "react";
import { useForm } from "react-hook-form";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { ChevronLeft, ChevronRight, Check, ChevronsUpDown } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RELATIONSHIP_TYPES, getRelationshipNameById, getRelationshipIdByName } from "./RelationshipTypeManager";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { AddOrganizationDialog } from "./AddOrganizationDialog";

interface ContactFormDialogProps {
  contact?: any; // The contact to edit, if not provided it's a new contact
  open: boolean;
  onOpenChange: (open: boolean) => void;
  graphId: number;
}

const STEPS = [
  {
    title: "Basic Information",
    description: "Enter the contact's name and role",
    fields: ["name", "jobTitle", "organization", "relationshipToYou"]
  },
  {
    title: "Contact Information",
    description: "Update phone numbers and email addresses",
    fields: ["officeNumber", "mobileNumber", "email1", "email2"]
  },
  {
    title: "Social Media",
    description: "Manage social media profiles",
    fields: ["linkedin", "twitter"]
  },
  {
    title: "Notes",
    description: "Add detailed notes about this contact",
    fields: ["notes"]
  }
];

const FIELD_LABELS: Record<string, string> = {
  name: "Name",
  jobTitle: "Job Title",
  organization: "Organization",
  relationshipToYou: "Relationship To You",
  officeNumber: "Office Number",
  mobileNumber: "Mobile Number",
  email1: "Email Address 1",
  email2: "Email Address 2",
  linkedin: "LinkedIn",
  twitter: "Twitter",
  notes: "Notes"
};

export function ContactFormDialog({ contact, open, onOpenChange, graphId }: ContactFormDialogProps) {
  const [step, setStep] = useState(0);
  const [showAddOrg, setShowAddOrg] = useState(false);
  const [openCombobox, setOpenCombobox] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch organizations
  const { data: organizations = [] } = useQuery({
    queryKey: ["/api/organizations", graphId],
    queryFn: async () => {
      const res = await fetch(`/api/organizations?graphId=${graphId}`);
      if (!res.ok) throw new Error("Failed to fetch organizations");
      return res.json();
    },
  });

  const form = useForm({
    defaultValues: {
      name: contact?.name || "",
      jobTitle: contact?.jobTitle || "",
      organization: contact?.organization || "",
      relationshipToYou: contact?.relationshipToYou ? getRelationshipNameById(contact.relationshipToYou) : "",
      lastContact: contact?.lastContact ? new Date(contact.lastContact).toISOString().split('T')[0] : "",
      officeNumber: contact?.officeNumber || "",
      mobileNumber: contact?.mobileNumber || "",
      email1: contact?.email1 || "",
      email2: contact?.email2 || "",
      linkedin: contact?.linkedin || "",
      twitter: contact?.twitter || "",
      notes: contact?.notes || ""
    },
  });

  const mutation = useMutation({
    mutationFn: async (values: any) => {
      const transformedData = {
        name: values.name,
        job_title: values.jobTitle || null,
        organization: values.organization || null,
        relationship_to_you: values.relationshipToYou ? getRelationshipIdByName(values.relationshipToYou) : null,
        last_contact: values.lastContact ? new Date(values.lastContact).toISOString() : null,
        office_number: values.officeNumber || null,
        mobile_number: values.mobileNumber || null,
        email_1: values.email1 || null,
        email_2: values.email2 || null,
        linkedin: values.linkedin || null,
        twitter: values.twitter || null,
        notes: values.notes || null,
        graph_id: graphId
      };

      // Check if organization exists
      const orgExists = organizations.some((org: any) => org.name === values.organization);

      if (!orgExists && values.organization) {
        setShowAddOrg(true);
        throw new Error("Organization needs to be created first");
      }

      const url = contact ? `/api/people/${contact.id}` : "/api/people";
      const method = contact ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(transformedData),
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText || `Failed to ${contact ? 'update' : 'create'} contact`);
      }

      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/people", graphId] });
      onOpenChange(false);
      setStep(0);
      form.reset();
      toast({
        title: "Success",
        description: `Contact ${contact ? 'updated' : 'added'} successfully`,
      });
    },
    onError: (error: Error) => {
      if (error.message !== "Organization needs to be created first") {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
      }
    },
  });

  const currentStep = STEPS[step];
  const isLastStep = step === STEPS.length - 1;
  const isFirstStep = step === 0;

  const onSubmit = async (data: any) => {
    if (!data.name?.trim()) {
      toast({
        title: "Error",
        description: "Name is required",
        variant: "destructive",
      });
      return;
    }
    if (step === 0 && !data.relationshipToYou) {
      toast({
        title: "Error",
        description: "Relationship type is required",
        variant: "destructive",
      });
      return;
    }

    if (isLastStep) {
      await mutation.mutateAsync(data);
    } else {
      setStep(s => s + 1);
    }
  };

  const handlePrevious = (e: React.MouseEvent) => {
    e.preventDefault();
    setStep(s => s - 1);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{currentStep.title}</DialogTitle>
            <DialogDescription>
              {currentStep.description}
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-4">
                {currentStep.fields.map((field) => (
                  <FormField
                    key={field}
                    control={form.control}
                    name={field as keyof typeof form.formState.defaultValues}
                    rules={{
                      required: field === "name" ? "Name is required" :
                               field === "relationshipToYou" ? "Relationship type is required" :
                               false
                    }}
                    render={({ field: formField }) => (
                      <FormItem>
                        <FormLabel>{FIELD_LABELS[field]}</FormLabel>
                        <FormControl>
                          {field === "relationshipToYou" ? (
                            <Select
                              onValueChange={formField.onChange}
                              defaultValue={formField.value}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select relationship type" />
                              </SelectTrigger>
                              <SelectContent>
                                {RELATIONSHIP_TYPES.map(type => (
                                  <SelectItem key={type.id} value={type.name}>
                                    {type.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : field === "organization" ? (
                            <Popover open={openCombobox} onOpenChange={setOpenCombobox}>
                              <PopoverTrigger asChild>
                                <FormControl>
                                  <Button
                                    variant="outline"
                                    role="combobox"
                                    aria-expanded={openCombobox}
                                    className="w-full justify-between"
                                  >
                                    {formField.value
                                      ? formField.value
                                      : "Select organization..."}
                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                  </Button>
                                </FormControl>
                              </PopoverTrigger>
                              <PopoverContent className="w-full p-0">
                                <Command>
                                  <CommandInput placeholder="Search organization..." />
                                  <CommandEmpty>No organization found.</CommandEmpty>
                                  <CommandGroup>
                                    {organizations.map((org: any) => (
                                      <CommandItem
                                        key={org.id}
                                        value={org.name}
                                        onSelect={(currentValue) => {
                                          formField.onChange(currentValue);
                                          setOpenCombobox(false);
                                        }}
                                      >
                                        <Check
                                          className={cn(
                                            "mr-2 h-4 w-4",
                                            formField.value === org.name ? "opacity-100" : "opacity-0"
                                          )}
                                        />
                                        {org.name}
                                      </CommandItem>
                                    ))}
                                  </CommandGroup>
                                </Command>
                              </PopoverContent>
                            </Popover>
                          ) : field === "notes" ? (
                            <Textarea {...formField} className="min-h-[100px]" />
                          ) : (
                            <Input {...formField} />
                          )}
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                ))}
              </div>

              <div className="flex justify-between">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handlePrevious}
                  disabled={isFirstStep}
                >
                  <ChevronLeft className="h-4 w-4 mr-2" />
                  Previous
                </Button>

                <Button
                  type="submit"
                  disabled={mutation.isPending}
                >
                  {isLastStep ? (
                    mutation.isPending ? 
                      (contact ? "Updating..." : "Adding...") : 
                      (contact ? "Update Contact" : "Add Contact")
                  ) : (
                    <>
                      Next
                      <ChevronRight className="h-4 w-4 ml-2" />
                    </>
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <AddOrganizationDialog 
        open={showAddOrg}
        onOpenChange={(open) => {
          setShowAddOrg(open);
          if (!open) {
            // Retry contact creation after organization is added
            mutation.mutate(form.getValues());
          }
        }}
        defaultName={form.getValues().organization}
        graphId={graphId}
      />
    </>
  );
}
