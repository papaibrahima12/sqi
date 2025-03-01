
import { MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

type PropertyType = "location" | "vente";
type Location = "hann-mariste" | "sacre-coeur";

interface PropertyCardProps {
  id: number;
  type: PropertyType;
  title: string;
  price: number;
  prix_journalier: number;
  location: Location;
  details: string;
  imageUrl: string;
  onSelect?: () => void;
  isDashboard?: boolean;
  isAvailable?: boolean;
}

export const PropertyCard = ({ 
  id,
  type,
  title,
  price,
  prix_journalier,
  location,
  details,
  imageUrl,
  onSelect,
  isDashboard = false,
  isAvailable = true
}: PropertyCardProps) => {
  const navigate = useNavigate();
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isDashboard) {
      navigate(`/dashboard/property/${id}`);
    } else {
      navigate(`/property/${id}`);
    }
  };

  // Gestion cohérente des URLs d'images
  let finalImageUrl = imageUrl;
  console.log('image URL',finalImageUrl);
  if (imageUrl && !imageUrl.startsWith('http')) {
    const { data } = supabase.storage.from('property_images').getPublicUrl(imageUrl);
    finalImageUrl = data.publicUrl;
  }

  return (
    <div
      className="group bg-sqi-white rounded-lg shadow-sm overflow-hidden cursor-pointer"
      onClick={handleClick}
    >
      <div
        className={`h-60 bg-cover bg-center transition-transform duration-300 ease-out hover:scale-105 ${!isAvailable ? 'opacity-50' : ''}`}
        style={{ backgroundImage: `url(${finalImageUrl || '/placeholder.svg'})` }}
      />
      
      <div className="p-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <span className="font-dm-sans font-bold text-sm uppercase text-sqi-gold">
              {type === "location" ? "Location journalière" : "Vente"}
            </span>
            <h3 className="font-dm-sans text-xl font-bold text-sqi-black mt-1">
              {title}
            </h3>
          </div>
          { type === 'location' &&
              <span className="font-dm-sans font-bold text-xl text-sqi-black">
            {prix_journalier.toLocaleString()} FCFA /jour
          </span>
          }
          { type === 'vente' &&
              <span className="font-dm-sans font-bold text-xl text-sqi-black">
            {price.toLocaleString()} FCFA
          </span>
          }
        </div>
        <div className="flex items-center gap-2 mb-4">
          <MapPin className="h-4 w-4 text-sqi-gold" />
          <span className="font-inter text-sm">
            {location === "hann-mariste" ? "Hann Mariste" : "Sacré cœur"}
          </span>
        </div>
        <p className="font-inter text-sm text-gray-600 mb-6">{details}</p>
        {!isDashboard && onSelect && (
          <Button
            className="w-full bg-sqi-gold hover:bg-sqi-gold/90 text-sqi-white transition-all duration-default group"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onSelect();
            }}
            disabled={!isAvailable}
          >
            <span className="relative z-10 group-hover:text-white transition-colors">
              {isAvailable ? "Je suis intéressé" : "Non disponible"}
            </span>
          </Button>
        )}
      </div>
    </div>
  );
};
