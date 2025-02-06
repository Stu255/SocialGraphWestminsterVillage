import React, { useRef, useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Mail, Phone, Linkedin, Twitter, Building2, Briefcase, Settings } from "lucide-react";
import { ContactFormDialog } from "./ContactFormDialog";
import { InteractionDialog } from "./InteractionDialog";

interface ContactDetailsPopupProps {
  contact: {
    id: number;
    name: string;
    jobTitle?: string;
    organization?: string;
    email1?: string;
    email2?: string;
    officeNumber?: string;
    mobileNumber?: string;
    linkedin?: string;
    twitter?: string;
    notes?: string;
    interactions?: Array<{ date: string }>;
  };
  onClose: () => void;
  graphId: number;
}

const InteractionHeatmap = ({ interactions, contactId, graphId }: { interactions?: Array<{ date: string }>, contactId: number, graphId: number }) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const today = new Date();
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();
  const twelveMonthsAgo = new Date(currentYear, currentMonth - 12, 1);
  const twelveMonthsForward = new Date(currentYear, currentMonth + 12, 1);

  const months = [];
  for (let m = new Date(twelveMonthsAgo); m <= twelveMonthsForward; m.setMonth(m.getMonth() + 1)) {
    const monthStart = new Date(m);
    const daysInMonth = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0).getDate();
    const firstDayOfWeek = new Date(monthStart.getFullYear(), monthStart.getMonth(), 1).getDay();

    const monthData = {
      name: monthStart.toLocaleString('default', { month: 'short' }),
      month: monthStart.getMonth(),
      year: monthStart.getFullYear(),
      daysInMonth,
      firstDayOfWeek,
    };
    months.push(monthData);
  }

  const interactionCounts = new Map<string, number>();
  interactions?.forEach(interaction => {
    const day = new Date(interaction.date).toISOString().split('T')[0];
    interactionCounts.set(day, (interactionCounts.get(day) || 0) + 1);
  });

  const getCellStyle = (count: number, isWeekend: boolean, row: number, dateStr: string) => {
    const cellDate = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    cellDate.setHours(0, 0, 0, 0);

    const isToday = cellDate.getTime() === today.getTime();
    const isPast = cellDate < today;

    const baseStyle = `cursor-pointer ${row === 5 ? 'mt-2' : ''}`;

    const colorStyle = isPast
      ? count === 0 ? 'bg-muted hover:bg-muted/80'
        : count === 1 ? 'bg-red-200 hover:bg-red-300'
        : count === 2 ? 'bg-red-400 hover:bg-red-500'
        : 'bg-red-600 hover:bg-red-700'
      : count === 0 ? 'bg-muted hover:bg-muted/80'
        : count === 1 ? 'bg-green-200 hover:bg-green-300'
        : count === 2 ? 'bg-green-400 hover:bg-green-500'
        : 'bg-green-600 hover:bg-green-700';

    const todayStyle = isToday ? 'ring-2 ring-yellow-400' : '';

    return `${colorStyle} ${baseStyle} ${todayStyle}`;
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (scrollRef.current) {
      const monthWidth = 140; 
      const scrollAmount = e.deltaY > 0 ? monthWidth : -monthWidth;
      scrollRef.current.scrollLeft += scrollAmount;
      e.preventDefault();
    }
  };

  useEffect(() => {
    if (scrollRef.current) {
      const monthWidth = 140; 

      const now = new Date();
      const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

      const nextMonthIndex = months.findIndex(m => 
        m.month === nextMonth.getMonth() && m.year === nextMonth.getFullYear()
      );

      if (nextMonthIndex !== -1) {
        const containerWidth = scrollRef.current.clientWidth;
        const scrollPosition = (nextMonthIndex * monthWidth) - containerWidth + monthWidth;
        scrollRef.current.scrollLeft = scrollPosition;
      }
    }
  }, [currentMonth, currentYear, months]);

  return (
    <div className="space-y-4">
      <div 
        ref={scrollRef}
        onWheel={handleWheel}
        className="flex overflow-x-auto pb-4 no-scrollbar" 
        style={{ scrollBehavior: 'smooth' }}
      >
        <div className="flex gap-4">
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
              <div key={monthIndex} className="flex flex-col gap-1 min-w-[120px]">
                <div className="text-sm text-muted-foreground mb-1">
                  {monthData.name}
                </div>
                <div className="grid grid-cols-6 gap-1">
                  {cells.map((cell, cellIndex) => (
                    <div
                      key={cellIndex}
                      className={`w-3 h-3 rounded-sm ${getCellStyle(cell!.count, cell!.isWeekend, cell!.row, cell!.dateStr)}`}
                      title={`${new Date(cell!.dateStr).toLocaleDateString()}: ${cell!.count} interactions`}
                      onClick={() => setSelectedDate(cell!.dateStr)}
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

      <InteractionDialog
        open={!!selectedDate}
        onOpenChange={(open) => !open && setSelectedDate(null)}
        date={selectedDate || undefined}
        graphId={graphId}
        initialContactId={contactId}
      />
    </div>
  );
};

function ContactDetailsPopup({ contact, onClose, graphId }: ContactDetailsPopupProps) {
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
                  <InteractionHeatmap 
                    interactions={contact.interactions} 
                    contactId={contact.id}
                    graphId={graphId}
                  />
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

export { ContactDetailsPopup, InteractionHeatmap };