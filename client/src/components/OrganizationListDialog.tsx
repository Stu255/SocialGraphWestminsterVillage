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
import { Settings2, ChevronLeft, ChevronRight, ArrowUpDown, ChevronFirst, ChevronLast } from "lucide-react";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { EditOrganizationDialog } from "./EditOrganizationDialog";

interface OrganizationListDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  graphId: number;
}

type SortDirection = "asc" | "desc" | null;
type FilterValues = Record<string, string>;
type SortConfig = {
  column: string | null;
  direction: SortDirection;
};

const ITEMS_PER_PAGE = 10;

export function OrganizationListDialog({ open, onOpenChange, graphId }: OrganizationListDialogProps) {
  const [editingOrganization, setEditingOrganization] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortConfig, setSortConfig] = useState<SortConfig>({ column: null, direction: null });
  const [filters, setFilters] = useState<FilterValues>({});

  const { data: organizations } = useQuery({
    queryKey: ["/api/organizations", graphId],
    queryFn: async () => {
      const res = await fetch(`/api/organizations?graphId=${graphId}`);
      if (!res.ok) throw new Error("Failed to fetch organizations");
      return res.json();
    },
  });

  // Filter organizations based on current filters
  const filteredOrganizations = (organizations || []).filter((org: any) => {
    return Object.entries(filters).every(([key, value]) => {
      if (!value) return true;
      const fieldValue = org[key]?.toLowerCase() || "";
      return fieldValue.startsWith(value.toLowerCase());
    });
  });

  // Sort organizations based on current sort configuration
  const sortedOrganizations = [...filteredOrganizations].sort((a, b) => {
    if (!sortConfig.column || !sortConfig.direction) {
      return a.name.localeCompare(b.name);
    }

    const aValue = (a[sortConfig.column] || "").toLowerCase();
    const bValue = (b[sortConfig.column] || "").toLowerCase();

    if (sortConfig.direction === "asc") {
      return aValue.localeCompare(bValue);
    }
    return bValue.localeCompare(aValue);
  });

  // Paginate the sorted and filtered results
  const totalPages = Math.ceil(sortedOrganizations.length / ITEMS_PER_PAGE);
  const paginatedOrganizations = sortedOrganizations.slice(
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

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[725px]">
          <DialogHeader>
            <DialogTitle>Organizations</DialogTitle>
            <DialogDescription>
              A list of all organizations in your network
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
                      {renderColumnHeader("industry", "Industry")}
                    </TableHead>
                    <TableHead>
                      {renderColumnHeader("hqCity", "HQ City")}
                    </TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedOrganizations.map((org) => (
                    <TableRow key={org.id}>
                      <TableCell className="font-medium">{org.name}</TableCell>
                      <TableCell>{org.industry || "—"}</TableCell>
                      <TableCell>{org.hqCity || "—"}</TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setEditingOrganization(org)}
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
                {Math.min(currentPage * ITEMS_PER_PAGE, sortedOrganizations.length)} of{" "}
                {sortedOrganizations.length} results
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

      {editingOrganization && (
        <EditOrganizationDialog
          organization={editingOrganization}
          open={!!editingOrganization}
          onOpenChange={(open) => !open && setEditingOrganization(null)}
          graphId={graphId}
        />
      )}
    </>
  );
}
