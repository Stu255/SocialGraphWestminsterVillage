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
import { useQuery } from "@tanstack/react-query";

interface ContactListDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  graphId: number;
}

export function ContactListDialog({ open, onOpenChange, graphId }: ContactListDialogProps) {
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
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedPeople.map((person) => (
                <TableRow key={person.id}>
                  <TableCell className="font-medium">{person.name}</TableCell>
                  <TableCell>{person.organization || "—"}</TableCell>
                  <TableCell>{person.jobTitle || "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </DialogContent>
    </Dialog>
  );
}
