
import { Suspense, lazy, useMemo, useCallback, useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Building2, MapPin, Home, LogIn, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { PropertyCard } from "@/components/property/PropertyCard";
import { Footer } from "@/components/layout/Footer";
import { PropertyType, Location, Property } from "@/types/property";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

const ContactForm = lazy(() => import("@/components/property/ContactForm"));

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.2,
      delayChildren: 0.4
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.8,
      ease: "easeOut"
    }
  }
};

const Index = () => {
  const [selectedType, setSelectedType] = useState<PropertyType | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const { toast } = useToast();

  const { data: properties = [], isLoading } = useQuery({
    queryKey: ['properties', startDate, endDate],
    queryFn: async () => {
      let query = supabase
        .from('bien')
        .select(`
          *,
          residence (
            id,
            nom
          ),
          photo (
            id,
            url
          )
        `);

      if (startDate && endDate) {
        const { data: occupiedProperties, error } = await supabase
          .from('location')
          .select('bien_id')
          .eq('statut', 'en_cours')
          .filter('date_debut', 'lte', format(endDate, 'yyyy-MM-dd'))
          .filter('date_fin', 'gte', format(startDate, 'yyyy-MM-dd'));

        if (error) {
          console.error('Error fetching occupied properties:', error);
          throw error;
        }

        const occupiedIds = occupiedProperties?.map(p => p.bien_id) || [];
        
        if (occupiedIds.length > 0) {
          query = query.not('id', 'in', `(${occupiedIds.join(',')})`);
        }
      }

      const { data: biens, error: biensError } = await query;

      if (biensError) {
        console.error('Error fetching properties:', biensError);
        throw biensError;
      }

      return biens.map(bien => ({
        ...bien,
        photos: bien.photo,
        isAvailable: true
      }));
    },
    staleTime: 1000 * 60 * 5,
  });

  const normalizeString = (str: string): string => {
    return str
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[œœ]/g, "oe")
      .replace(/[-\s]+/g, " ")
      .trim();
  };

  const filteredProperties = useMemo(() => {
    console.log('Filtering properties with:', { selectedType, selectedLocation });
    return properties.filter(property => {
      if (selectedType && property.type_transaction !== selectedType) {
        return false;
      }

      if (selectedLocation) {
        const residenceLocation = property.residence?.nom;
        if (!residenceLocation) return false;

        const normalizedResidence = normalizeString(residenceLocation);
        const normalizedLocations = {
          'sacre-coeur': 'sacre coeur',
          'hann-mariste': 'hann mariste'
        };
        
        const normalizedSelectedLocation = normalizedLocations[selectedLocation];
        
        if (!normalizedResidence.includes(normalizedSelectedLocation)) {
          return false;
        }
      }

      return true;
    });
  }, [properties, selectedType, selectedLocation]);

  const handleContactSubmit = useCallback(async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedProperty) return;

    const formData = new FormData(e.currentTarget);
    try {
      const { error } = await supabase
        .from('demande')
        .insert([
          {
            bien_id: selectedProperty.id,
            nom: formData.get('nom') as string,
            prenom: formData.get('prenom') as string,
            email: formData.get('email') as string,
            telephone: formData.get('telephone') as string,
            type_demande: selectedProperty.type_transaction === 'location' ? 'location' : 'vente',
          }
        ]);

      if (error) throw error;

      toast({
        title: "Demande envoyée",
        description: "Nous vous contacterons bientôt."
      });
      setSelectedProperty(null);
    } catch (error) {
      console.error('Error submitting request:', error);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible d'envoyer votre demande."
      });
    }
  }, [selectedProperty, toast]);

  return (
    <div className="min-h-screen bg-sqi-white">
      <header className="fixed top-0 left-0 w-full h-header bg-sqi-white shadow-sm z-50">
        <div className="container mx-auto h-full flex items-center justify-between px-4">
          <div>
            <img 
              src="/lovable-uploads/7f374343-1968-4b5b-a9ab-9176cc5ea1fa.png" 
              alt="SQI | SOCIÉTÉ QUALITÉ IMMO" 
              className="h-8 w-auto"
            />
          </div>
          <nav className="hidden md:flex gap-8">
            <a href="#properties" className="font-inter text-sqi-black hover:text-sqi-gold transition-colors duration-default">
              Nos biens
            </a>
            <a href="#contact" className="font-inter text-sqi-black hover:text-sqi-gold transition-colors duration-default">
              Contact
            </a>
            <a 
              href="/login" 
              className="font-inter text-sqi-black hover:text-sqi-gold transition-colors duration-default flex items-center gap-2"
            >
              <LogIn className="w-4 h-4" />
              Connexion
            </a>
          </nav>
        </div>
      </header>

      <section className="relative h-hero mt-header">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1649972904349-6e44c42644a7')] bg-cover bg-center">
          <div className="absolute inset-0 bg-black bg-opacity-40"></div>
        </div>
        <div className="relative container mx-auto h-full flex items-center justify-center text-center px-4">
          <div>
            <h1 className="font-dm-sans text-4xl md:text-5xl lg:text-6xl font-bold text-sqi-white mb-6">
              Trouvez votre bien idéal
            </h1>
            <p className="font-inter text-xl text-sqi-white max-w-2xl mx-auto">
              Location et vente de biens immobiliers à Dakar
            </p>
          </div>
        </div>
      </section>

      <section className="bg-sqi-white py-6 shadow-sm">
        <div className="container mx-auto px-4">
          <div className="flex flex-wrap gap-6 justify-center">
            <div className="space-y-2">
              <p className="font-inter font-medium text-sm text-sqi-black">Type de bien</p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className={`transition-all duration-default ${
                    selectedType === "location" ? "bg-sqi-gold text-sqi-white" : ""
                  }`}
                  onClick={() => setSelectedType(selectedType === "location" ? null : "location")}
                >
                  <Building2 className="mr-2 h-4 w-4" />
                  Location
                </Button>
                <Button
                  variant="outline"
                  className={`transition-all duration-default ${
                    selectedType === "vente" ? "bg-sqi-gold text-sqi-white" : ""
                  }`}
                  onClick={() => setSelectedType(selectedType === "vente" ? null : "vente")}
                >
                  <Home className="mr-2 h-4 w-4" />
                  Vente
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <p className="font-inter font-medium text-sm text-sqi-black">Localisation</p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className={`transition-all duration-default ${
                    selectedLocation === "hann-mariste" ? "bg-sqi-gold text-sqi-white" : ""
                  }`}
                  onClick={() =>
                    setSelectedLocation(selectedLocation === "hann-mariste" ? null : "hann-mariste")
                  }
                >
                  <MapPin className="mr-2 h-4 w-4" />
                  Hann Mariste
                </Button>
                <Button
                  variant="outline"
                  className={`transition-all duration-default ${
                      selectedLocation === "sacre-coeur" ? "bg-sqi-gold text-sqi-white" : ""
                  }`}
                  onClick={() =>
                    setSelectedLocation(selectedLocation === "sacre-coeur" ? null : "sacre-coeur")
                  }
                >
                  <MapPin className="mr-2 h-4 w-4" />
                  Sacré cœur
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <p className="font-inter font-medium text-sm text-sqi-black">Période</p>
              <div className="flex gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={`${startDate ? "bg-sqi-gold text-sqi-white" : ""}`}
                    >
                      <Calendar className="mr-2 h-4 w-4" />
                      {startDate ? format(startDate, 'dd/MM/yyyy', { locale: fr }) : "Date début"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={startDate}
                      onSelect={(date) => {
                        setStartDate(date);
                        if (date && endDate && date > endDate) {
                          setEndDate(null);
                        }
                      }}
                      initialFocus
                      disabled={(date) => date < new Date()}
                    />
                  </PopoverContent>
                </Popover>

                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={`${endDate ? "bg-sqi-gold text-sqi-white" : ""}`}
                      disabled={!startDate}
                    >
                      <Calendar className="mr-2 h-4 w-4" />
                      {endDate ? format(endDate, 'dd/MM/yyyy', { locale: fr }) : "Date fin"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={endDate}
                      onSelect={setEndDate}
                      initialFocus
                      disabled={(date) => date < (startDate || new Date())}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="container mx-auto py-12 px-4 relative">
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-[500px] w-full rounded-lg" />
            ))}
          </div>
        ) : (
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
          >
            {filteredProperties.map((property) => (
              <motion.div
                key={property.id}
                variants={itemVariants}
              >
                <PropertyCard
                  id={property.id}
                  type={property.type_transaction}
                  title={property.libelle}
                  price={property.price}
                  prix_journalier={property.prix_journalier}
                  location={property.residence?.nom === "Hann Mariste" ? "hann-mariste" : "sacre-coeur"}
                  details={`${property.type_bien} • ${property.surface}m²`}
                  imageUrl={property.photos?.[0]?.url || "/placeholder.svg"}
                  onSelect={() => setSelectedProperty(property)}
                  isAvailable={property.isAvailable}
                />
              </motion.div>
            ))}
          </motion.div>
        )}
      </section>

      <Dialog open={!!selectedProperty} onOpenChange={() => setSelectedProperty(null)}>
        <DialogContent className="max-w-4xl">
          {selectedProperty && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div
                className="h-64 md:h-full bg-cover bg-center rounded-lg transition-transform duration-300 hover:scale-105"
                style={{ 
                  backgroundImage: `url(${selectedProperty.photos?.[0]?.url || "/placeholder.svg"})`
                }}
              />
              <Suspense fallback={<Skeleton className="h-full w-full" />}>
                <ContactForm property={selectedProperty} onSubmit={handleContactSubmit} />
              </Suspense>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
};

export default Index;

