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
  const sixMonthsAgo = new Date(today.getFullYear(), today.getMonth() - 5, 1);

  // Generate array of month data
  const months = [];
  for (let m = new Date(sixMonthsAgo); m <= today; m.setMonth(m.getMonth() + 1)) {
    const monthStart = new Date(m);
    const monthData = {
      name: monthStart.toLocaleString('default', { month: 'short' }),
      year: monthStart.getFullYear(),
      month: monthStart.getMonth(),
      firstDay: new Date(monthStart.getFullYear(), monthStart.getMonth(), 1).getDay(), // 0 = Sunday
      lastDate: new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0).getDate()
    };
    months.unshift(monthData); // Add to start so most recent month is rightmost
  }

  // Count interactions per day
  const interactionCounts = new Map<string, number>();
  interactions?.forEach(interaction => {
    const day = new Date(interaction.date).toISOString().split('T')[0];
    interactionCounts.set(day, (interactionCounts.get(day) || 0) + 1);
  });

  // Helper to get cell style based on interaction count
  const getCellStyle = (count: number) => {
    return count === 0 ? 'bg-muted' :
           count === 1 ? 'bg-blue-200' :
           count === 2 ? 'bg-blue-400' :
                        'bg-blue-600';
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-6">
        {months.map((monthData, monthIndex) => (
          <div key={monthIndex} className="flex flex-col gap-1">
            <div className="text-sm text-muted-foreground mb-1">{monthData.name}</div>
            <div className="grid grid-rows-7 gap-1">
              {/* Generate 35 cells (5x7) for each month */}
              {Array.from({ length: 35 }).map((_, index) => {
                const row = index % 7; // 0 = Monday, 6 = Sunday
                const col = Math.floor(index / 7);
                const adjustedDay = row === 6 ? row : row + 1; // Adjust for Monday start
                const dayOfMonth = col * 7 + adjustedDay - monthData.firstDay + 1;

                // Check if this cell should show a date
                const isValidDate = dayOfMonth > 0 && dayOfMonth <= monthData.lastDate;

                if (!isValidDate) {
                  return <div key={index} className="w-3 h-3" />; // Empty cell
                }

                const date = new Date(monthData.year, monthData.month, dayOfMonth);
                const dateStr = date.toISOString().split('T')[0];
                const count = interactionCounts.get(dateStr) || 0;

                return (
                  <div
                    key={index}
                    className={`w-3 h-3 rounded-sm ${getCellStyle(count)} ${row === 5 ? 'border-b border-muted-foreground/20' : ''}`}
                    title={`${date.toLocaleDateString()}: ${count} interactions`}
                  />
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export function ContactDetailsPopup({ contact, onClose, graphId }: ContactDetailsPopupProps) {
  const [showEdit, setShowEdit] = useState(false);

  return (
    <>
      <Card className="absolute bottom-0 left-0 right-0 h-[40%] z-50 overflow-hidden border-t">
        <div className="h-full flex flex-col">
          <Tabs defaultValue="details" className="flex-1">
            <div className="flex items-center justify-between p-4 border-b bg-muted/40">
              <div className="flex-1">
                <h3 className="text-lg font-semibold">{contact.name}</h3>
                <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
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

              <TabsList className="mx-4">
                <TabsTrigger value="details">Details</TabsTrigger>
                <TabsTrigger value="notes">Notes</TabsTrigger>
                <TabsTrigger value="interactions">Interactions</TabsTrigger>
              </TabsList>

              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" onClick={() => setShowEdit(true)}>
                  <Settings className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={onClose}>
                  ✕
                </Button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              <TabsContent value="details" className="m-0">
                <div className="grid grid-cols-3 gap-8">
                  {/* Phone Numbers Column */}
                  <div className="space-y-4">
                    {contact.officeNumber && (
                      <div className="flex items-center gap-3">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm text-muted-foreground">Office</p>
                          <a href={`tel:${contact.officeNumber}`} className="text-sm font-medium hover:underline">
                            {contact.officeNumber}
                          </a>
                        </div>
                      </div>
                    )}
                    {contact.mobileNumber && (
                      <div className="flex items-center gap-3">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm text-muted-foreground">Mobile</p>
                          <a href={`tel:${contact.mobileNumber}`} className="text-sm font-medium hover:underline">
                            {contact.mobileNumber}
                          </a>
                        </div>
                      </div>
                    )}
                    {!contact.officeNumber && !contact.mobileNumber && (
                      <p className="text-sm text-muted-foreground">No phone numbers available</p>
                    )}
                  </div>

                  {/* Email Addresses Column */}
                  <div className="space-y-4">
                    {contact.email1 && (
                      <div className="flex items-center gap-3">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm text-muted-foreground">Primary</p>
                          <a href={`mailto:${contact.email1}`} className="text-sm font-medium hover:underline">
                            {contact.email1}
                          </a>
                        </div>
                      </div>
                    )}
                    {contact.email2 && (
                      <div className="flex items-center gap-3">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm text-muted-foreground">Secondary</p>
                          <a href={`mailto:${contact.email2}`} className="text-sm font-medium hover:underline">
                            {contact.email2}
                          </a>
                        </div>
                      </div>
                    )}
                    {!contact.email1 && !contact.email2 && (
                      <p className="text-sm text-muted-foreground">No email addresses available</p>
                    )}
                  </div>

                  {/* Social Links Column */}
                  <div className="space-y-4">
                    {contact.linkedin && (
                      <div className="flex items-center gap-3">
                        <Linkedin className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm text-muted-foreground">LinkedIn</p>
                          <a
                            href={contact.linkedin}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm font-medium hover:underline"
                          >
                            View Profile
                          </a>
                        </div>
                      </div>
                    )}
                    {contact.twitter && (
                      <div className="flex items-center gap-3">
                        <Twitter className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm text-muted-foreground">Twitter</p>
                          <a
                            href={contact.twitter}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm font-medium hover:underline"
                          >
                            View Profile
                          </a>
                        </div>
                      </div>
                    )}
                    {!contact.linkedin && !contact.twitter && (
                      <p className="text-sm text-muted-foreground">No social media links available</p>
                    )}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="notes" className="m-0">
                {contact.notes ? (
                  <div className="prose prose-sm max-w-none">
                    <p className="whitespace-pre-wrap">{contact.notes}</p>
                  </div>
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