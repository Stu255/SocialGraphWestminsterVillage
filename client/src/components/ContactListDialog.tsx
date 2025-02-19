import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Settings2, ChevronLeft, ChevronRight, ArrowUpDown, ChevronFirst, ChevronLast, Download, Upload } from "lucide-react";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ContactFormDialog } from "./ContactFormDialog";
import { getUserRelationshipNameById } from "./RelationshipTypeManager";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { useMutation } from "@tanstack/react-query";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { USER_RELATIONSHIP_TYPES } from "./RelationshipTypeManager";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Check, ChevronsUpDown } from "lucide-react";
import { AddOrganizationDialog } from "./AddOrganizationDialog";


interface CsvValidationError {
  row: number;
  fieldErrors: {
    field: string;
    value: string;
    error: string;
    originalRow: Record<string, string>;
  }[];
}

interface CsvUploadResults {
  added: number;
  updated: number;
  errors: CsvValidationError[];
  rowsWithErrors: Set<number>;
}

interface ContactListDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  graphId?: number;  // Make graphId optional for global view
  isGlobalView?: boolean;
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
  const [showAddOrg, setShowAddOrg] = useState(false);
  const [openCombobox, setOpenCombobox] = useState(false);

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
      relationshipToYou: contact?.relationshipToYou || "",
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
      // Check if organization exists
      const orgExists = organizations.some((org: any) => org.name === values.organization);

      if (!orgExists && values.organization) {
        setShowAddOrg(true);
        throw new Error("Organization needs to be created first");
      }

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
      if (error.message !== "Organization needs to be created first") {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
      }
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
                                {USER_RELATIONSHIP_TYPES.map(type => (
                                  <SelectItem key={type.id} value={type.name}>
                                    {type.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : fieldName === "organization" ? (
                            <Popover open={openCombobox} onOpenChange={setOpenCombobox}>
                              <PopoverTrigger asChild>
                                <FormControl>
                                  <Button
                                    variant="outline"
                                    role="combobox"
                                    aria-expanded={openCombobox}
                                    className="w-full justify-between"
                                  >
                                    {field.value
                                      ? field.value
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
                                          field.onChange(currentValue);
                                          setOpenCombobox(false);
                                        }}
                                      >
                                        <Check
                                          className={cn(
                                            "mr-2 h-4 w-4",
                                            field.value === org.name ? "opacity-100" : "opacity-0"
                                          )}
                                        />
                                        {org.name}
                                      </CommandItem>
                                    ))}
                                  </CommandGroup>
                                </Command>
                              </PopoverContent>
                            </Popover>
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

      <AddOrganizationDialog
        open={showAddOrg}
        onOpenChange={(open) => {
          setShowAddOrg(open);
          if (!open) {
            // Retry contact update after organization is added
            mutation.mutate(form.getValues());
          }
        }}
        defaultName={form.getValues().organization}
        graphId={graphId}
      />
    </>
  );
}

type SortDirection = "asc" | "desc" | null;
type FilterValues = Record<string, string>;
type SortConfig = {
  column: string | null;
  direction: SortDirection;
};

const ITEMS_PER_PAGE = 10;

