import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Settings2, ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";

interface ContactListDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  graphId: number;
}

interface EditDialogProps {
  contact: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  graphId: number;
}

const STEPS = [
  {
    title: "Basic Information",
    description: "Edit the contact's name and role",
    fields: ["name", "jobTitle", "organization"]
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
  officeNumber: "Office Number",
  mobileNumber: "Mobile Number",
  email1: "Email Address 1",
  email2: "Email Address 2",
  linkedin: "LinkedIn",
  twitter: "Twitter",
  notes: "Notes"
};

function EditDialog({ contact, open, onOpenChange, graphId }: EditDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [step, setStep] = useState(0);

  const form = useForm({
    defaultValues: {
      name: contact?.name || "",
      jobTitle: contact?.jobTitle || "",
      organization: contact?.organization || "",
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
      const res = await fetch(`/api/people/${contact.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...values, graphId }),
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText || "Failed to update contact");
      }

      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/people", graphId] });
      onOpenChange(false);
      toast({
        title: "Success",
        description: "Contact updated successfully",
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

  const onSubmit = (data: any) => {
    mutation.mutate(data);
  };

  const currentStep = STEPS[step];
  const isLastStep = step === STEPS.length - 1;
  const isFirstStep = step === 0;

  const handlePrevious = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!isFirstStep) {
      setStep(s => s - 1);
    }
  };

  const handleNext = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!isLastStep) {
      setStep(s => s + 1);
    }
  };

  return (
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
              {currentStep.fields.map((fieldName) => (
                <FormField
                  key={fieldName}
                  control={form.control}
                  name={fieldName}
                  rules={{ required: fieldName === "name" ? "Name is required" : false }}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{FIELD_LABELS[fieldName]}</FormLabel>
                      <FormControl>
                        {fieldName === "notes" ? (
                          <Textarea 
                            {...field} 
                            className="min-h-[200px]"
                          />
                        ) : (
                          <Input {...field} />
                        )}
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ))}
            </div>

            <div className="flex justify-between gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={handlePrevious}
                disabled={isFirstStep}
                className="flex-1"
              >
                <ChevronLeft className="h-4 w-4 mr-2" />
                Previous
              </Button>

              <Button 
                type="submit"
                disabled={mutation.isPending}
                className="flex-1"
              >
                {mutation.isPending ? "Saving..." : "Save"}
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={handleNext}
                disabled={isLastStep}
                className="flex-1"
              >
                Next
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export function ContactListDialog({ open, onOpenChange, graphId }: ContactListDialogProps) {
  const [editingContact, setEditingContact] = useState<any>(null);

  const { data: people } = useQuery({
    queryKey: ["/api/people", graphId],
    queryFn: async () => {
      const res = await fetch(`/api/people?graphId=${graphId}`);
      if (!res.ok) throw new Error("Failed to fetch people");
      return res.json();
    },
  });

  // Sort people alphabetically by name
  const sortedPeople = [...(people || [])].sort((a, b) => 
    a.name.localeCompare(b.name)
  );

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[725px]">
          <DialogHeader>
            <DialogTitle>Contacts</DialogTitle>
            <DialogDescription>
              A list of all contacts in your network
            </DialogDescription>
          </DialogHeader>

          <div className="relative max-h-[60vh] overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[200px]">Name</TableHead>
                  <TableHead>Organization</TableHead>
                  <TableHead>Job Title</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedPeople.map((person) => (
                  <TableRow key={person.id}>
                    <TableCell className="font-medium">{person.name}</TableCell>
                    <TableCell>{person.organization || "—"}</TableCell>
                    <TableCell>{person.jobTitle || "—"}</TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setEditingContact(person)}
                      >
                        <Settings2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>

      {editingContact && (
        <EditDialog
          contact={editingContact}
          open={!!editingContact}
          onOpenChange={(open) => !open && setEditingContact(null)}
          graphId={graphId}
        />
      )}
    </>
  );
}