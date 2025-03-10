
import * as React from "react";
import { Calendar } from "@/components/ui/calendar";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, isBefore, isWithinInterval, startOfDay } from "date-fns";

interface AvailabilityCalendarProps {
  propertyId: number;
}

export function AvailabilityCalendar({ propertyId }: AvailabilityCalendarProps) {
  const { data: reservations } = useQuery({
    queryKey: ["property-reservations", propertyId],
    queryFn: async () => {
      const { data: locations, error } = await supabase
        .from("location")
        .select("date_debut, date_fin")
        .eq("bien_id", propertyId)
        .eq("statut", "en_cours");

      if (error) {
        console.error("Erreur lors de la récupération des réservations:", error);
        throw error;
      }

      return locations;
    },
  });

  const isDateUnavailable = (date: Date) => {
    if (!reservations) return false;

    if (isBefore(startOfDay(date), startOfDay(new Date()))) {
      return true;
    }

    return reservations.some((reservation) =>
      isWithinInterval(date, {
        start: new Date(reservation.date_debut),
        end: new Date(reservation.date_fin),
      })
    );
  };

  return (
    <div className="border rounded-lg overflow-hidden">
      <Calendar
        mode="single"
        modifiers={{
          unavailable: isDateUnavailable,
        }}
        modifiersClassNames={{
          unavailable: "text-gray-400 line-through cursor-not-allowed",
        }}
        fromDate={new Date()}
        className="rounded-md"
      />
    </div>
  );
}