export function ContactListDialog({ open, onOpenChange, graphId, isGlobalView = false }: ContactListDialogProps) {
  const [editingContact, setEditingContact] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortConfig, setSortConfig] = useState<SortConfig>({ column: null, direction: null });
  const [filters, setFilters] = useState<FilterValues>({});
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Modify query to handle global view
  const { data: people } = useQuery({
    queryKey: ["/api/people", isGlobalView ? "global" : graphId],
    queryFn: async () => {
      const endpoint = isGlobalView ? `/api/people/global` : `/api/people?graphId=${graphId}`;
      const res = await fetch(endpoint);
      if (!res.ok) throw new Error("Failed to fetch people");
      const data = await res.json();
      return data.map((person: any) => ({
        ...person,
        relationshipToYou: person.userRelationshipType
      }));
    },
    enabled: isGlobalView || !!graphId,
  });

  // Filter contacts based on current filters
  const filteredPeople = (people || []).filter((person: any) => {
    return Object.entries(filters).every(([key, value]) => {
      if (!value) return true;
      if (key === 'relationshipToYou') {
        const relationshipName = getUserRelationshipNameById(person.userRelationshipType)?.toLowerCase() || '';
        return relationshipName.includes(value.toLowerCase());
      }
      const fieldValue = String(person[key] || "").toLowerCase();
      return fieldValue.includes(value.toLowerCase());
    });
  });

  // Sort contacts based on current sort configuration
  const sortedPeople = [...filteredPeople].sort((a, b) => {
    if (!sortConfig.column || !sortConfig.direction) {
      return a.name.localeCompare(b.name);
    }

    // Special handling for relationshipToYou field
    if (sortConfig.column === 'relationshipToYou') {
      const aValue = a.relationshipToYou || 0;
      const bValue = b.relationshipToYou || 0;
      return sortConfig.direction === "asc" ? aValue - bValue : bValue - aValue;
    }

    const aValue = String(a[sortConfig.column] || '').toLowerCase();
    const bValue = String(b[sortConfig.column] || '').toLowerCase();

    return sortConfig.direction === "asc"
      ? aValue.localeCompare(bValue)
      : bValue.localeCompare(aValue);
  });

  // Paginate the sorted and filtered results
  const totalPages = Math.ceil(sortedPeople.length / ITEMS_PER_PAGE);
  const paginatedPeople = sortedPeople.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const handleSort = (column: string) => {
    setSortConfig(current => ({
      column,
      direction:
        current.column === column && current.direction === "asc"
          ? "desc"
          : "asc"
    }));
  };

  const handleFilter = (column: string, value: string) => {
    setFilters(prev => ({
      ...prev,
      [column]: value
    }));
    setCurrentPage(1); // Reset to first page when filtering
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const renderColumnHeader = (column: string, label: string) => {
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

  // Handle CSV template download
  const handleDownloadTemplate = async () => {
    try {
      const response = await fetch('/api/contacts/template', {
        method: 'GET',
      });

      if (!response.ok) throw new Error('Failed to download template');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'contacts_template.csv';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Success",
        description: "Template downloaded successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/contacts/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to upload contacts');
      }

      const result: CsvUploadResults = await response.json();

      // Group errors by row for better display
      const errorsByRow = result.errors.reduce((acc, error) => {
        const row = error.row;
        if (!acc[row]) {
          acc[row] = {
            rowNumber: row,
            fields: new Map<string, { value: string; error: string; }>()
          };
        }

        error.fieldErrors.forEach(fieldError => {
          acc[row].fields.set(fieldError.field, {
            value: fieldError.value,
            error: fieldError.error
          });
        });

        return acc;
      }, {} as Record<number, { rowNumber: number; fields: Map<string, { value: string; error: string; }> }>);

      // If there are errors, show them in a dialog
      if (result.errors.length > 0) {
        toast({
          title: "CSV Upload Issues",
          description: (
            <div className="mt-2 space-y-2">
              <p>Successfully processed:</p>
              <ul className="list-disc pl-4">
                <li>Added: {result.added} contacts</li>
                <li>Updated: {result.updated} contacts</li>
              </ul>
              <p className="text-destructive">Found {result.errors.length} rows with issues:</p>
              <div className="max-h-[200px] overflow-y-auto">
                {Object.values(errorsByRow).map(({ rowNumber, fields }) => (
                  <div key={rowNumber} className="border-l-2 border-destructive pl-2 mb-2">
                    <p className="font-semibold">Row {rowNumber}:</p>
                    <ul className="list-disc pl-4">
                      {Array.from(fields.entries()).map(([field, { error }]) => (
                        <li key={field} className="text-sm">
                          {field}: {error}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          ),
          duration: 10000,
        });
      } else {
        toast({
          title: "Success",
          description: `Successfully processed contacts. Added: ${result.added}, Updated: ${result.updated}`,
        });
      }

      // Refresh the contacts list
      queryClient.invalidateQueries({ queryKey: ["/api/people/global"] });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }

    // Reset the file input
    event.target.value = '';
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[825px]">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle>{isGlobalView ? "Global Contacts" : "Contacts"}</DialogTitle>
                <DialogDescription>
                  {isGlobalView
                    ? "A list of all contacts across all your networks"
                    : "A list of all contacts in your network"}
                </DialogDescription>
              </div>
              {isGlobalView && (
                <div className="flex items-center gap-2">
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleFileUpload}
                    className="hidden"
                    id="csv-upload"
                  />
                  <Button variant="outline" size="sm" onClick={handleDownloadTemplate}>
                    <Download className="h-4 w-4 mr-2" />
                    Download Template
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => document.getElementById('csv-upload')?.click()}>
                    <Upload className="h-4 w-4 mr-2" />
                    Upload CSV
                  </Button>
                </div>
              )}
            </div>
          </DialogHeader>

          <div className="relative">
            <div className="max-h-[50vh] overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{renderColumnHeader("name", "Name")}</TableHead>
                    <TableHead>{renderColumnHeader("organization", "Organization")}</TableHead>
                    <TableHead>{renderColumnHeader("jobTitle", "Job Title")}</TableHead>
                    <TableHead>{renderColumnHeader("relationshipToYou", "Relationship")}</TableHead>
                    <TableHead className="w-[50px]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedPeople.map((person: any) => {
                    const relationshipName = getUserRelationshipNameById(person.relationshipToYou);
                    return (
                      <TableRow key={person.id}>
                        <TableCell className="font-medium">{person.name}</TableCell>
                        <TableCell>{person.organization || "—"}</TableCell>
                        <TableCell>{person.jobTitle || "—"}</TableCell>
                        <TableCell>{relationshipName || "—"}</TableCell>
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
                    );
                  })}
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
        <ContactFormDialog
          contact={editingContact}
          open={!!editingContact}
          onOpenChange={(open) => !open && setEditingContact(null)}
          graphId={graphId}
        />
      )}
    </>
  );
}