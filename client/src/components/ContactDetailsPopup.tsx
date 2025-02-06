import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Mail, Phone, Linkedin, Twitter, Building2, Briefcase, Settings } from "lucide-react";
import { ContactFormDialog } from "./ContactFormDialog";

const InteractionHeatmap = ({ interactions }: { interactions?: Array<{ date: string }> }) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Get date range for display (12 months back and forward)
  const today = new Date();
  const twelveMonthsAgo = new Date(today.getFullYear(), today.getMonth() - 12, 1);
  const twelveMonthsForward = new Date(today.getFullYear(), today.getMonth() + 12, 1);

  // Generate array of month data
  const months = [];
  for (let m = new Date(twelveMonthsAgo); m <= twelveMonthsForward; m.setMonth(m.getMonth() + 1)) {
    const monthStart = new Date(m);
    const daysInMonth = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0).getDate();
    const firstDayOfWeek = new Date(monthStart.getFullYear(), monthStart.getMonth(), 1).getDay();

    const monthData = {
      name: monthStart.toLocaleString('default', { month: 'short' }),
      year: monthStart.getFullYear(),
      month: monthStart.getMonth(),
      daysInMonth,
      firstDayOfWeek,
    };
    months.push(monthData);
  }

  // Count interactions per day
  const interactionCounts = new Map<string, number>();
  interactions?.forEach(interaction => {
    const day = new Date(interaction.date).toISOString().split('T')[0];
    interactionCounts.set(day, (interactionCounts.get(day) || 0) + 1);
  });

  // Helper to get cell style based on interaction count and date
  const getCellStyle = (count: number, isWeekend: boolean, row: number, dateStr: string) => {
    const cellDate = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    cellDate.setHours(0, 0, 0, 0);

    const isToday = cellDate.getTime() === today.getTime();
    const isPast = cellDate < today;

    // Base style including weekend spacing
    const baseStyle = row === 5 ? 'mt-2' : '';

    // Color based on past/future and interaction count
    const colorStyle = isPast
      ? count === 0 ? 'bg-muted'
        : count === 1 ? 'bg-red-200'
        : count === 2 ? 'bg-red-400'
        : 'bg-red-600'
      : count === 0 ? 'bg-muted'
        : count === 1 ? 'bg-green-200'
        : count === 2 ? 'bg-green-400'
        : 'bg-green-600';

    // Add yellow border for today
    const todayStyle = isToday ? 'ring-2 ring-yellow-400' : '';

    return `${colorStyle} ${baseStyle} ${todayStyle}`;
  };

  // Handle wheel scroll
  const handleWheel = (e: React.WheelEvent) => {
    if (scrollRef.current) {
      // Calculate the width of one month (including gap)
      const monthWidth = 120; // Approximate width of a month including gap
      const scrollAmount = e.deltaY > 0 ? monthWidth : -monthWidth;
      scrollRef.current.scrollLeft += scrollAmount;
      e.preventDefault(); // Prevent default vertical scroll
    }
  };

  // Center on current month on initial render
  useEffect(() => {
    if (scrollRef.current) {
      // Calculate position to center current month (month 12 in our array)
      const monthWidth = 120; // Same as in handleWheel
      const centerPosition = 12 * monthWidth;
      scrollRef.current.scrollLeft = centerPosition;
    }
  }, []);

  return (
    <div className="space-y-4">
      <div 
        ref={scrollRef}
        onWheel={handleWheel}
        className="flex overflow-x-auto pb-4 no-scrollbar" 
        style={{ scrollBehavior: 'smooth' }}
      >
        <div className="flex gap-1">
          {months.map((monthData, monthIndex) => {
            const cells = Array.from({ length: 7 * 6 }, (_, index) => {
              const row = index % 7;
              const col = Math.floor(index / 7);
              const dayNumber = index - monthData.firstDayOfWeek + 1;
              const isValidDay = dayNumber > 0 && dayNumber <= monthData.daysInMonth;

              if (!isValidDay) {
                return null;
              }

              const date = new Date(monthData.year, monthData.month, dayNumber);
              const dateStr = date.toISOString().split('T')[0];
              const count = interactionCounts.get(dateStr) || 0;
              const isWeekend = row === 0 || row === 6;

              return {
                dayNumber,
                row,
                col,
                count,
                isWeekend,
                dateStr,
              };
            }).filter(cell => cell !== null);

            return (
              <div key={monthIndex} className="flex flex-col gap-1">
                <div className="text-sm text-muted-foreground mb-1">
                  {monthData.name}
                </div>
                <div className="grid grid-cols-6 gap-1">
                  {cells.map((cell, cellIndex) => (
                    <div
                      key={cellIndex}
                      className={`w-3 h-3 rounded-sm ${getCellStyle(cell!.count, cell!.isWeekend, cell!.row, cell!.dateStr)}`}
                      title={`${new Date(cell!.dateStr).toLocaleDateString()}: ${cell!.count} interactions`}
                      style={{
                        gridRow: cell!.row + 1,
                        gridColumn: cell!.col + 1,
                      }}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
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
                  <InteractionHeatmap interactions={contact.interactions} />
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