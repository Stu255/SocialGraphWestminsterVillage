import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, LogOut, Users, Settings, Download, Upload } from "lucide-react";
import { useUser } from "@/hooks/use-user";
import { useToast } from "@/hooks/use-toast";
import { GraphCard } from "@/components/GraphCard";
import { ContactListDialog } from "@/components/ContactListDialog";

interface SocialGraph {
  id: number;
  name: string;
  userId: number;
  createdAt: string;
  modifiedAt: string;
  deleteAt: string | null;
}

export default function AccountPage() {
  const [newGraphName, setNewGraphName] = useState("");
  const [showGlobalContacts, setShowGlobalContacts] = useState(false);
  const [, setLocation] = useLocation();
  const { logout, user } = useUser();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: graphs = [], isError, error } = useQuery<SocialGraph[]>({
    queryKey: ["/api/graphs"],
    select: (data) => {
      return [...data].sort((a, b) => {
        const dateA = new Date(a.modifiedAt).getTime();
        const dateB = new Date(b.modifiedAt).getTime();
        return dateB - dateA;
      });
    }
  });

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

  // Handle CSV upload
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

      const result = await response.json();
      queryClient.invalidateQueries({ queryKey: ["/api/people/global"] });

      toast({
        title: "Success",
        description: `Successfully uploaded ${result.added} contacts`,
      });
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

  // Handle error state using useEffect
  useEffect(() => {
    if (isError) {
      toast({
        title: "Error",
        description: (error as Error)?.message || "Failed to fetch graphs",
        variant: "destructive",
      });
    }
  }, [isError, error, toast]);

  const createGraphMutation = useMutation({
    mutationFn: async (name: string) => {
      const res = await fetch("/api/graphs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to create graph");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/graphs"] });
      setNewGraphName("");
      toast({
        title: "Success",
        description: "Graph created successfully",
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

  const handleLogout = async () => {
    try {
      await logout();
      setLocation("/");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newGraphName.trim()) {
      createGraphMutation.mutate(newGraphName.trim());
    }
  };

  return (
    <div className="min-h-screen w-full bg-background p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Welcome, {user?.username}</h1>
          <div className="flex items-center gap-2">
            <input
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              className="hidden"
              id="csv-upload"
            />
            <Button variant="outline" onClick={handleDownloadTemplate}>
              <Download className="h-4 w-4 mr-2" />
              Download Template
            </Button>
            <Button variant="outline" onClick={() => document.getElementById('csv-upload')?.click()}>
              <Upload className="h-4 w-4 mr-2" />
              Upload CSV
            </Button>
            <Button variant="outline" onClick={() => setShowGlobalContacts(true)}>
              <Users className="h-4 w-4 mr-2" />
              Global Contacts
            </Button>
            <Button variant="outline" onClick={() => setLocation('/settings')}>
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </Button>
            <Button variant="outline" onClick={handleLogout}>
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Your Social Graphs</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="flex gap-2 mb-6">
              <Input
                value={newGraphName}
                onChange={(e) => setNewGraphName(e.target.value)}
                placeholder="New graph name..."
                className="flex-1"
              />
              <Button
                type="submit"
                disabled={createGraphMutation.isPending || !newGraphName.trim()}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Graph
              </Button>
            </form>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {graphs.map((graph) => (
                <GraphCard
                  key={graph.id}
                  id={graph.id}
                  name={graph.name}
                  createdAt={graph.createdAt}
                  modifiedAt={graph.modifiedAt}
                  deleteAt={graph.deleteAt}
                  onClick={() => setLocation(`/graph/${graph.id}`)}
                />
              ))}
              {graphs.length === 0 && (
                <div className="col-span-full text-center text-muted-foreground py-8">
                  No graphs yet. Create your first graph above!
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <ContactListDialog
          open={showGlobalContacts}
          onOpenChange={setShowGlobalContacts}
          isGlobalView
        />
      </div>
    </div>
  );
}