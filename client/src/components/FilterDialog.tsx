import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowUpDown, Check } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface FilterDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  items: { id: string | number; name: string }[];
  selectedItems: (string | number)[];
  onSelectedItemsChange: (items: (string | number)[]) => void;
  enableSorting?: boolean;
}

type SortDirection = "asc" | "desc";

export function FilterDialog({ 
  open, 
  onOpenChange, 
  title,
  items,
  selectedItems,
  onSelectedItemsChange,
  enableSorting = true
}: FilterDialogProps) {
  const [filter, setFilter] = useState("");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  // Filter and sort items
  const filteredItems = items
    .filter(item => 
      item.name.toLowerCase().includes(filter.toLowerCase())
    )
    .sort((a, b) => {
      if (!enableSorting) return 0;
      const comparison = a.name.localeCompare(b.name);
      return sortDirection === "asc" ? comparison : -comparison;
    });

  const toggleSort = () => {
    if (!enableSorting) return;
    setSortDirection(prev => prev === "asc" ? "desc" : "asc");
  };

  const toggleItem = (id: string | number) => {
    if (selectedItems.includes(id)) {
      onSelectedItemsChange(selectedItems.filter(item => item !== id));
    } else {
      onSelectedItemsChange([...selectedItems, id]);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <div className="space-y-2">
          {enableSorting && (
            <div className="flex items-center gap-2">
              <Input
                placeholder="Filter..."
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="h-8"
              />
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={toggleSort}
              >
                <ArrowUpDown className="h-4 w-4" />
              </Button>
            </div>
          )}

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead className="w-[50px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredItems.map((item) => (
                <TableRow 
                  key={item.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => toggleItem(item.id)}
                >
                  <TableCell>{item.name}</TableCell>
                  <TableCell>
                    <div className={cn(
                      "h-4 w-4 border rounded-sm flex items-center justify-center",
                      selectedItems.includes(item.id) && "bg-primary border-primary"
                    )}>
                      {selectedItems.includes(item.id) && (
                        <Check className="h-3 w-3 text-primary-foreground" />
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </DialogContent>
    </Dialog>
  );
}