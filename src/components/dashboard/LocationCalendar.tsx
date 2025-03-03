  
  import React, { useState, useCallback, useEffect } from "react";
  import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
  } from "@/components/ui/dialog";
  import { Button } from "@/components/ui/button";
  import { Input } from "@/components/ui/input";
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
  import FullCalendar from "@fullcalendar/react";
  import dayGridPlugin from "@fullcalendar/daygrid";
  import interactionPlugin from "@fullcalendar/interaction";
  import { useToast } from "@/hooks/use-toast";
  import { useQuery } from "@tanstack/react-query";
  import { supabase } from "@/integrations/supabase/client";
  import {Badge, Calendar, Loader2, Search, X} from "lucide-react";
  import { Skeleton } from "@/components/ui/skeleton";
  import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
  } from "@/components/ui/card";
  import frLocale from "@fullcalendar/core/locales/fr";

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

  type Location = {
    id: number;

    date_debut: string;
    date_fin: string;
    contrat_signe: boolean;
    date_signature: string;
    commentaire: string;
    forfait: string | null;
    statut: "en_cours" | "finalise" | "annule";
    cni_url: string | null;
    bien: {
      id: number;
      libelle: string;
      price: number;
      prix_journalier: number;
    } | null;
    client: {
      id: number;
      prenom: string;
      nom: string;
      email: string;
      telephone: string;
      adresse: string;
    } | null;
    created_at: string;
    updated_at: string;
  };
  
  const COLORS = [
    "#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4", "#FFEEAD",
    "#D4A5A5", "#9B59B6", "#3498DB", "#1ABC9C", "#F1C40F"
  ];
  
  type Residence = "Hann Mariste" | "Sacré cœur" |"all" ;
  type Disponibility = "disponible" | "occupe" | "all" ;
  type Pieces = "1" | "2" | "3" | "4+" | "all";
  
  
  export function LocationCalendar() {
    const [isOpen, setIsOpen] = useState(false);
    const [selectedResidence, setSelectedResidence] = useState<Residence>("all");
    const [selectedDispo, setSelectedDispo] = useState<Disponibility>("all");
    const [selectedPieces, setSelectedPieces] = useState<Pieces>("all");
    const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
      from: undefined,
      to: undefined,
    });
    const [showFilters, setShowFilters] = useState(false);
    const [activeFilters, setActiveFilters] = useState<string[]>([]);
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
  
    useEffect(() => {
      const newActiveFilters: string[] = [];
  
      if (selectedResidence !== "all") {
        newActiveFilters.push(`Résidence: ${selectedResidence}`);
      }
  
      if (selectedDispo !== "all") {
        newActiveFilters.push(`Disponibilité: ${selectedDispo === "disponible" ? "Disponible" : "Occupé"}`);
      }
  
      if (selectedPieces !== "all") {
        newActiveFilters.push(`Pièces: ${selectedPieces}`);
      }
  
      if (dateRange.from) {
        newActiveFilters.push(`Période: ${format(dateRange.from, "dd/MM/yyyy")}${dateRange.to ? ` - ${format(dateRange.to, "dd/MM/yyyy")}` : ""}`);
      }
  
      setActiveFilters(newActiveFilters);
    }, [selectedResidence, selectedDispo, selectedPieces, dateRange]);
  
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
          .select('id, libelle, prix_journalier, reference')
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
    }, [form, properties]);
  
    const { data: existingLocations = [], refetch: refetchLocations } = useQuery({
      queryKey: ['locations', selectedResidence, selectedDispo, selectedPieces, dateRange],
      queryFn: async () => {
        let query = supabase
          .from('location')
          .select(`
            id,
            date_debut,
            date_fin,
            statut,
            cni_url,
            client:client_id (
                id, 
                prenom, 
                nom, 
                email, 
                telephone
                ),
            bien:bien_id (
               id,
               libelle, 
               prix_journalier,
               residence(id, nom),
               statut,
               nb_pieces,
               reference
            )
          `);
  
        if (dateRange.from) {
          query = query.gte('date_debut', format(dateRange.from, 'yyyy-MM-dd'));
  
          if (dateRange.to) {
            query = query.lte('date_fin', format(dateRange.to, 'yyyy-MM-dd'));
          }
        }
  
        const { data, error } = await query;
  
        if (error) throw error;
  
        let filteredData = data;
  
        if (selectedResidence !== "all") {
          filteredData = filteredData.filter(location =>
              location.bien?.residence?.nom === selectedResidence
          );
        }
  
        if (selectedDispo !== "all") {
          filteredData = filteredData.filter(location =>
              selectedDispo === "disponible"
                  ? location.bien?.statut === "disponible"
                  : location.bien?.statut !== "disponible"
          );
        }
  
        if (selectedPieces !== "all") {
          filteredData = filteredData.filter(location => {
            if (selectedPieces === "4+") {
              return location.bien?.nb_pieces >= 4;
            }
            return location.bien?.nb_pieces === parseInt(selectedPieces);
          });
        }
  
        return filteredData.map((location, index) => {
          const tenantInfo = location.client;
  
          return {
            id: location.id.toString(),
            title: location.bien?.libelle + ` (ref : ${location.bien?.reference})` || 'Bien non disponible',
            start: location.date_debut,
            end: location.date_fin,
            allDay: true,
            backgroundColor: COLORS[index % COLORS.length],
            extendedProps: {
              prix_journalier: location.bien.prix_journalier,
              statut: location.statut,
              cni_url: location.cni_url,
              bien_id: location.bien.id,
              bien: location.bien,
              nombre_pieces: location.bien.nb_pieces,
              residence: location.bien.residence.nom,
              bien_statut: location.bien.statut,
              tenant: tenantInfo ? {
                id: tenantInfo.id,
                nom_complet: tenantInfo.prenom + " " + tenantInfo.nom,
                email: tenantInfo.email,
                telephone: tenantInfo.telephone
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
        await refetchLocations();
      } catch (error) {
        console.error('Error:', error);
        toast({
          variant: "destructive",
          title: "Erreur",
          description: "Une erreur est survenue lors de la résiliation de la location",
        });
      }
    };

    const generateContract = async (loc: any) => {
      try {
        if (!loc.id) {
          throw new Error("Information du bien manquante");
        }

        const { data: existLocation, error: locationError } = await supabase
            .from("location")
            .select(`
                  id,
                  date_debut,
                  date_fin,
                  statut,
                  cni_url,
                  forfait,
                  commentaire,
                  contrat_signe,
                  date_signature,
                  client:client_id (id, prenom, nom, email, telephone),
                  property:bien_id (
                    id,
                    libelle, 
                    prix_journalier,
                    residence (id, nom),
                    statut,
                    nb_pieces,
                    reference
                  )
            `)
            .eq("id", loc.id)
            .single();

        if (locationError) throw locationError;
        if (!existLocation) {
          toast({
            title: "Erreur",
            description: "Location non trouvée",
            variant: "destructive",
          });
          return;
        }

        const response = await supabase.functions.invoke('generate-rental-contract', {
          body: { location: existLocation }
        });

        if (response.error) {
          console.error('Function error details:', response.error);
          throw response.error;
        }


        const contractUrl = response.data.signedUrl;
        window.open(contractUrl, '_blank');

        toast({
          title: "Contrat généré",
          description: "Le contrat a été généré avec succès",
        });
      } catch (error) {
        console.error("Erreur lors de la génération du contrat:", error);
        toast({
          title: "Erreur",
          description: "Une erreur est survenue lors de la génération du contrat",
          variant: "destructive",
        });
      }
    };

    const clearFilters = () => {
      setSelectedResidence("all");
      setSelectedDispo("all");
      setSelectedPieces("all");
      setDateRange({ from: undefined, to: undefined });
    };
  
    const removeFilter = (filter: string) => {
      if (filter.startsWith("Résidence")) {
        setSelectedResidence("all");
      } else if (filter.startsWith("Disponibilité")) {
        setSelectedDispo("all");
      } else if (filter.startsWith("Pièces")) {
        setSelectedPieces("all");
      } else if (filter.startsWith("Période")) {
        setDateRange({ from: undefined, to: undefined });
      }
    };
  
    const handleResidenceChange = (value: string) => {
      setSelectedResidence(value as Residence);
    };
  
    const handleDispoChange = (value: string) => {
      setSelectedDispo(value as Disponibility);
    };
  
    const handlePieceChange = (value: string) => {
      setSelectedPieces(value as Pieces);
    };
  
    const handleDateChange = (period: { from: Date | undefined; to: Date | undefined }) => {
      setDateRange(period);
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
  
        const {error: uploadError } = await supabase.storage
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
        <div className="mb-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold">Planning</h2>
            <Button
                variant="outline"
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-2 bg-orange-400"
            >
              <Search className="h-4 w-4 text-orange-200" />
              Filtres
            </Button>
          </div>
  
          {activeFilters.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm text-gray-500">Filtres actifs:</span>
                {activeFilters.map((filter) => (
                    <Badge key={filter} variant="secondary" className="flex items-center gap-1">
                      {filter}
                      <X
                          className="h-3 w-3 cursor-pointer"
                          onClick={() => removeFilter(filter)}
                      />
                    </Badge>
                ))}
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearFilters}
                    className="text-xs"
                >
                  Effacer tout
                </Button>
              </div>
          )}
  
          {showFilters && (
              <Card>
                <CardContent className="p-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-2">
                    <div>
                      <div className="text-sm font-medium mb-1.5">Résidence</div>
                      <Select value={selectedResidence} onValueChange={handleResidenceChange}>
                        <SelectTrigger>
                          <SelectValue placeholder="Toutes les résidences" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Toutes</SelectItem>
                          <SelectItem value="Hann Mariste">Hann Mariste</SelectItem>
                          <SelectItem value="Sacré cœur">Sacré cœur</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
  
                    <div>
                      <div className="text-sm font-medium mb-1.5">Disponibilité</div>
                      <Select value={selectedDispo} onValueChange={handleDispoChange}>
                        <SelectTrigger>
                          <SelectValue placeholder="Toutes les disponibilités" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Toutes</SelectItem>
                          <SelectItem value="disponible">Disponible</SelectItem>
                          <SelectItem value="occupe">Occupé</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
  
                    <div>
                      <div className="text-sm font-medium mb-1.5">Nombre de pièces</div>
                      <Select value={selectedPieces} onValueChange={handlePieceChange}>
                        <SelectTrigger>
                          <SelectValue placeholder="Tous" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Tous</SelectItem>
                          <SelectItem value="1">1 pièce</SelectItem>
                          <SelectItem value="2">2 pièces</SelectItem>
                          <SelectItem value="3">3 pièces</SelectItem>
                          <SelectItem value="4+">4+ pièces</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
  
                    {/*<div>*/}
                    {/*  <div className="text-sm font-medium mb-1.5">Période</div>*/}
                    {/*  <Popover>*/}
                    {/*    <PopoverTrigger asChild>*/}
                    {/*      <Button*/}
                    {/*          variant="outline"*/}
                    {/*          className="w-full justify-start text-left font-normal"*/}
                    {/*      >*/}
                    {/*        {dateRange.from ? (*/}
                    {/*            dateRange.to ? (*/}
                    {/*                <>*/}
                    {/*                  {format(dateRange.from, "dd/MM/yyyy")} -{" "}*/}
                    {/*                  {format(dateRange.to, "dd/MM/yyyy")}*/}
                    {/*                </>*/}
                    {/*            ) : (*/}
                    {/*                format(dateRange.from, "dd/MM/yyyy")*/}
                    {/*            )*/}
                    {/*        ) : (*/}
                    {/*            "Sélectionner une période"*/}
                    {/*        )}*/}
                    {/*      </Button>*/}
                    {/*    </PopoverTrigger>*/}
                    {/*    <PopoverContent className="w-auto p-0" align="start">*/}
                    {/*      <Calendar*/}
                    {/*          initialFocus*/}
                    {/*          mode="range"*/}
                    {/*          selected={dateRange}*/}
                    {/*          onSelect={handleDateChange}*/}
                    {/*          numberOfMonths={2}*/}
                    {/*          locale={fr}*/}
                    {/*      />*/}
                    {/*    </PopoverContent>*/}
                    {/*  </Popover>*/}
                    {/*</div>*/}
                  </div>
  
                  {/* Boutons de filtres */}
                  <div className="flex justify-end gap-2 mt-4">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={clearFilters}
                    >
                      Réinitialiser
                    </Button>
                    <Button
                        size="sm"
                        onClick={() => setShowFilters(false)}
                    >
                      Appliquer
                    </Button>
                  </div>
                </CardContent>
              </Card>
          )}
        </div>
        <FullCalendar
          plugins={[dayGridPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          selectable={true}
          select={onSelect}
          locale={frLocale}
          headerToolbar={{
            left: "prev,next today",
            center: "title",
            right: "dayGridMonth"
          }}
          buttonText={{
            today: "Aujourd'hui",
            month: "Mois",
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
                      <CardTitle className="underline cursor-pointer">
                        <a href={`/dashboard/property/${selectedLocation?.extendedProps?.bien_id}`}>
                          {selectedLocation.title}
                        </a>
                      </CardTitle>
                      <CardDescription>
                        Du {format(new Date(selectedLocation.start), 'dd/MM/yyyy')} au{' '}
                        {format(new Date(selectedLocation.end), 'dd/MM/yyyy')}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {selectedLocation.extendedProps.tenant && (
                        <div>
                          <p className="font-semibold">Locataire</p>
                          <p className="underline cursor-pointer">
                            <a href={`/dashboard/locataires/${selectedLocation?.extendedProps?.tenant?.id}`}>
                              {selectedLocation.extendedProps.tenant.nom_complet}
                            </a>
                          </p>
                        </div>
                      )}
                      {!selectedLocation.extendedProps.tenant && (
                          <p>Aucun client disponible</p>
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
                          <>
                            <Button
                              variant="destructive"
                              onClick={() => handleCancelLocation(selectedLocation.id)}
                          >
                            Résilier
                          </Button>
                            <Button
                              variant="default"
                              onClick={() => generateContract(selectedLocation)}
                          >
                            Génerer Contrat
                          </Button>
                          </>
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
