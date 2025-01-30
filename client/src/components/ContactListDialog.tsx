import { useState } from "react";
import { useForm } from "react-hook-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Settings2, ChevronLeft, ChevronRight, ArrowUpDown, ChevronFirst, ChevronLast } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getRelationshipLabel, RelationshipLevel, type Person } from "@db/schema";

// Available relationship types for the UI
const RELATIONSHIP_OPTIONS = [
  { value: RelationshipLevel.ALLIED.toString(), label: "Allied" },
  { value: RelationshipLevel.TRUSTED.toString(), label: "Trusted" },
  { value: RelationshipLevel.CLOSE.toString(), label: "Close" },
  { value: RelationshipLevel.CONNECTED.toString(), label: "Connected" },
  { value: RelationshipLevel.ACQUAINTED.toString(), label: "Acquainted" },
];

// Sort helper function to handle different field types
const getSortValue = (item: Person, field: keyof Person): string | number => {
  // Special handling for relationship values
  if (field === "relationshipToYou") {
    // Convert null or undefined to 0 for consistent sorting
    return item[field] ?? 0;
  }
  // Handle all other fields as strings
  return String(item[field] || "").toLowerCase();
};

// Helper function for filtering
const matchesFilter = (value: any, filterValue: string, isRelationship: boolean = false): boolean => {
  if (!filterValue) return true;

  if (isRelationship) {
    const relationshipValue = value ?? 0;
    const label = getRelationshipLabel(relationshipValue).toLowerCase();
    return label.includes(filterValue.toLowerCase());
  }

  return String(value || "").toLowerCase().includes(filterValue.toLowerCase());
};

interface ContactListDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  graphId: number;
}

type SortDirection = "asc" | "desc" | null;
type FilterValues = Partial<Record<keyof Person, string>>;
type SortConfig = {
  column: keyof Person | null;
  direction: SortDirection;
};

const ITEMS_PER_PAGE = 10;

export function ContactListDialog({ open, onOpenChange, graphId }: ContactListDialogProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [sortConfig, setSortConfig] = useState<SortConfig>({ column: null, direction: null });
  const [filters, setFilters] = useState<FilterValues>({});
  const [editingContact, setEditingContact] = useState<Person | null>(null);

  const { data: people = [] } = useQuery<Person[]>({
    queryKey: ["/api/people", graphId],
    queryFn: async () => {
      const res = await fetch(`/api/people?graphId=${graphId}`);
      if (!res.ok) throw new Error("Failed to fetch people");
      return res.json();
    },
  });

  // Filter contacts based on current filters
  const filteredPeople = people.filter((person) => {
    return Object.keys(filters).every(key => {
      const filterValue = filters[key as keyof Person];
      return matchesFilter(person[key as keyof Person], filterValue || "", key === 'relationshipToYou');
    });
  });

  // Sort contacts based on current sort configuration
  const sortedPeople = [...filteredPeople].sort((a, b) => {
    if (!sortConfig.column || !sortConfig.direction) {
      return 0;
    }

    const aValue = getSortValue(a, sortConfig.column);
    const bValue = getSortValue(b, sortConfig.column);

    if (sortConfig.column === "relationshipToYou") {
      return sortConfig.direction === "asc" ? 
        Number(aValue) - Number(bValue) : 
        Number(bValue) - Number(aValue);
    }

    return sortConfig.direction === "asc"
      ? String(aValue).localeCompare(String(bValue))
      : String(bValue).localeCompare(String(aValue));
  });

  const totalPages = Math.ceil(sortedPeople.length / ITEMS_PER_PAGE);
  const paginatedPeople = sortedPeople.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const handleSort = (column: keyof Person) => {
    setSortConfig(current => ({
      column,
      direction:
        current.column === column && current.direction === "asc"
          ? "desc"
          : "asc"
    }));
  };

  const handleFilter = (column: keyof Person, value: string) => {
    setFilters(prev => ({
      ...prev,
      [column]: value
    }));
    setCurrentPage(1); // Reset to first page when filtering
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const renderColumnHeader = (column: keyof Person, label: string) => {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Input
            placeholder={label}
            value={filters[column] || ""}
            onChange={(e) => handleFilter(column, e.target.value)}
            className="h-8"
          />
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 flex-shrink-0"
            onClick={() => handleSort(column)}
          >
            <ArrowUpDown className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[825px]">
          <DialogHeader>
            <DialogTitle>Contacts</DialogTitle>
            <DialogDescription>
              A list of all contacts in your network
            </DialogDescription>
          </DialogHeader>

          <div className="relative">
            <div className="max-h-[50vh] overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[200px]">
                      {renderColumnHeader("name", "Name")}
                    </TableHead>
                    <TableHead>
                      {renderColumnHeader("organization", "Organization")}
                    </TableHead>
                    <TableHead>
                      {renderColumnHeader("jobTitle", "Job Title")}
                    </TableHead>
                    <TableHead>
                      {renderColumnHeader("relationshipToYou", "Relationship To You")}
                    </TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedPeople.map((person) => (
                    <TableRow key={person.id}>
                      <TableCell className="font-medium">{person.name}</TableCell>
                      <TableCell>{person.organization || "—"}</TableCell>
                      <TableCell>{person.jobTitle || "—"}</TableCell>
                      <TableCell>
                        {person.relationshipToYou ? getRelationshipLabel(person.relationshipToYou) : "—"}
                      </TableCell>
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

            <div className="flex items-center justify-between space-x-2 py-4">
              <div className="text-sm text-muted-foreground">
                Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1} to{" "}
                {Math.min(currentPage * ITEMS_PER_PAGE, sortedPeople.length)} of{" "}
                {sortedPeople.length} results
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => handlePageChange(1)}
                  disabled={currentPage === 1}
                >
                  <ChevronFirst className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <div className="text-sm">
                  Page {currentPage} of {totalPages}
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => handlePageChange(totalPages)}
                  disabled={currentPage === totalPages}
                >
                  <ChevronLast className="h-4 w-4" />
                </Button>
              </div>
            </div>
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

interface EditDialogProps {
  contact: Person;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  graphId: number;
}

const STEPS = [
  {
    title: "Basic Information",
    description: "Edit the contact's name and role",
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

function EditDialog({ contact, open, onOpenChange, graphId }: EditDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [step, setStep] = useState(0);

  const form = useForm({
    defaultValues: {
      name: contact?.name || "",
      jobTitle: contact?.jobTitle || "",
      organization: contact?.organization || "",
      relationshipToYou: contact?.relationshipToYou?.toString() || "", //Added toString() for consistency
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
                  rules={{
                    required: fieldName === "name" ? "Name is required" :
                      fieldName === "relationshipToYou" ? "Relationship type is required" :
                        false
                  }}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{FIELD_LABELS[fieldName]}</FormLabel>
                      <FormControl>
                        {fieldName === "relationshipToYou" ? (
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select relationship type" />
                            </SelectTrigger>
                            <SelectContent>
                              {RELATIONSHIP_OPTIONS.map(type => (
                                <SelectItem key={type.value} value={type.value}>
                                  {type.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : fieldName === "notes" ? (
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