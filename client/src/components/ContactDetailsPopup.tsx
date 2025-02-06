import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Mail, Phone, Linkedin, Twitter, Building2, Briefcase, Settings } from "lucide-react";
import { ContactFormDialog } from "./ContactFormDialog";

interface ContactDetailsPopupProps {
  contact: {
    id: number;
    name: string;
    jobTitle?: string;
    organization?: string;
    officeNumber?: string;
    mobileNumber?: string;
    email1?: string;
    email2?: string;
    linkedin?: string;
    twitter?: string;
    notes?: string;
    interactions?: Array<{
      date: string;
      type: string;
    }>;
  };
  onClose: () => void;
  graphId: number;
}

const InteractionHeatmap = ({ interactions }: { interactions?: Array<{ date: string }> }) => {
  const today = new Date();
  const oneYearAgo = new Date(today.getFullYear() - 1, today.getMonth(), today.getDate());
  const weeks = [];

  // Create array of weeks
  for (let d = new Date(oneYearAgo); d <= today; d.setDate(d.getDate() + 7)) {
    weeks.push(new Date(d));
  }

  // Count interactions per week
  const interactionCounts = new Map<string, number>();
  interactions?.forEach(interaction => {
    const week = new Date(interaction.date).toISOString().split('T')[0];
    interactionCounts.set(week, (interactionCounts.get(week) || 0) + 1);
  });

  return (
    <div className="flex flex-wrap gap-1">
      {weeks.map((week, i) => {
        const weekStr = week.toISOString().split('T')[0];
        const count = interactionCounts.get(weekStr) || 0;
        return (
          <div
            key={i}
            className={`w-3 h-3 rounded-sm ${
              count === 0 ? 'bg-muted' :
              count === 1 ? 'bg-blue-200' :
              count === 2 ? 'bg-blue-400' :
              'bg-blue-600'
            }`}
            title={`${week.toLocaleDateString()}: ${count} interactions`}
          />
        );
      })}
    </div>
  );
};

export function ContactDetailsPopup({ contact, onClose, graphId }: ContactDetailsPopupProps) {
  const [showEdit, setShowEdit] = useState(false);

  return (
    <>
      <Card className="absolute bottom-0 left-0 right-0 h-[30%] z-50 overflow-hidden border-t">
        <div className="h-full flex flex-col">
          <div className="flex items-center justify-between p-4 border-b bg-muted/40">
            <div>
              <h3 className="font-semibold">{contact.name}</h3>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                {contact.jobTitle && (
                  <div className="flex items-center gap-1">
                    <Briefcase className="h-3 w-3" />
                    <span>{contact.jobTitle}</span>
                  </div>
                )}
                {contact.organization && (
                  <>
                    {contact.jobTitle && <span>•</span>}
                    <div className="flex items-center gap-1">
                      <Building2 className="h-3 w-3" />
                      <span>{contact.organization}</span>
                    </div>
                  </>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" onClick={() => setShowEdit(true)}>
                <Settings className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={onClose}>
                ✕
              </Button>
            </div>
          </div>

          <Tabs defaultValue="details" className="flex-1">
            <div className="px-4 py-2 border-b bg-muted/40">
              <TabsList>
                <TabsTrigger value="details">Details</TabsTrigger>
                <TabsTrigger value="notes">Notes</TabsTrigger>
                <TabsTrigger value="interactions">Interactions</TabsTrigger>
              </TabsList>
            </div>

            <div className="p-4 overflow-y-auto">
              <TabsContent value="details" className="m-0">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <h4 className="text-sm font-medium mb-2">Contact Information</h4>
                    {(contact.officeNumber || contact.mobileNumber) && (
                      <div className="flex items-start gap-2">
                        <Phone className="h-4 w-4 mt-1" />
                        <div className="space-y-1">
                          {contact.officeNumber && (
                            <p className="text-sm">
                              <span className="text-muted-foreground">Office:</span>{" "}
                              <a href={`tel:${contact.officeNumber}`} className="hover:underline">
                                {contact.officeNumber}
                              </a>
                            </p>
                          )}
                          {contact.mobileNumber && (
                            <p className="text-sm">
                              <span className="text-muted-foreground">Mobile:</span>{" "}
                              <a href={`tel:${contact.mobileNumber}`} className="hover:underline">
                                {contact.mobileNumber}
                              </a>
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                    {(contact.email1 || contact.email2) && (
                      <div className="flex items-start gap-2">
                        <Mail className="h-4 w-4 mt-1" />
                        <div className="space-y-1">
                          {contact.email1 && (
                            <p className="text-sm">
                              <span className="text-muted-foreground">Primary:</span>{" "}
                              <a 
                                href={`mailto:${contact.email1}`}
                                className="text-primary hover:underline"
                              >
                                {contact.email1}
                              </a>
                            </p>
                          )}
                          {contact.email2 && (
                            <p className="text-sm">
                              <span className="text-muted-foreground">Secondary:</span>{" "}
                              <a 
                                href={`mailto:${contact.email2}`}
                                className="text-primary hover:underline"
                              >
                                {contact.email2}
                              </a>
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="space-y-3">
                    <h4 className="text-sm font-medium mb-2">Social Media</h4>
                    {contact.linkedin && (
                      <div className="flex items-center gap-2">
                        <Linkedin className="h-4 w-4" />
                        <a 
                          href={contact.linkedin}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-primary hover:underline"
                        >
                          LinkedIn Profile
                        </a>
                      </div>
                    )}
                    {contact.twitter && (
                      <div className="flex items-center gap-2">
                        <Twitter className="h-4 w-4" />
                        <a
                          href={contact.twitter}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-primary hover:underline"
                        >
                          Twitter Profile
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="notes" className="m-0">
                {contact.notes ? (
                  <p className="text-sm whitespace-pre-wrap">{contact.notes}</p>
                ) : (
                  <p className="text-sm text-muted-foreground">No notes available.</p>
                )}
              </TabsContent>

              <TabsContent value="interactions" className="m-0">
                <div className="space-y-4">
                  <h4 className="text-sm font-medium">Interaction History</h4>
                  <InteractionHeatmap interactions={contact.interactions} />
                  {(!contact.interactions || contact.interactions.length === 0) && (
                    <p className="text-sm text-muted-foreground">No interactions recorded yet.</p>
                  )}
                </div>
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </Card>

      <ContactFormDialog
        contact={contact}
        open={showEdit}
        onOpenChange={setShowEdit}
        graphId={graphId}
      />
    </>
  );
}