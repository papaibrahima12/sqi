import {useEffect, useState} from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Building2, MapPin, Ruler, ArrowLeft, Hash, Images, PhoneCall, Calendar, Star, History, FileText, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { AvailabilityCalendar } from "@/components/property/AvailabilityCalendar";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

interface PropertyDetailProps {
  isAdmin?: boolean;
}

const PropertyDetail = ({ isAdmin = false }: PropertyDetailProps) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const numericId = id ? parseInt(id, 10) : NaN;

  const form = useForm({
    defaultValues: {
      libelle: "",
      description: "",
      price: 0,
      prix_journalier: 0,
      surface: 0,
      nb_pieces: 0,
    }
  });

  const handleCallAgency = () => {
    const agencyPhoneNumber = "+221777695188";
    window.location.href = `tel:${agencyPhoneNumber}`;
  };

  const { data: property, isLoading } = useQuery({
    queryKey: ['property', numericId],
    queryFn: async () => {
      if (isNaN(numericId)) {
        throw new Error('Invalid property ID');
      }

      const { data: bien, error } = await supabase
        .from('bien')
        .select(`
          id,
          libelle,
          reference,
          type_bien,
          surface,
          nb_pieces,
          description,
          price,
          prix_journalier,
          type_transaction,
          statut,
          photo(id, url),
          residence(
            nom,
            adresse,
            latitude,
            longitude
          )
        `)
        .eq('id', numericId)
        .single();

      if (error) throw error;
      return bien;
    }
  });

  useEffect(() => {
    if (property) {
      form.reset({
        libelle: property.libelle,
        description: property.description || "",
        price: property.price,
        prix_journalier: property.prix_journalier,
        surface: property.surface,
        nb_pieces: property.nb_pieces || 0,
      });
    }
  }, [property, form]);

  const { data: approvedRequest } = useQuery({
    queryKey: ['approvedRequest', numericId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('demande')
        .select('*')
        .eq('bien_id', numericId)
        .eq('statut', 'approuve')
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !isNaN(numericId) && isAdmin
  });

  const { data: locationHistory } = useQuery({
    queryKey: ['locationHistory', numericId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('location')
        .select(`
          id,
          date_debut,
          date_fin,
          statut,
          client (
            id,
            prenom,
            nom,
            email,
            telephone,
            adresse
          ),
          bien(
          libelle,
          prix_journalier
          )
        `)
        .eq('bien_id', numericId)
        .order('date_debut', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !isNaN(numericId) && isAdmin
  });

  const { data: complaints } = useQuery({
    queryKey: ['complaints', numericId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('reclamation')
        .select('*')
        .eq('bien_id', numericId)
        .order('date_reclamation', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !isNaN(numericId) && isAdmin
  });

  const { data: evaluations } = useQuery({
    queryKey: ['evaluations', numericId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('evaluation')
        .select('*')
        .eq('bien_id', numericId)
        .order('date_evaluation', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !isNaN(numericId)
  });

  const updatePropertyMutation = useMutation({
    mutationFn: async (values: any) => {
      const { error } = await supabase
        .from('bien')
        .update({
          libelle: values.libelle,
          description: values.description,
          price: values.price,
          prix_journalier: values.prix_journalier,
          surface: values.surface,
          nb_pieces: values.nb_pieces,
        })
        .eq('id', numericId);

      if (error) throw error;
      navigate('/dashboard/biens');
    },
  onSuccess: () => {
      toast({
        title: "Modifications enregistrées",
        description: "Les modifications ont été enregistrées avec succès",
      });
      queryClient.invalidateQueries({ queryKey: ['property', numericId] });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Une erreur est survenue lors de l'enregistrement des modifications",
      });
    }
  });

  const handleBackClick = () => {
    navigate(isAdmin ? '/dashboard/biens' : '/');
  };

  const onSubmit = (values: any) => {
    updatePropertyMutation.mutate(values);
  };

  const handleReservationSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const dateDebut = formData.get('dateDebut') as string;
    const dateFin = formData.get('dateFin') as string;
    const forfait = formData.get('forfait') as string;
    const nom = formData.get('nom') as string;
    const prenom = formData.get('prenom') as string;
    const email = formData.get('email') as string;
    const telephone = formData.get('telephone') as string;

    if(dateDebut > dateFin){
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "La date de début ne peut pas être supérieure à la date de fin",
      });
      return;
    }

    const statut = property?.type_transaction === 'location' ? 'en_attente' : null;
    const statut_vente = property?.type_transaction === 'vente' ? 'nouveau' : null;

    const { error } = await supabase
        .from('demande')
        .insert({
          bien_id: numericId,
          date_debut_location: dateDebut,
          date_fin_location: dateFin,
          forfait,
          nom,
          prenom,
          email,
          telephone,
          type_demande: property?.type_transaction || 'location',
          statut: statut,
          statut_vente: statut_vente
        })
        .select()
        .single();

    if (error) {
      console.error('Erreur',error);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Une erreur est survenue lors de l'envoi de la demande",
      });
      return;
    }

    toast({
      title: "Demande envoyée",
      description: "Votre demande a été prise en compte. Un de nos agents vous contactera dans les plus brefs délais pour finaliser votre réservation. Merci de votre confiance !",
    });
    setOpen(false);

    const clientPhone = "221" + telephone;

    const dataCustomer = {
      "phone": clientPhone,
      "name": prenom
    };

    const responseClient = await fetch("https://vertical-mastodon-lycs-a1a18eaf.koyeb.app/sendMessageToRequester", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(dataCustomer),
    });

    const dataClient = await responseClient.json();

    if (!dataClient.success) {
      console.error("Erreur lors de l'envoi du message au client : " + JSON.stringify(dataClient.error));
    }

    const adminPhone = "221781757613";

    const requestUrl = `${window.location.origin}/dashboard/demandes/`;

    const dataAdmin = {
      "phone": adminPhone,
      "bien": property?.libelle,
      "prenom": prenom,
      "nom": nom,
      "email": email,
      "dateDebut": dateDebut,
      "dateFin": dateDebut,
      "link": requestUrl,
    };

    const responseAdmin = await fetch("https://vertical-mastodon-lycs-a1a18eaf.koyeb.app/sendMessageToAdmin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(dataAdmin),
    });

    console.log('admin resp', responseAdmin);

    const adminResponseData = await responseAdmin.json();

    if (!adminResponseData.success) {
      console.error("Erreur lors de l'envoi du message à l'administrateur : " + JSON.stringify(adminResponseData.error));
    }

  };

  const { data: activeLocationWithDoc } = useQuery({
    queryKey: ['locationWithDoc', numericId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('location')
        .select(`
          id,
          demande (
            id,
            commentaire
          )
        `)
        .eq('bien_id', numericId)
        .eq('statut', 'en_cours')
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !isNaN(numericId) && isAdmin
  });

  const handleDocumentDownload = async () => {
    if (!activeLocationWithDoc?.id) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de récupérer les informations de la location",
      });
      return;
    }

    try {
      const { data: location } = await supabase
        .from('location')
        .select('*')
        .eq('id', activeLocationWithDoc.id)
        .single();

      if (!location || !location.cni_url) {
        toast({
          variant: "destructive",
          title: "Erreur",
          description: "Le document CNI n'est pas disponible",
        });
        return;
      }

      const { data } = supabase.storage
        .from('piece_identite')
        .getPublicUrl(location.cni_url);

      if (!data.publicUrl) {
        toast({
          variant: "destructive",
          title: "Erreur",
          description: "Impossible de générer l'URL du document",
        });
        return;
      }

      window.open(data.publicUrl, '_blank');

      toast({
        title: "Succès",
        description: "Le document a été ouvert dans un nouvel onglet",
      });

    } catch (error) {
      console.error('Erreur:', error);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Une erreur est survenue lors de l'ouverture du document",
      });
    }
  };

  const renderLocationHistory = () => {
    if (!locationHistory || locationHistory.length === 0) {
      return (
        <div className="text-center text-gray-500">
          Aucun historique de location disponible
        </div>
      );
    }

    return locationHistory.map((location) => {
      console.log('location', location);
      const handleHistoryDocumentDownload = async (locationId: number) => {
        try {
          const { data: locationData } = await supabase
            .from('location')
            .select(`
              *,
              client( id, nom, prenom, email, telephone)
            `)
            .eq('id', locationId)
            .single();

          if (!locationData || !locationData.cni_url) {
            toast({
              variant: "destructive",
              title: "Erreur",
              description: "Le document CNI n'est pas disponible",
            });
            return;
          }

          const cleanUrl = locationData.cni_url.replace(
            /^https:\/\/.*\/storage\/v1\/object\/public\/piece_identite\//,
            ''
          );

          const { data } = supabase.storage
            .from('piece_identite')
            .getPublicUrl(cleanUrl);

          if (!data.publicUrl) {
            toast({
              variant: "destructive",
              title: "Erreur",
              description: "Impossible de générer l'URL du document",
            });
            return;
          }

          window.open(data.publicUrl, '_blank');

          toast({
            title: "Succès",
            description: "Le document a été ouvert dans un nouvel onglet",
          });

        } catch (error) {
          console.error('Erreur:', error);
          toast({
            variant: "destructive",
            title: "Erreur",
            description: "Une erreur est survenue lors de l'ouverture du document",
          });
        }
      };

      return (
          <div key={location.id} className="bg-gray-50 p-4 rounded-lg">
          <div className="flex justify-between items-center mb-2">
            <div className="font-medium underline cursor-pointer ">
              <a href={`/dashboard/locataires/${location?.client?.id}`}>
                {location.client?.prenom} {location.client?.nom}
              </a>
            </div>
            <div className="text-sm text-gray-600">
              Du {format(new Date(location.date_debut), 'dd/MM/yyyy')} au {format(new Date(location.date_fin), 'dd/MM/yyyy')}
            </div>
          </div>
          <div className="text-sm text-gray-600">
            {location.client?.email} - {location.client?.telephone}
          </div>
          <div className="mt-2 flex justify-between items-center">
            <div className="flex flex-col gap-1">
              {location.bien.prix_journalier && (
                <span className="text-sm text-gray-600">
                  {location.bien.prix_journalier.toLocaleString()} FCFA/jour
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
                onClick={() => handleHistoryDocumentDownload(location.id)}
              >
                <Download className="h-4 w-4" />
                Télécharger CNI
              </Button>
              <div className={`text-sm px-2 py-1 rounded ${
                location.statut === 'en_cours' ? 'bg-green-100 text-green-800' :
                location.statut === 'finalise' ? 'bg-gray-100 text-gray-800' :
                'bg-red-100 text-red-800'
              }`}>
                {location.statut === 'en_cours' ? 'En cours' :
                 location.statut === 'finalise' ? 'Finalisée' : 'Annulée'}
              </div>
            </div>
          </div>
        </div>
      );
    });
  };

  if (isNaN(numericId)) {
    return (
      <div className="container mx-auto mt-header p-4">
        <h1 className="text-2xl font-bold text-red-600">ID de propriété invalide</h1>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="container mx-auto mt-header p-4">
        <Skeleton className="h-96 w-full rounded-lg" />
        <div className="mt-8 space-y-4">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
        </div>
      </div>
    );
  }

  if (!property) {
    return (
      <div className="container mx-auto mt-header p-4">
        <h1 className="text-2xl font-bold text-red-600">Bien non trouvé</h1>
      </div>
    );
  }

  const isPropertyBookable = property.statut === 'disponible';
  const photos = property.photo || [];
  const hasMultiplePhotos = photos.length > 1;

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`h-4 w-4 ${i < rating ? 'text-yellow-400 fill-current' : 'text-gray-300'}`}
      />
    ));
  };

  const getPropertyImageUrl = (photoUrl) => {
    if (!photoUrl) return "/placeholder.svg";

    if(photoUrl.startsWith('https://')) return photoUrl;

    try {
      let path = photoUrl;

      if (photoUrl.includes('supabase.co/storage/v1/object/public/property_images/')) {
        const urlParts = photoUrl.split('property_images/');
        if (urlParts.length > 1) {
          path = urlParts[1];
        }
      }

      const { data } = supabase.storage.from('property_images').getPublicUrl(path);

      return data.publicUrl || "/placeholder.svg";
    } catch (error) {
      console.error("Error generating image URL:", error, "for path:", photoUrl);
      return "/placeholder.svg";
    }
  };

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-sqi-white">
        <div className="container mx-auto px-4 py-4 mt-header">
          <Button
            variant="ghost"
            onClick={handleBackClick}
            className="flex items-center gap-2 hover:bg-gray-100"
          >
            <ArrowLeft className="h-5 w-5" />
            Retour
          </Button>
        </div>

        <div className="relative w-full h-[500px]">
          {hasMultiplePhotos ? (
            <Carousel className="w-full h-full">
              <CarouselContent>
                {photos.map((photo) => (
                  <CarouselItem key={photo.id} className="h-[500px]">
                    <img
                      src={getPropertyImageUrl(photo.url)}
                      alt={`Vue de ${property.libelle}`}
                      className="w-full h-full object-cover"
                    />
                  </CarouselItem>
                ))}
              </CarouselContent>
              <CarouselPrevious className="left-4" />
              <CarouselNext className="right-4" />
            </Carousel>
          ) : (
            <img
              src={getPropertyImageUrl(photos[0].url)}
              alt={`Vue principale de ${property.libelle}`}
              className="w-full h-full object-cover"
            />
          )}
          <div className="absolute inset-0 bg-black/40">
            <div className="container mx-auto h-full flex items-end pb-8">
              <div className="text-white">
                <div className="mb-4 space-y-2">
                  <span className="bg-sqi-gold px-4 py-2 rounded-full text-sm font-medium">
                    {property.type_transaction === "location" ? "Location" : "Vente"}
                  </span>
                  <div className="flex items-center gap-2 text-sm">
                    <Hash className="h-4 w-4" />
                    <span className="font-mono">{property.reference}</span>
                  </div>
                </div>
                <h1 className="text-4xl font-bold mb-4">{property.libelle}</h1>
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-5 w-5" />
                    <span>{property.residence?.nom || "Emplacement non spécifié"}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Building2 className="h-5 w-5" />
                    <span>{property.nb_pieces || 0} pièces</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Ruler className="h-5 w-5" />
                    <span>{property.surface}m²</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="container mx-auto py-12">
          {photos.length - 1 > 0 && (
            <div className="flex items-center gap-2 text-gray-600 mb-8">
              <Images className="h-5 w-5" />
              <span>{photos.length - 1} photo{photos.length - 1 > 1 ? 's' : ''} supplémentaire{photos.length - 1 > 1 ? 's' : ''} disponible{photos.length - 1 > 1 ? 's' : ''}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="md:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle>Description</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600">{property.description}</p>
                  {evaluations && evaluations.length > 0 && (
                    <div className="mt-8">
                      <h3 className="font-semibold mb-4">Évaluations</h3>
                      <div className="space-y-4">
                        {evaluations.map((evaluation) => (
                          <div key={evaluation.id} className="bg-gray-50 p-4 rounded-lg">
                            <div className="flex justify-between items-center">
                              <div className="flex">
                                {renderStars(evaluation.note)}
                              </div>
                              <span className="text-sm text-gray-600">
                                {format(new Date(evaluation.date_evaluation), 'dd/MM/yyyy')}
                              </span>
                            </div>
                            {evaluation.commentaire && (
                              <p className="mt-2 text-gray-600">{evaluation.commentaire}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {property.type_transaction === "location" && (
                <div className="mt-8">
                  <h2 className="text-2xl font-bold mb-4">Disponibilités</h2>
                  <AvailabilityCalendar propertyId={numericId} />
                </div>
              )}
            </div>

            <div className="bg-gray-50 p-6 rounded-lg h-fit space-y-6">
              <div>
                <div className="text-3xl font-bold mb-2">
                  {property.type_transaction === 'location' ? property.prix_journalier?.toLocaleString() + ' FCFA /jour' : property.price?.toLocaleString() + ' FCFA'}
                </div>
                <div className="flex items-center gap-2 text-gray-600 mb-6">
                  <Calendar className="h-4 w-4" />
                  <span>{property.type_transaction === 'location' ? 'Location journalière' : 'Vente'}</span>
                </div>
                {!isPropertyBookable && (
                  <div className="bg-red-100 text-red-800 px-4 py-2 rounded-md text-sm">
                    Ce bien n'est plus disponible à la réservation
                  </div>
                )}
              </div>

              {property.residence?.adresse && (
                <div>
                  <h3 className="font-medium mb-2">Adresse</h3>
                  <p className="text-gray-600">{property.residence.adresse}</p>
                </div>
              )}

              <div className="flex flex-col gap-3">
                <Button
                  variant="outline"
                  className="w-full border-sqi-gold text-sqi-gold hover:bg-sqi-gold"
                  onClick={handleCallAgency}
                >
                  <PhoneCall className="mr-2 h-4 w-4" />
                  Contacter l'agence
                </Button>

                {isPropertyBookable ? (
                  <Dialog open={open} onOpenChange={setOpen}>
                    <DialogTrigger asChild>
                      <Button className="w-full bg-sqi-gold hover:bg-sqi-gold/90">
                        Réserver
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[425px] overflow-y-auto max-h-[90vh]">
                      <DialogHeader>
                        <DialogTitle className="text-xl font-bold">Demande de réservation</DialogTitle>
                      </DialogHeader>
                      <form onSubmit={handleReservationSubmit} className="space-y-4 py-4">
                        <div className="space-y-2">
                          <label htmlFor="residence" className="text-sm font-medium text-gray-700">
                            Résidence
                          </label>
                          <input
                            type="text"
                            id="residence"
                            value={property.residence?.nom || "Non spécifiée"}
                            disabled
                            className="w-full px-3 py-2 bg-gray-100 border border-gray-200 rounded-lg text-gray-500"
                          />
                        </div>
                        
                        {property.type_transaction === 'location' && (
                          <div className="space-y-2">
                            <label htmlFor="forfait" className="text-sm font-medium text-gray-700">
                              Forfait
                            </label>
                            <select
                              id="forfait"
                              name="forfait"
                              required={property.type_transaction === 'location'}
                              className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900"
                            >
                              <option value="electricite">Avec électricité</option>
                              <option value="sans">Sans électricité</option>
                            </select>
                          </div>
                        )}

                        {property.type_transaction === "location" && (
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <label htmlFor="dateDebut" className="text-sm font-medium text-gray-700">
                                Date de début
                              </label>
                              <input
                                type="date"
                                id="dateDebut"
                                name="dateDebut"
                                required={property.type_transaction === 'location'}
                                min={format(new Date(), 'yyyy-MM-dd')}
                                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900"
                              />
                            </div>
                            <div className="space-y-2">
                              <label htmlFor="dateFin" className="text-sm font-medium text-gray-700">
                                Date de fin
                              </label>
                              <input
                                type="date"
                                id="dateFin"
                                name="dateFin"
                                required={property.type_transaction === 'location'}
                                min={format(new Date(), 'yyyy-MM-dd')}
                                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900"
                              />
                            </div>
                          </div>
                        )}

                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <label htmlFor="nom" className="text-sm font-medium text-gray-700">
                              Nom
                            </label>
                            <input
                              type="text"
                              id="nom"
                              name="nom"
                              required
                              className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900"
                            />
                          </div>
                          <div className="space-y-2">
                            <label htmlFor="prenom" className="text-sm font-medium text-gray-700">
                              Prénom
                            </label>
                            <input
                              type="text"
                              id="prenom"
                              name="prenom"
                              required
                              className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <label htmlFor="email" className="text-sm font-medium text-gray-700">
                              Email
                            </label>
                            <input
                              type="email"
                              id="email"
                              name="email"
                              required
                              className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900"
                            />
                          </div>
                          <div className="space-y-2">
                            <label htmlFor="telephone" className="text-sm font-medium text-gray-700">
                              Téléphone
                            </label>
                            <input
                              type="tel"
                              id="telephone"
                              name="telephone"
                              required
                              className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900"
                            />
                          </div>
                        </div>

                        <div className="flex justify-end">
                          <Button type="submit" className="bg-sqi-gold hover:bg-sqi-gold/90 text-white px-6">
                            Envoyer
                          </Button>
                        </div>
                      </form>
                    </DialogContent>
                  </Dialog>
                ) : (
                  <Button disabled className="w-full bg-gray-300">
                    Non disponible
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-sqi-white">
      <div className="container flex justify-between items-end mx-auto px-4 py-4 mt-header">
        <Button
          variant="ghost"
          onClick={handleBackClick}
          className="flex items-center gap-2 hover:bg-gray-100"
        >
          <ArrowLeft className="h-5 w-5" />
          Retour
        </Button>
        <div className="flex gap-2 items-end">
          <Button
              variant="ghost"
              className="flex text-white items-center gap-2 bg-black ml-auto"
              onClick={() => navigate(`images`)}
          >
            Gérer les images
          </Button>
          <Button
              variant="ghost"
              className="flex text-white items-center gap-2 bg-red-600 ml-auto"
          >
            Supprimer le bien
          </Button>
        </div>
      </div>

      <div className="relative w-full h-[500px]">
        {hasMultiplePhotos ? (
          <Carousel className="w-full h-full">
            <CarouselContent>
              {photos.map((photo) => (
                <CarouselItem key={photo.id} className="h-[500px]">
                  <img
                    src={getPropertyImageUrl(photo.url)
                    }
                    alt={`Vue de ${property.libelle}`}
                    className="w-full h-full object-cover"
                  />
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious className="left-4" />
            <CarouselNext className="right-4" />
          </Carousel>
        ) : (
          <img
            src={getPropertyImageUrl(photos[0].url)}
            alt={`Vue principale de ${property.libelle}`}
            className="w-full h-full object-cover"
          />
        )}
      </div>

      <div className="container mx-auto py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="md:col-span-2">
            <Tabs defaultValue="details">
              <TabsList>
                <TabsTrigger value="details">Détails</TabsTrigger>
                {property.type_transaction === 'location' &&
                    <>
                      <TabsTrigger value="history">Historique</TabsTrigger>
                      <TabsTrigger value="complaints">Réclamations</TabsTrigger>
                    </>
                }
                <TabsTrigger value="evaluations">Évaluations</TabsTrigger>
              </TabsList>

              <TabsContent value="details">
                <Card>
                  <CardHeader>
                    <CardTitle>Informations du bien</CardTitle>
                    <CardDescription>Modifier les informations du bien</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Form {...form}>
                      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                          control={form.control}
                          name="libelle"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Nom du bien</FormLabel>
                              <FormControl>
                                <Input {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="description"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Description</FormLabel>
                              <FormControl>
                                <Textarea {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <div className="grid grid-cols-3 gap-4">
                          {property.type_transaction === 'vente' ?
                            <>
                            <FormField
                            control={form.control}
                          name="price"
                          render={({ field }) => (
                              <FormItem>
                                <FormLabel>Prix</FormLabel>
                                <FormControl>
                                  <Input type="number" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                          )}
                        />
                        </> :
                              <>
                          <FormField
                              control={form.control}
                              name="prix_journalier"
                              render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Prix Journalier</FormLabel>
                                    <FormControl>
                                      <Input type="number" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                              )}
                          />
                              </>
                          }

                          <FormField
                            control={form.control}
                            name="surface"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Surface (m²)</FormLabel>
                                <FormControl>
                                  <Input type="number" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="nb_pieces"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Nombre de pièces</FormLabel>
                                <FormControl>
                                  <Input type="number" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        <Button type="submit">Enregistrer les modifications</Button>
                      </form>
                    </Form>
                  </CardContent>
                </Card>
              </TabsContent>
              { property.type_transaction === 'location' &&
                  <TabsContent value="history">
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <History className="h-5 w-5 text-sqi-gold" />
                          Historique des locations
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          {renderLocationHistory()}
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>
              }
              <TabsContent value="complaints">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-5 w-5 text-sqi-gold" />
                      Réclamations
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {complaints && complaints.length > 0 ? (
                        complaints.map((complaint) => (
                          <div key={complaint.id} className="bg-gray-50 p-4 rounded-lg">
                            <div className="flex justify-between items-center mb-2">
                              <div className="font-medium">
                                <span>Réclamation #{complaint.id}</span>
                              </div>
                              <div className="text-sm text-gray-600">
                                {format(new Date(complaint.date_reclamation), 'dd/MM/yyyy')}
                              </div>
                            </div>
                            <p className="text-gray-600">{complaint.description}</p>
                            <div className="mt-2">
                              <span className={`text-sm px-2 py-1 rounded ${
                                complaint.statut === 'en_attente' ? 'bg-yellow-100 text-yellow-800' :
                                complaint.statut === 'resolu' ? 'bg-green-100 text-green-800' :
                                'bg-red-100 text-red-800'
                              }`}>
                                {complaint.statut === 'en_attente' ? 'En attente' :
                                 complaint.statut === 'resolu' ? 'Résolu' : 'Rejeté'}
                              </span>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-center text-gray-500">
                          Aucune réclamation disponible
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="evaluations">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Star className="h-5 w-5 text-sqi-gold" />
                      Évaluations
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {evaluations && evaluations.length > 0 ? (
                        evaluations.map((evaluation) => (
                          <div key={evaluation.id} className="bg-gray-50 p-4 rounded-lg">
                            <div className="flex justify-between items-center">
                              <div className="flex">
                                {renderStars(evaluation.note)}
                              </div>
                              <span className="text-sm text-gray-600">
                                {format(new Date(evaluation.date_evaluation), 'dd/MM/yyyy')}
                              </span>
                            </div>
                            {evaluation.commentaire && (
                              <p className="mt-2 text-gray-600">{evaluation.commentaire}</p>
                            )}
                          </div>
                        ))
                      ) : (
                        <div className="text-center text-gray-500">
                          Aucune évaluation disponible
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PropertyDetail;
