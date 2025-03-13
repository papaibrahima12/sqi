import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Check, X, Calendar, Info, Upload, FileText, Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import * as React from "react";

type Request = {
  id: number;
  nom: string;
  prenom: string;
  email: string;
  telephone: string;
  type_demande: "location" | "vente";
  statut: "en_attente" | "approuve" | "refuse";
  statut_vente: "nouveau" | "qualification" | "offre" | "negociation" | "gagnee" | "perdue" | null;
  motif_perte: string | null;
  piece: string | null;
  bien: {
    id: number;
    libelle: string;
    price: number;
    prix_journalier: number;
  } | null;
  commentaire: string | null;
  created_at: string;
  date_debut_location: string | null;
  date_fin_location: string | null;
  forfait: string | null;
};

type Client = {
  id: number;
  nom: string;
  prenom: string;
  email: string;
  telephone: string;
};

type RequestStatus = "vente" | "location" | "all";

export function RequestTable() {
  const { toast } = useToast();
  const [selectedStatus, setSelectedStatus] = useState<RequestStatus>("all");
  const [selectedRequest, setSelectedRequest] = useState<Request | null>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [showMotifDialog, setshowMotifDialog] = useState(false);
  const [visitDate, setVisitDate] = useState<string>("");
  const [visitScheduled, setVisitScheduled] = useState(false);
  const [motifPerte, setMotifPerte] = useState<string>("");
  const [idDocument, setIdDocument] = useState<File | null>(null);
  const [tempVenteStatus, setTempVenteStatus] = useState<Request["statut_vente"] | null>(null);
  const [currentSalesStatus, setCurrentSalesStatus] = useState<Request["statut_vente"] | null>(null);
  const [isStatusUpdating, setIsStatusUpdating] = useState(false);
  const [showVisitDateField, setShowVisitDateField] = useState(false);
  const [showMotifPerteField, setShowMotifPerteField] = useState(false);
  const [showIdDocumentField, setShowIdDocumentField] = useState(false);

  const { data: requests, refetch } = useQuery({
    queryKey: ["requests", selectedStatus],
    queryFn: async () => {
      let query = supabase
        .from("demande")
        .select(`
          *,
          bien (
            id,
            libelle,
            price,
            prix_journalier
          )
        `)
        .order("created_at", { ascending: false });

      if (selectedStatus !== "all") {
        query = query.eq("type_demande", selectedStatus);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as Request[];
    },
  });

  const resetFormStates = () => {
    setVisitDate("");
    setVisitScheduled(false);
    setMotifPerte("");
    setIdDocument(null);
    setShowVisitDateField(false);
    setShowMotifPerteField(false);
    setShowIdDocumentField(false);
  };

  useEffect(() => {
    if (selectedRequest) {
      setCurrentSalesStatus(selectedRequest.statut_vente);
      
      if (selectedRequest.commentaire && selectedRequest.commentaire.includes("Date de visite programmée")) {
        setVisitScheduled(true);
      } else {
        setVisitScheduled(false);
      }
      
      resetFormStates();
    }
  }, [selectedRequest]);

  useEffect(() => {
    if (currentSalesStatus) {
      setShowVisitDateField(currentSalesStatus === "negociation");
      setShowMotifPerteField(currentSalesStatus === "perdue");
      setShowIdDocumentField(currentSalesStatus === "gagnee");
    }
  }, [currentSalesStatus]);

  const handleIdDocumentChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const request = selectedRequest;

    if (!request || !request.id) {
      toast({
        title: "Erreur",
        description: "Aucune demande sélectionnée",
        variant: "destructive",
      });
      return;
    }

    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.type !== 'application/pdf') {
        toast({
          title: "Format invalide",
          description: "Veuillez sélectionner un fichier PDF",
          variant: "destructive",
        });
        return;
      }

      try {
        const fileName = `${request.id}_${crypto.randomUUID()}.pdf`;

        const { error: uploadError } = await supabase.storage
            .from('piece_identite')
            .upload(fileName, file);

        if (uploadError) {
          toast({
            title: "Erreur d'upload",
            description: uploadError.message,
            variant: "destructive",
          });
          return;
        }

        const { data: { publicUrl } } = supabase.storage
            .from('piece_identite')
            .getPublicUrl(fileName);

        const { error: reqError } = await supabase
            .from('demande')
            .update({
              piece: publicUrl,
              statut_vente: 'gagnee'
            })
            .eq('id', request.id);

        if (reqError) {
          console.error('Mise à jour error:', reqError);
          toast({
            title: "Erreur de mise à jour",
            description: reqError.message,
            variant: "destructive",
          });
          return;
        }

        const { error: bienError } = await supabase
            .from('bien')
            .update({
              statut: "vendu",
            })
            .eq('id', request.bien.id);

          if (bienError) {
              console.error('Mise à jour error:', reqError);
              toast({
                title: "Erreur de mise à jour",
                description: bienError.message,
                variant: "destructive",
              });
              return;
          }

        setSelectedRequest(prev => {
          if (!prev) return null;
          return {
            ...prev,
            piece: publicUrl
          };
        });

        setIdDocument(file);
        toast({
          title: "Document téléchargé",
          description: "La pièce d'identité a été téléchargée avec succès et la vente a bien été cloturée",
        });
        await refetch();
        setShowDetailsDialog(false);
        window.location.reload();
        
      } catch (error) {
        console.error("Erreur lors du téléchargement du document:", error);
        toast({
          title: "Erreur",
          description: "Erreur lors du téléchargement de la pièce d'identité",
          variant: "destructive",
        });
      }
    }
  };


  const handleUploadPiece = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const request = selectedRequest;

    if (!request || !request.id) {
      toast({
        title: "Erreur",
        description: "Aucune demande sélectionnée",
        variant: "destructive",
      });
      return;
    }

    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.type !== 'application/pdf') {
        toast({
          title: "Format invalide",
          description: "Veuillez sélectionner un fichier PDF",
          variant: "destructive",
        });
        return;
      }

      try {
        const fileName = `${request.id}_${crypto.randomUUID()}.pdf`;

        const { error: uploadError } = await supabase.storage
            .from('piece_identite')
            .upload(fileName, file);

        if (uploadError) {
          console.error('Upload error:', uploadError);
          toast({
            title: "Erreur d'upload",
            description: uploadError.message,
            variant: "destructive",
          });
          return;
        }

        const { data: { publicUrl } } = supabase.storage
            .from('piece_identite')
            .getPublicUrl(fileName);

        const { error: reqError } = await supabase
            .from('demande')
            .update({
              piece: publicUrl,
            })
            .eq('id', request.id);

        if (reqError) {
          console.error('Mise à jour error:', reqError);
          toast({
            title: "Erreur de mise à jour",
            description: reqError.message,
            variant: "destructive",
          });
          return;
        }

        setIdDocument(file);

      } catch (error) {
        console.error("Erreur lors du téléchargement du document:", error);
        toast({
          title: "Erreur",
          description: "Erreur lors du téléchargement de la pièce d'identité",
          variant: "destructive",
        });
      }
    }
  };

  const viewDocument = async (request: Request) => {
    try {
      const { data: demande, error: requestError } = await supabase
        .from("demande")
        .select("*")
        .eq("id", request.id)
        .single();

      if (requestError) throw requestError;

      if (!demande?.piece) {
        toast({
          title: "Document non disponible",
          description: "Aucun document n'a été téléchargé pour cette demande",
          variant: "destructive",
        });
        return;
      }

      window.open(demande.piece, '_blank');
    } catch (error) {
      console.error("Erreur lors de l'accès au document:", error);
      toast({
        title: "Erreur",
        description: "Une erreur est survenue lors de l'accès au document",
        variant: "destructive",
      });
    }
  };

  const generateSalesContract = async (request: Request) => {
    try {
      if (!request.bien) {
        throw new Error("Information du bien manquante");
      }

      const response = await supabase.functions.invoke('create-sales-contract', {
        body: {
          demande: {
            ...request,
            property: request.bien
          }
        }
      });

      if (response.error) throw response.error;

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

  const updateSalesStatus = async (request: Request, newStatus: Request["statut_vente"]) => {
    try {

      setSelectedRequest((prev) => ({
        ...prev,
        statut_vente: newStatus,
        motif_perte: newStatus === "perdue" ? motifPerte : null,
      }));

      const updates: { statut_vente: Request["statut_vente"]; motif_perte?: string | null } = {
        statut_vente: newStatus,
      };

      if (newStatus === "perdue") {
        setTempVenteStatus("perdue")
        if (!motifPerte) {
          toast({
            title: "Motif requis",
            description: "Veuillez saisir un motif de perte",
            variant: "destructive",
          });
          return;
        }
        updates.motif_perte = motifPerte;
        setShowDetailsDialog(false);
        const { error } = await supabase
          .from("demande")
          .update(updates)
          .eq("id", request.id);

      if (error) {
        throw error;
      }
        await refetch();
      }

      if (newStatus === "gagnee") {
        setTempVenteStatus("gagnee");
        if (!idDocument) {
          toast({
            title: "Pièce d'identité requise",
            description: "Veuillez charger la pièce d'identité.",
            variant: "destructive",
          });
          return;
        }
        setShowDetailsDialog(false);
        const { error } = await supabase
          .from("demande")
          .update(updates)
          .eq("id", request.id);

      if (error) {
        throw error;
      }
      await refetch();
      }

      if (newStatus === "negociation") {
        setTempVenteStatus("negociation")
        if (!visitDate) {
          toast({
            title: "Date de visite requise",
            description: "Veuillez sélectionner une date de visite.",
            variant: "destructive",
          });
          return;
        }
        const { error } = await supabase
          .from("demande")
          .update(updates)
          .eq("id", request.id);

      if (error) {
        throw error;
      }
        setShowDetailsDialog(false);
      }

      const { error } = await supabase
          .from("demande")
          .update(updates)
          .eq("id", request.id);

      if (error) {
        throw error;
      }

      toast({
        title: "Statut mis à jour",
        description: "Le statut a été mis à jour avec succès.",
      });

      setShowDetailsDialog(false);
      await refetch();
      setMotifPerte("");
      setSelectedRequest(null);
    } catch (error) {
      console.error("Erreur lors de la mise à jour du statut:", error);
      toast({
        title: "Erreur",
        description: "Une erreur est survenue lors de la mise à jour.",
        variant: "destructive",
      });
    }
  };

  const handleStatusUpdate = async (request: Request, newStatus: "approuve" | "refuse") => {
    try {
      switch (newStatus) {
        case "approuve": {
          // if (!request.commentaire) {
          //   toast({
          //     title: "Visite requise",
          //     description: "Veuillez d'abord programmer une visite avant d'approuver la demande",
          //     variant: "destructive",
          //   });
          //   return;
          // }
  
          if (!idDocument && !request.piece) {
            toast({
              title: "Document requis",
              description: "Veuillez charger une pièce d'identité avant d'approuver la demande",
              variant: "destructive",
            });
            return;
          }
  
          const {error: updateError} = await supabase
            .from("demande")
            .update({
              statut: newStatus
            })
            .eq("id", request.id);
  
          if (updateError) throw updateError;
  
          const {data: existingClients, error: existLocError} = await supabase
            .from('client')
            .select('*')
            .eq('email', request.email);
  
          if (existLocError) throw existLocError;
  
          let clientId = null;
          
          if (existingClients && existingClients.length > 0) {
            const existLoc = existingClients[0];
            clientId = existLoc.id;
            
            const {error: locationError} = await supabase
              .from("location")
              .insert({
                bien_id: request.bien.id,
                demande_id: request.id,
                date_debut: request.date_debut_location,
                date_fin: request.date_fin_location,
                client_id: clientId,
                contrat_signe: true,
                cni_url: request.piece,
                date_signature: new Date().toISOString(),
                statut: 'en_cours',
                forfait: request.forfait,
              });
  
            if (locationError) {
              toast({
                title: "Erreur",
                description: "Erreur lors de la création de la location",
                variant: "destructive",
              });
              throw locationError;
            }
          } else {
            const {data: newClientData, error: clientError} = await supabase
              .from("client")
              .insert({
                prenom: request.prenom,
                nom: request.nom,
                email: request.email,
                adresse: '',
                telephone: request.telephone,
              })
              .select();
  
            if (clientError) throw clientError;
  
            if (newClientData && newClientData.length > 0) {
              clientId = newClientData[0].id;
            } else {
              throw new Error("Impossible de créer un nouveau client");
            }
  
            const {error: locationError} = await supabase
              .from("location")
              .insert({
                bien_id: request.bien.id,
                demande_id: request.id,
                date_debut: request.date_debut_location,
                date_fin: request.date_fin_location,
                client_id: clientId,
                contrat_signe: true,
                cni_url: request.piece,
                date_signature: new Date().toISOString(),
                statut: 'en_cours',
                forfait: request.forfait,
              });
  
            if (locationError) {
              toast({
                title: "Erreur",
                description: "Erreur lors de la création de la location",
                variant: "destructive",
              });
              throw locationError;
            }
          }
  
          const {error: bienError} = await supabase
            .from("bien")
            .update({statut: "occupe"})
            .eq("id", request.bien.id);
  
          if (bienError) throw bienError;
          
          toast({
            title: "Demande approuvée",
            description: "Le statut de la demande a été mis à jour avec succès.",
          });
          await refetch();
          setShowDetailsDialog(false);
          setSelectedRequest(null);
          setVisitDate("");
          setVisitScheduled(false);
        }
        break;
  
        case "refuse": {
          if(!motifPerte){
            toast({
              title: "Motif requis",
              description: "Veuillez saisir un motif de refus",
              variant: "destructive",
            });
            return;
          }
  
          const {error: updateError} = await supabase
            .from("demande")
            .update({
              statut: 'refuse',
              motif_perte: motifPerte
            })
            .eq("id", request.id);
  
          if (updateError) throw updateError;
  
          toast({
            title: "Statut mis à jour",
            description: "La demande a été annulée avec succès.",
          });
          setshowMotifDialog(false);
          setShowDetailsDialog(false);
          setSelectedRequest(null);
          await refetch();
        }
        break;
      }
    } catch (error) {
      console.error("Erreur lors de la mise à jour du statut:", error);
      toast({
        title: "Erreur",
        description: "Une erreur est survenue lors de la mise à jour du statut",
        variant: "destructive",
      });
    }
  };

  const handleStatusChange = (value: string) => {
    setSelectedStatus(value as RequestStatus);
  };

  const handleScheduleVisit = async (request: Request) => {
    if (!visitDate) {
      toast({
        title: "Date requise",
        description: "Veuillez sélectionner une date pour la visite",
        variant: "destructive",
      });
      return;
    }

    if(request.type_demande === 'location' && visitDate > request.date_debut_location){
      toast({
        title: "Date invalide",
        description: "La date de visite doit être antérieure à la date de début de la location",
        variant: "destructive",
      });
      return;
    }

    setVisitScheduled(true);

    const {error: fetchError} = await supabase
        .from('demande')
        .select('commentaire')
        .eq('id', request.id)
        .single();

    if (fetchError) throw fetchError;

    const newComment = `Date de visite programmée : ${format(new Date(visitDate), 'dd/MM/yyyy')}`;

    if(request.type_demande==="vente"){
      const {error: updateError} = await supabase
        .from("demande")
        .update({
          statut_vente: 'negociation',
          commentaire: newComment
        })
        .eq("id", request.id);

    if (updateError) throw updateError;
      toast({
        title: "Visite programmée",
        description: `La visite a été programmée pour le ${format(new Date(visitDate), 'dd/MM/yyyy')}`,
      });
      setShowDetailsDialog(false);
      await refetch();
    }

    const {error: updateError} = await supabase
        .from("demande")
        .update({
          commentaire: newComment
        })
        .eq("id", request.id);

    if (updateError) throw updateError;

    toast({
      title: "Visite programmée",
      description: `La visite a été programmée pour le ${format(new Date(visitDate), 'dd/MM/yyyy')}`,
    });

    await refetch();
  };

  const handleViewDetails = (request: Request) => {
    setSelectedRequest(request);
    setShowDetailsDialog(true);
    setMotifPerte(request.motif_perte || "");
  };

  const getStatusColor = (status: Request["statut_vente"]) => {
    switch (status) {
      case "nouveau":
        return "bg-blue-100 text-blue-800";
      case "qualification":
        return "bg-purple-100 text-purple-800";
      case "offre":
        return "bg-yellow-100 text-yellow-800";
      case "negociation":
        return "bg-orange-100 text-orange-800";
      case "gagnee":
        return "bg-green-100 text-green-800";
      case "perdue":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Liste des demandes</h2>
        <Select value={selectedStatus} onValueChange={handleStatusChange}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filtrer par statut" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les types</SelectItem>
            <SelectItem value="vente">Vente</SelectItem>
            <SelectItem value="location">Location</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Bien</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {requests?.map((request) => (
              <TableRow key={request.id}>
                <TableCell>
                  {format(new Date(request.created_at), "dd/MM/yyyy")}
                </TableCell>
                <TableCell>
                  {request.prenom} {request.nom}
                </TableCell>
                <TableCell>
                  <div>
                    <div>{request.email}</div>
                    <div className="text-sm text-gray-500">{request.telephone}</div>
                  </div>
                </TableCell>
                <TableCell className="capitalize">
                  {request.type_demande === "location" ? "Location" : "Vente"}
                </TableCell>
                <TableCell>{request.bien?.libelle || "N/A"}</TableCell>
                <TableCell>
                  {request.type_demande === "vente" && request.statut_vente ? (
                    <span
                      className={`inline-block px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(
                        request.statut_vente
                      )}`}
                    >
                      {request.statut_vente.charAt(0).toUpperCase() + request.statut_vente.slice(1)}
                    </span>
                  ) : (
                    <span
                      className={`inline-block px-2 py-1 text-xs font-semibold rounded-full ${
                        request.statut === "approuve"
                          ? "bg-green-100 text-green-800"
                          : request.statut === "refuse"
                          ? "bg-red-100 text-red-800"
                          : "bg-yellow-100 text-yellow-800"
                      }`}
                    >
                      {request.statut === "approuve"
                        ? "Approuvé"
                        : request.statut === "refuse"
                        ? "Refusé"
                        : "En attente"}
                    </span>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                      onClick={() => handleViewDetails(request)}
                    >
                      <Info className="w-4 h-4" />
                    </Button>
                    {request.statut === "approuve" && request.type_demande === "location" && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-purple-600 hover:text-purple-700 hover:bg-purple-50"
                          onClick={() => viewDocument(request)}
                        >
                          <FileText className="w-4 h-4" />
                        </Button>
                      </>
                    )}
                    {/* {request.statut === "en_attente" && request.type_demande !== "vente" && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-green-600 hover:text-green-700 hover:bg-green-50"
                          onClick={() => handleStatusUpdate(request, "approuve")}
                        >
                          <Check className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => setshowMotifDialog(true)}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </>
                    )} */}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="sm:max-w-[1000px]">
          <DialogHeader>
            <DialogTitle>Détails de la demande</DialogTitle>
            {selectedRequest?.type_demande === "location" && (
                <>
                  <span
                    className={`inline-block px-2 py-1 text-xs font-bolds rounded-full ${selectedRequest.statut === "approuve"
                        ? "font-bold text-green-800"
                        : selectedRequest.statut === "refuse"
                            ? "font-bold text-red-800"
                            : "font-bold text-yellow-800"}`}
                >
                              {selectedRequest.statut === "approuve"
                                  ? "Approuvé"
                                  : selectedRequest.statut === "refuse"
                                      ? "Refusé"
                                      : "En attente"}
                          </span>
                  <>
                  <DialogDescription>
                    Veuillez programmer une visite et charger une pièce d'identité avant d'approuver la demande de
                    location
                  </DialogDescription>
                </>
                </>
            )}
          </DialogHeader>

          {selectedRequest && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Client</label>
                  <p className="mt-1">{selectedRequest.prenom} {selectedRequest.nom}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Contact</label>
                  <p className="mt-1">{selectedRequest.telephone}</p>
                  <p className="text-sm text-gray-500">{selectedRequest.email}</p>
                </div>
              </div>

              {selectedRequest.type_demande === "vente" && (
                <div className="space-y-4">
                  <div>
                    <Label>Statut de la demande</Label>
                    <Select
                        disabled={selectedRequest.statut_vente === "gagnee" || selectedRequest.statut_vente === "perdue"}
                        value={selectedRequest.statut_vente}
                        onValueChange={(value) => updateSalesStatus(selectedRequest, value as Request["statut_vente"])}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="nouveau">Nouveau</SelectItem>
                        <SelectItem value="qualification">Qualification</SelectItem>
                        <SelectItem value="offre">Offre</SelectItem>
                        <SelectItem value="negociation">Négociation</SelectItem>
                        <SelectItem value="gagnee">Gagnée</SelectItem>
                        <SelectItem value="perdue">Perdue</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {selectedRequest.statut_vente === "perdue" && (
                    <div className="space-y-4">
                      <Label>Motif de la perte</Label>
                      <Textarea
                        placeholder="Saisissez le motif de la perte..."
                        value={motifPerte}
                        onChange={(e) => setMotifPerte(e.target.value)}
                      />
                      <div>
                        <Button
                            variant="secondary"
                            className="shrink-0 bg-red-600"
                        >
                          <Check className="w-4 h-4" />
                          Fermer
                        </Button>
                      </div>
                    </div>

                  )}
                  {selectedRequest.type_demande=== 'vente' && tempVenteStatus === "negociation" && (
                      <div className="space-y-2">
                        <Label>Programmer une visite des lieux</Label>
                        <div className="flex gap-2">
                          <Input
                              type="date"
                              min={format(new Date(), 'yyyy-MM-dd')}
                              value={visitDate}
                              onChange={(e) => setVisitDate(e.target.value)}
                          />
                          <Button
                              variant="secondary"
                              className="shrink-0"
                              onClick={() => handleScheduleVisit(selectedRequest)}
                          >
                            <Calendar className="mr-2 h-4 w-4" />
                            Fixer RDV
                          </Button>
                        </div>
                      </div>
                  )}

                      <>
                        <div className="space-y-2">
                          <div className="flex gap-2 items-center">
                            {selectedRequest.statut_vente === "gagnee" && selectedRequest.piece && (
                                <>
                                  <div className="flex flex-col space-y-2">
                                    <p className="font-semibold">Pièce d'identité</p>
                                    <a
                                        href={selectedRequest.piece}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-blue-600 hover:underline"
                                    >
                                      Voir la pièce d'itentité
                                    </a>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="text-green-600 hover:text-green-700 hover:bg-green-50"
                                        onClick={() => generateSalesContract(selectedRequest)}
                                    >
                                      Générer contrat
                                    </Button>
                                  </div>
                                  </>
                            )}
                            {tempVenteStatus==="gagnee" && (
                                <><>
                                  <Input
                                      id="idDocument"
                                      type="file"
                                      required
                                      accept=".pdf"
                                      onChange={handleIdDocumentChange}/>
                                  <span className="text-sm text-green-600">Document sélectionné</span></>
                                  <p className="text-sm text-gray-500">
                                    Formats acceptés : PDF (carte d'identité ou passeport)
                                  </p></>
                            )}
                          </div>
                        </div>
                        </>
                </div>
              )}

              {selectedRequest.type_demande === "location" && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-500">Date de début</label>
                      <p className="mt-1">
                        {selectedRequest.date_debut_location ?
                          format(new Date(selectedRequest.date_debut_location), "dd/MM/yyyy") :
                          "Non spécifiée"}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Date de fin</label>
                      <p className="mt-1">
                        {selectedRequest.date_fin_location ?
                          format(new Date(selectedRequest.date_fin_location), "dd/MM/yyyy") :
                          "Non spécifiée"}
                      </p>
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-500">Forfait</label>
                    <p className="mt-1">{selectedRequest.forfait || "Non spécifié"}</p>
                  </div>

                  {
                    selectedRequest.motif_perte && (
                          <div>
                            <label className="text-sm font-medium text-gray-500">Motif de rejet</label>
                            <p className="mt-1">{selectedRequest.motif_perte || ""}</p>
                          </div>
                      )
                  }

                  {!visitScheduled && selectedRequest.statut === "en_attente" && (
                    <div className="space-y-2">
                      <Label>Programmer une visite</Label>
                      <div className="flex gap-2">
                        <Input
                          type="date"
                          min={format(new Date(), 'yyyy-MM-dd')}
                          value={visitDate}
                          onChange={(e) => setVisitDate(e.target.value)}
                        />
                        <Button
                          variant="secondary"
                          className="shrink-0"
                          onClick={() => handleScheduleVisit(selectedRequest)}
                        >
                          <Calendar className="mr-2 h-4 w-4" />
                          Fixer RDV
                        </Button>
                      </div>
                    </div>
                  )}

                  {selectedRequest.statut === "en_attente" && !selectedRequest.piece && (
                    <div className="space-y-2">
                      <Label htmlFor="idDocument">Pièce d'identité (PDF)</Label>
                      <div className="flex gap-2 items-center">
                        <Input
                          id="idDocument"
                          type="file"
                          accept=".pdf"
                          onChange={handleUploadPiece}
                        />
                        {idDocument && (
                          <span className="text-sm text-green-600">
                            Document sélectionné
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500">
                        Formats acceptés : PDF (carte d'identité ou passeport)
                      </p>
                    </div>
                  )}

                  {visitScheduled && selectedRequest.statut === "en_attente" && (
                    <div className="bg-green-50 p-3 rounded-md text-green-700">
                      Visite programmée pour le {format(new Date(visitDate), 'dd/MM/yyyy')}
                    </div>
                  )}
                </div>
              )}

              {selectedRequest.commentaire && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Commentaire</label>
                  <p className="mt-1 whitespace-pre-line">{selectedRequest.commentaire}</p>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            {selectedRequest?.statut === "en_attente" && selectedRequest.type_demande === "location" && (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setshowMotifDialog(true)}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <X className="mr-2 h-4 w-4" />
                  Rejeter
                </Button>
                <Button
                  onClick={() => handleStatusUpdate(selectedRequest, "approuve")}
                  className="text-white bg-green-600 hover:bg-green-700"
                >
                  <Check className="mr-2 h-4 w-4" />
                  Conclure
                </Button>
              </div>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showMotifDialog} onOpenChange={setshowMotifDialog}>
        <DialogContent className="sm:max-w-[1000px]">
          <DialogHeader>
            <DialogTitle>Motif du rejet</DialogTitle>
                    <DialogDescription>
                      Veuillez saisir le motif du rejet de la demande.
                    </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <Label>Motif de la perte</Label>
            <Textarea
                placeholder="Saisissez le motif du rejet de la demande..."
                value={motifPerte}
                onChange={(e) => setMotifPerte(e.target.value)}
            />
          </div>

          <DialogFooter>
                <div className="flex gap-2">
                  <Button
                      onClick={() => setshowMotifDialog(false)}
                      className="text-white bg-black "
                  >
                    Fermer
                  </Button>
                  <Button
                      variant="outline"
                      onClick={() => handleStatusUpdate(selectedRequest, "refuse")}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Check className="mr-2 h-4 w-4" />
                    Confirmer
                  </Button>
                </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
