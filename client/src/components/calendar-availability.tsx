import React, { useState, useEffect } from 'react';
import { Calendar } from "@/components/ui/calendar";
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { useNostr } from '@/context/nostr-provider';
import { getListingCalendarEvents, publishCalendarEvent } from '@/lib/nostr';
import { NostrCalendarEvent, NostrCalendarEventContent, NostrListing } from '@/types/nostr';

interface CalendarAvailabilityProps {
  listing: NostrListing;
  isHost: boolean;
  onAvailabilityChange?: (availableDates: Date[]) => void;
}

export default function CalendarAvailability({ 
  listing, 
  isHost, 
  onAvailabilityChange 
}: CalendarAvailabilityProps) {
  const { isConnected } = useNostr();
  const [calendarEvents, setCalendarEvents] = useState<NostrCalendarEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<'available' | 'blocked' | 'booked'>('available');
  const [isMultiDay, setIsMultiDay] = useState(false);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [isManagingDates, setIsManagingDates] = useState(false);
  
  // Fetch calendar events for the listing
  useEffect(() => {
    if (listing) {
      loadCalendarEvents();
    }
  }, [listing]);
  
  const loadCalendarEvents = async () => {
    setIsLoading(true);
    try {
      const events = await getListingCalendarEvents(listing.id);
      setCalendarEvents(events);
      
      // If there's a callback for availability change, call it with the available dates
      if (onAvailabilityChange) {
        const availableDates = events
          .filter(event => event.content.status === 'available')
          .map(event => new Date(event.content.startDate));
        
        onAvailabilityChange(availableDates);
      }
    } catch (error) {
      console.error('Error loading calendar events:', error);
      toast({
        title: 'Error',
        description: 'Failed to load availability dates. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Function to get date statuses from calendar events
  const getStatusForDate = (day: Date): 'available' | 'blocked' | 'booked' | undefined => {
    const formattedDate = day.toISOString().split('T')[0];
    
    // Find an event that spans this date
    for (const event of calendarEvents) {
      const startDate = new Date(event.content.startDate).toISOString().split('T')[0];
      const endDate = event.content.endDate 
        ? new Date(event.content.endDate).toISOString().split('T')[0]
        : startDate;
      
      // Check if the day falls within the event date range
      if (formattedDate >= startDate && formattedDate <= endDate) {
        return event.content.status as 'available' | 'blocked' | 'booked';
      }
    }
    
    return undefined; // No event for this date
  };
  
  // Handle date status changes by the host
  const handleUpdateAvailability = async () => {
    if (!isConnected) {
      toast({
        title: 'Authentication Required',
        description: 'Please connect with NOSTR to manage availability.',
        variant: 'destructive',
      });
      return;
    }
    
    if (!selectedDate) {
      toast({
        title: 'Date Required',
        description: 'Please select a date to update.',
        variant: 'destructive',
      });
      return;
    }
    
    try {
      // Prepare the event content
      const eventContent: NostrCalendarEventContent = {
        title: isMultiDay ? `${selectedStatus} date range` : `${selectedStatus} date`,
        status: selectedStatus,
        startDate: selectedDate.toISOString(),
        endDate: isMultiDay && endDate ? endDate.toISOString() : selectedDate.toISOString(),
        allDay: true,
        listingId: listing.id,
      };
      
      toast({
        title: 'Updating Availability',
        description: 'Publishing changes to NOSTR network...',
      });
      
      // Publish the calendar event
      const result = await publishCalendarEvent(eventContent);
      
      if (result.eventId) {
        toast({
          title: 'Availability Updated',
          description: `Successfully updated availability for the selected date${isMultiDay ? ' range' : ''}.`,
        });
        
        // Refresh calendar events
        await loadCalendarEvents();
        
        // Reset form
        setSelectedDate(null);
        setEndDate(null);
        setIsManagingDates(false);
      } else {
        toast({
          title: 'Update Failed',
          description: 'Failed to update availability. Please try again.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error updating availability:', error);
      toast({
        title: 'Error',
        description: 'An error occurred while updating availability.',
        variant: 'destructive',
      });
    }
  };
  
  // Render calendar day with appropriate status colors
  const renderDay = (props: any) => {
    const day = props.date;
    const status = getStatusForDate(day);
    
    let className = '';
    
    if (status === 'available') {
      className = 'bg-green-50 text-green-800 hover:bg-green-100';
    } else if (status === 'blocked') {
      className = 'bg-red-50 text-red-800 hover:bg-red-100';
    } else if (status === 'booked') {
      className = 'bg-blue-50 text-blue-800 hover:bg-blue-100';
    }
    
    return (
      <div className={`w-full h-full flex items-center justify-center rounded-full ${className}`}>
        {day.getDate()}
      </div>
    );
  };
  
  return (
    <div className="calendar-availability mt-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-bold">Availability</h3>
        {isHost && (
          <Button 
            variant="outline" 
            onClick={() => setIsManagingDates(!isManagingDates)}
            className="text-sm"
          >
            {isManagingDates ? 'Done' : 'Manage Dates'}
          </Button>
        )}
      </div>
      
      {isManagingDates && isHost ? (
        <div className="bg-neutral-50 p-4 rounded-lg mb-4 border border-neutral-200">
          <h4 className="font-semibold mb-3">Update Availability</h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <Label htmlFor="date-select" className="block mb-2">Select Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start">
                    {selectedDate ? selectedDate.toLocaleDateString() : "Select a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={(date) => date ? setSelectedDate(date) : setSelectedDate(null)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            
            <div>
              <Label htmlFor="status-select" className="block mb-2">Status</Label>
              <Select 
                value={selectedStatus} 
                onValueChange={(value: any) => setSelectedStatus(value)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="available">Available</SelectItem>
                  <SelectItem value="blocked">Blocked</SelectItem>
                  <SelectItem value="booked">Booked</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="flex items-center space-x-2 mb-4">
            <Switch 
              id="multi-day" 
              checked={isMultiDay}
              onCheckedChange={setIsMultiDay}
            />
            <Label htmlFor="multi-day">Multi-day range</Label>
          </div>
          
          {isMultiDay && (
            <div className="mb-4">
              <Label htmlFor="end-date" className="block mb-2">End Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start">
                    {endDate ? endDate.toLocaleDateString() : "Select end date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={endDate}
                    onSelect={(date) => date ? setEndDate(date) : setEndDate(null)}
                    disabled={(date) => {
                      // Disable dates before the start date
                      return selectedDate ? date < selectedDate : false;
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          )}
          
          <Button 
            onClick={handleUpdateAvailability}
            disabled={!selectedDate || (isMultiDay && !endDate)}
            className="w-full"
          >
            Update Availability
          </Button>
        </div>
      ) : null}
      
      <div className="calendar-container bg-white p-4 rounded-lg">
        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
          </div>
        ) : (
          <>
            <Calendar
              mode="single"
              selected={date}
              onSelect={setDate}
              className="rounded-md border"
              components={{
                Day: (props) => (
                  <div {...props}>
                    {renderDay(props)}
                  </div>
                )
              }}
            />
            <div className="mt-4 flex flex-wrap gap-3">
              <div className="flex items-center">
                <div className="w-3 h-3 rounded-full bg-green-500 mr-2"></div>
                <span className="text-sm">Available</span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 rounded-full bg-red-500 mr-2"></div>
                <span className="text-sm">Blocked</span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 rounded-full bg-blue-500 mr-2"></div>
                <span className="text-sm">Booked</span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 rounded-full bg-white border border-neutral-300 mr-2"></div>
                <span className="text-sm">No Status</span>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}