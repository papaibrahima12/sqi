
import { useNavigate } from "react-router-dom";
import { Property } from "@/types/property";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Plus, ArrowLeft, Pencil, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import PropertyForm from "@/components/property/PropertyForm";
import { PropertyCard } from "@/components/property/PropertyCard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
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
import React, {useState} from "react";
import { AvailabilityCalendar } from "@/components/property/AvailabilityCalendar";
import { useToast } from "@/hooks/use-toast";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select.tsx";

const propertySchema = z.object({
  libelle: z.string().min(1, "Le libellé est requis"),
  description: z.string().nullable(),
  price: z.number().min(0, "Le prix doit être positif"),
});

type Residence = "Hann Mariste" | "Sacré cœur" |"all" ;

export const PropertyTable = () => {
  const [selectedResidence, setSelectedResidence] = useState<Residence>("all");
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [open, setOpen] = React.useState(false);
  const [selectedProperty, setSelectedProperty] = React.useState<Property | null>(null);
  const [editMode, setEditMode] = React.useState(false);

  const form = useForm<z.infer<typeof propertySchema>>({
    resolver: zodResolver(propertySchema),
  });

  const { data: properties, isLoading } = useQuery({
    queryKey: ['properties', selectedResidence],
    queryFn: async () => {
      const query = supabase
        .from('bien')
        .select(`
          *,
          residence (
            id,
            nom
          ),
          photos:photo (
            id,
            url
          )
        `);

      const { data, error } = await query;
      if (error) throw error;

      const filteredData = selectedResidence === "all"
          ? data
          : data.filter(property => property.residence.nom === selectedResidence);

      console.log("Données filtrées :", filteredData);

      return filteredData as Property[];
      },
  });

  const handleBack = () => {
    setSelectedProperty(null);
    setEditMode(false);
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !selectedProperty) return;

    const fileExt = file.name.split('.').pop();
    const filePath = `${Math.random()}.${fileExt}`;

    try {
      // 1. Upload the file to storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('property_images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // 2. Get the public URL
      const { data: { publicUrl } } = supabase.storage
        .from('property_images')
        .getPublicUrl(filePath);

      // 3. Insert a new record in the photo table
      const { data: photoData, error: photoError } = await supabase
        .from('photo')
        .insert({
          bien_id: selectedProperty.id,
          url: publicUrl
        })
        .select()
        .single();

      if (photoError) throw photoError;

      // 4. Refresh the properties query to show the new image
      queryClient.invalidateQueries({ queryKey: ['properties'] });

    } catch (error) {
      console.error('Error uploading image:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to upload image"
      });
    }
  };

  const handleImageDelete = async (photoId: number, photoUrl: string) => {
    if (!selectedProperty) return;

    try {
      // 1. Delete the record from the photo table
      const { error: deletePhotoError } = await supabase
        .from('photo')
        .delete()
        .eq('id', photoId);

      if (deletePhotoError) throw deletePhotoError;

      // 2. Delete the file from storage
      const fileName = photoUrl.split('/').pop();
      if (fileName) {
        const { error: deleteStorageError } = await supabase.storage
          .from('property_images')
          .remove([fileName]);

        if (deleteStorageError) throw deleteStorageError;
      }

      // 3. Refresh the properties query
      queryClient.invalidateQueries({ queryKey: ['properties'] });

    } catch (error) {
      console.error('Error deleting image:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete image"
      });
    }
  };

  const onSubmit = async (data: z.infer<typeof propertySchema>) => {
    try {
      const { error } = await supabase
        .from('bien')
        .update(data)
        .eq('id', selectedProperty?.id);

      if (error) throw error;

      toast({
        title: "Bien modifié avec succès",
        description: "Les informations du bien ont été mises à jour",
      });

      queryClient.invalidateQueries({ queryKey: ['properties'] });
      setEditMode(false);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Une erreur est survenue lors de la modification du bien",
      });
    }
  };

  if (isLoading) {
    return <div>Chargement...</div>;
  }

  const handlePropertyCreated = () => {
    setOpen(false);
    queryClient.invalidateQueries({ queryKey: ['properties'] });
  };

  const handleResidenceChange = (value: string) => {
    setSelectedResidence(value as Residence);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-sqi-black">Liste des biens</h1>
        <Select value={selectedResidence} onValueChange={handleResidenceChange}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filtrer par disponibilité" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes les résidences</SelectItem>
            <SelectItem value="Hann Mariste">Hann Mariste</SelectItem>
            <SelectItem value="Sacré cœur">Sacré cœur</SelectItem>
          </SelectContent>
        </Select>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" /> Nouveau bien
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Créer un nouveau bien</DialogTitle>
              <DialogDescription>
                Remplissez les informations ci-dessous pour créer un nouveau bien immobilier.
              </DialogDescription>
            </DialogHeader>
            <PropertyForm
                onSuccess={handlePropertyCreated}
                isOpen={(value) => setOpen(value)}
            />
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {properties?.map((property) => (
          <PropertyCard
            key={property.id}
            id={property.id}
            type={property.type_transaction}
            title={property.libelle}
            price={property.price}
            prix_journalier={property.prix_journalier}
            location={property.residence?.nom.toLowerCase().replace(/[\s-]/g, "-") as any}
            details={property.description || ""}
            imageUrl={property.photos?.[0]?.url || "/placeholder.svg"}
            isDashboard
            onSelect={() => setSelectedProperty(property)}
          />
        ))}
      </div>

      {selectedProperty && (
        <Dialog open={!!selectedProperty} onOpenChange={(open) => !open && handleBack()}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader className="flex flex-row items-center gap-4">
              <Button 
                variant="ghost" 
                size="icon"
                onClick={handleBack}
                className="h-8 w-8 p-0"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <DialogTitle className="flex-1">{selectedProperty?.libelle}</DialogTitle>
              <Button 
                variant="outline"
                size="sm"
                onClick={() => setEditMode(!editMode)}
                className="ml-auto"
              >
                <Pencil className="h-4 w-4 mr-2" />
                {editMode ? "Annuler" : "Modifier"}
              </Button>
            </DialogHeader>

            <Tabs defaultValue="details" className="mt-6">
              <TabsList className="grid grid-cols-3 gap-4 mb-6">
                <TabsTrigger value="details">Détails</TabsTrigger>
                <TabsTrigger value="images">Images</TabsTrigger>
                {selectedProperty?.type_transaction === "location" && (
                  <TabsTrigger value="calendar">Disponibilités</TabsTrigger>
                )}
              </TabsList>

              <TabsContent value="details">
                {editMode ? (
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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
                      <FormField
                        control={form.control}
                        name="price"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Prix</FormLabel>
                            <FormControl>
                              <Input type="number" {...field} onChange={(e) => field.onChange(Number(e.target.value))} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Button type="submit">Enregistrer</Button>
                    </form>
                  </Form>
                ) : (
                  <div className="space-y-6">
                    <div>
                      <h3 className="font-semibold mb-2">Description</h3>
                      <p className="text-gray-600">{selectedProperty?.description}</p>
                    </div>
                    <div>
                      <h3 className="font-semibold mb-2">Prix</h3>
                      <p className="text-gray-600">
                        {selectedProperty?.price.toLocaleString()} FCFA/jour
                      </p>
                    </div>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="images">
                <div className="space-y-6">
                  <div className="flex items-center gap-4">
                    <h3 className="font-semibold">Images du bien</h3>
                    <Button variant="outline" size="sm" className="ml-auto" onClick={() => document.getElementById('image-upload')?.click()}>
                      <Plus className="h-4 w-4 mr-2" />
                      Ajouter une image
                    </Button>
                    <input
                      type="file"
                      id="image-upload"
                      accept="image/*"
                      className="hidden"
                      onChange={handleImageUpload}
                    />
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {selectedProperty?.photos?.map((photo) => (
                      <div key={photo.id} className="group relative aspect-video rounded-lg overflow-hidden bg-gray-100">
                        <img 
                          src={photo.url} 
                          alt={`Photo ${photo.id}`}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
                          <Button
                            variant="destructive"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleImageDelete(photo.id, photo.url)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </TabsContent>

              {selectedProperty?.type_transaction === "location" && (
                <TabsContent value="calendar">
                  {selectedProperty && (
                    <AvailabilityCalendar propertyId={selectedProperty.id} />
                  )}
                </TabsContent>
              )}
            </Tabs>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

