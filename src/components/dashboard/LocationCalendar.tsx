
import { useState, useCallback, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { format, isAfter, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ACCEPTED_FILE_TYPES = ["application/pdf", "image/jpeg", "image/png"];

const formSchema = z
  .object({
    residence_id: z.string().min(1, "Veuillez sélectionner une résidence"),
    bien_id: z.string().min(1, "Veuillez sélectionner un bien"),
    dateDebut: z.string().min(1, "La date de début est requise"),
    dateFin: z.string().min(1, "La date de fin est requise"),
    nom: z.string().min(1, "Le nom est requis"),
    prenom: z.string().min(1, "Le prénom est requis"),
    email: z.string().email("Email invalide"),
    telephone: z.string().min(1, "Le téléphone est requis"),
    pieceIdentite: z
      .any()
      .refine((file) => file?.size <= MAX_FILE_SIZE, "La taille du fichier ne doit pas dépasser 5MB")
      .refine(
        (file) => ACCEPTED_FILE_TYPES.includes(file?.type),
        "Format de fichier accepté : .pdf, .jpg, .png"
      ),
  })
  .superRefine((data, ctx) => {
    if (data.dateDebut && data.dateFin) {
      const startDate = parseISO(data.dateDebut);
      const endDate = parseISO(data.dateFin);
      
      if (!isAfter(endDate, startDate)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "La date de fin doit être postérieure à la date de début",
          path: ["dateFin"],
        });
      }
    }
  });

const COLORS = [
  "#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4", "#FFEEAD",
  "#D4A5A5", "#9B59B6", "#3498DB", "#1ABC9C", "#F1C40F"
];

export function LocationCalendar() {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedDates, setSelectedDates] = useState<{
    start: Date | null;
    end: Date | null;
  }>({ start: null, end: null });
  const [selectedLocation, setSelectedLocation] = useState<any>(null);
  const [showLocationDetails, setShowLocationDetails] = useState(false);
  const [currentPrice, setCurrentPrice] = useState<number | null>(null);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      residence_id: "",
      bien_id: "",
      dateDebut: "",
      dateFin: "",
      nom: "",
      prenom: "",
      email: "",
      telephone: "",
    },
  });

  const { data: residences = [], isLoading: isLoadingResidences } = useQuery({
    queryKey: ['residences'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('residence')
        .select('id, nom');

      if (error) throw error;
      return data;
    },
  });

  const { data: properties = [], isLoading: isLoadingProperties } = useQuery({
    queryKey: ['properties', form.watch('residence_id')],
    queryFn: async () => {
      const residenceId = form.watch('residence_id');
      if (!residenceId) return [];

      const { data, error } = await supabase
        .from('bien')
        .select('id, libelle, prix_journalier')
        .eq('residence_id', parseInt(residenceId))
        .eq('type_transaction', 'location')
        .eq('statut', 'disponible');

      if (error) throw error;
      return data;
    },
    enabled: !!form.watch('residence_id'),
  });

  useEffect(() => {
    const selectedBienId = form.watch('bien_id');
    const selectedProperty = properties.find(
      (property) => property.id.toString() === selectedBienId
    );
    
    if (selectedProperty && selectedProperty.prix_journalier) {
      setCurrentPrice(selectedProperty.prix_journalier);
    } else {
      setCurrentPrice(null);
    }
  }, [form.watch('bien_id'), properties]);

  const { data: existingLocations = [], refetch: refetchLocations } = useQuery({
    queryKey: ['locations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('location')
        .select(`
          id,
          date_debut,
          date_fin,
          statut,
          cni_url,
          commentaire,
          bien:bien_id (libelle, prix_journalier)
        `);

      if (error) throw error;
      return data.map((location, index) => {
        const tenantInfo = location.commentaire ? 
          location.commentaire.match(/Locataire: (.*?),.*Email: (.*?),.*Tel: (.*?),/) : null;
        
        return {
          id: location.id.toString(),
          title: location.bien?.libelle || 'Bien non disponible',
          start: location.date_debut,
          end: location.date_fin,
          allDay: true,
          backgroundColor: COLORS[index % COLORS.length],
          extendedProps: {
            prix_journalier: location.bien.prix_journalier,
            statut: location.statut,
            cni_url: location.cni_url,
            tenant: tenantInfo ? {
              nom_complet: tenantInfo[1].trim(),
              email: tenantInfo[2].trim(),
              telephone: tenantInfo[3].trim()
            } : null
          }
        };
      });
    },
  });

  const onSelect = useCallback((selectInfo: any) => {
    const startDate = selectInfo.start;
    setSelectedDates({
      start: startDate,
      end: selectInfo.end,
    });
    setIsOpen(true);

    form.reset();
    form.setValue("dateDebut", format(startDate, "yyyy-MM-dd"), {
      shouldValidate: true,
    });
  }, [form]);

  const handleEventClick = (clickInfo: any) => {
    setSelectedLocation(clickInfo.event);
    setShowLocationDetails(true);
  };

  const handleCancelLocation = async (locationId: string) => {
    try {
      const { error } = await supabase.rpc('cancel_location', {
        location_id: parseInt(locationId)
      });

      if (error) throw error;

      toast({
        title: "Succès",
        description: "La location a été résiliée avec succès",
      });
      
      setShowLocationDetails(false);
      refetchLocations();
    } catch (error) {
      console.error('Error:', error);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Une erreur est survenue lors de la résiliation de la location",
      });
    }
  };

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      const selectedProperty = properties.find(
        (property) => property.id.toString() === values.bien_id
      );

      if (!selectedProperty?.prix_journalier) {
        toast({
          variant: "destructive",
          title: "Erreur",
          description: "Le prix journalier n'est pas défini pour ce bien",
        });
        return;
      }

      const pieceIdentite = values.pieceIdentite;
      const fileExt = pieceIdentite.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;

      const { data: fileData, error: uploadError } = await supabase.storage
        .from('piece_identite')
        .upload(fileName, pieceIdentite);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('piece_identite')
        .getPublicUrl(fileName);

      const { error } = await supabase.rpc('create_location_by_calendar', {
        p_bien_id: parseInt(values.bien_id),
        p_date_debut: values.dateDebut,
        p_date_fin: values.dateFin,
        p_nom: values.nom,
        p_prenom: values.prenom,
        p_telephone: values.telephone,
        p_email: values.email,
        p_adresse: "",
        p_cni: urlData.publicUrl
      });

      if (error) throw error;

      toast({
        title: "Succès",
        description: "La location a été créée avec succès",
      });
      setIsOpen(false);
      form.reset();
      await refetchLocations();
    } catch (error) {
      console.error('Error:', error);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Une erreur est survenue lors de la création de la location",
      });
    }
  };

  if (isLoadingResidences) {
    return <Skeleton className="w-full h-[600px]" />;
  }

  return (
    <div className="p-4">
      <FullCalendar
        plugins={[dayGridPlugin, interactionPlugin]}
        initialView="dayGridMonth"
        selectable={true}
        select={onSelect}
        locale={fr}
        headerToolbar={{
          left: "prev,next today",
          center: "title",
          right: "dayGridMonth",
        }}
        events={existingLocations}
        eventClick={handleEventClick}
      />

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Créer une location</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="residence_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Résidence</FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={(value) => {
                        field.onChange(value);
                        form.setValue("bien_id", "");
                      }}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner une résidence" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {residences.map((residence) => (
                          <SelectItem key={residence.id} value={residence.id.toString()}>
                            {residence.nom}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="bien_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bien</FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                      disabled={!form.watch('residence_id')}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner un bien" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {isLoadingProperties ? (
                          <div className="flex items-center justify-center p-4">
                            <Loader2 className="h-4 w-4 animate-spin" />
                          </div>
                        ) : (
                          properties.map((property) => (
                            <SelectItem key={property.id} value={property.id.toString()}>
                              {property.libelle}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="dateDebut"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date de début</FormLabel>
                      <FormControl>
                        <Input 
                          type="date" 
                          {...field} 
                          disabled
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="dateFin"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date de fin</FormLabel>
                      <FormControl>
                        <Input 
                          type="date" 
                          {...field} 
                          min={form.watch('dateDebut')}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {currentPrice !== null && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">Prix journalier</p>
                  <p className="text-sm">{currentPrice} FCFA</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="nom"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nom</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="prenom"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Prénom</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input type="email" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="telephone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Téléphone</FormLabel>
                      <FormControl>
                        <Input type="tel" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="pieceIdentite"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Pièce d'identité</FormLabel>
                    <FormControl>
                      <Input
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={(e) => {
                          if (e.target.files?.[0]) {
                            field.onChange(e.target.files[0]);
                          }
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end space-x-4 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsOpen(false)}
                >
                  Annuler
                </Button>
                <Button type="submit">Créer</Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={showLocationDetails} onOpenChange={setShowLocationDetails}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Détails de la location</DialogTitle>
          </DialogHeader>
          {selectedLocation && (
            <Tabs defaultValue="details">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="details">Détails</TabsTrigger>
                <TabsTrigger value="documents">Documents</TabsTrigger>
              </TabsList>
              
              <TabsContent value="details">
                <Card>
                  <CardHeader>
                    <CardTitle>{selectedLocation.title}</CardTitle>
                    <CardDescription>
                      Du {format(new Date(selectedLocation.start), 'dd/MM/yyyy')} au{' '}
                      {format(new Date(selectedLocation.end), 'dd/MM/yyyy')}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {selectedLocation.extendedProps.tenant && (
                      <div>
                        <p className="font-semibold">Locataire</p>
                        <p>{selectedLocation.extendedProps.tenant.nom_complet}</p>
                        <p>{selectedLocation.extendedProps.tenant.email}</p>
                        <p>{selectedLocation.extendedProps.tenant.telephone}</p>
                      </div>
                    )}
                    <div>
                      <p className="font-semibold">Prix journalier</p>
                      <p>{selectedLocation.extendedProps.prix_journalier} FCFA</p>
                    </div>
                    <div>
                      <p className="font-semibold">Statut</p>
                      <p
                          className={`inline-block px-2 py-1 text-xs font-semibold rounded-full ${
                              selectedLocation.extendedProps.statut === "en_cours"
                                  ? "bg-green-100 text-green-800"
                                  : selectedLocation.extendedProps.statut === "annule" || selectedLocation.extendedProps.statut === "finalise"
                                      ? "bg-red-100 text-red-800"
                                      : "bg-yellow-100 text-yellow-800"
                          }`}
                      >{selectedLocation.extendedProps.statut === 'en_cours' ? 'En cours' :
                          selectedLocation.extendedProps.statut === 'annule' ? 'Annulée' :
                          selectedLocation.extendedProps.statut === 'finalise' ? 'Finalisée' : ''
                      }</p>
                    </div>
                  </CardContent>
                  <CardFooter className="justify-end space-x-2">
                    {selectedLocation.extendedProps.statut === 'en_cours' && (
                      <Button
                        variant="destructive"
                        onClick={() => handleCancelLocation(selectedLocation.id)}
                      >
                        Résilier la location
                      </Button>
                    )}
                    <Button variant="outline" onClick={() => setShowLocationDetails(false)}>
                      Fermer
                    </Button>
                  </CardFooter>
                </Card>
              </TabsContent>
              
              <TabsContent value="documents">
                <Card>
                  <CardHeader>
                    <CardTitle>Documents</CardTitle>
                    <CardDescription>
                      Pièce d'identité et autres documents
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {selectedLocation.extendedProps.cni_url ? (
                      <div className="flex flex-col space-y-2">
                        <p className="font-semibold">Pièce d'identité</p>
                        <a
                          href={selectedLocation.extendedProps.cni_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline"
                        >
                          Voir le document
                        </a>
                      </div>
                    ) : (
                      <p className="text-muted-foreground">Aucune pièce d'identité disponible</p>
                    )}
                  </CardContent>
                  <CardFooter className="justify-end">
                    <Button variant="outline" onClick={() => setShowLocationDetails(false)}>
                      Fermer
                    </Button>
                  </CardFooter>
                </Card>
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
