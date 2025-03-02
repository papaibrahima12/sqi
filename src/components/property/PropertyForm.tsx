
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { PropertyInsert } from "@/types/property";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ImagePlus, Loader2, X } from "lucide-react";
import {
  Form,
  FormControl,
  FormDescription,
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
import { Textarea } from "@/components/ui/textarea";

const formSchema = z.object({
  libelle: z.string().min(1, "Le libellé est requis"),
  type_bien: z.enum(["maison", "appartement", "terrain", "bureau"]),
  surface: z.string().min(1, "La surface est requise"),
  price: z.string().optional(),
  prix_journalier: z.string().optional(),
  type_transaction: z.enum(["vente", "location"]),
  description: z.string().optional(),
  residence_id: z.string().optional(),
  nb_pieces: z.string().optional(),
});

interface PropertyFormProps {
  onSuccess?: () => void;
  isOpen?: (value: boolean) => void; // Corrected type definition
}

export default function PropertyForm({ onSuccess, isOpen }: PropertyFormProps) {
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [residences, setResidences] = useState<{ id: number; nom: string }[]>([]);
  const [uploadedImages, setUploadedImages] = useState<{ url: string; file: File }[]>([]);
  const [uploading, setUploading] = useState(false);

  const fetchResidences = async () => {
    const { data, error } = await supabase
      .from('residence')
      .select('id, nom');
    
    if (error) {
      console.error('Error fetching residences:', error);
      return;
    }
    
    setResidences(data || []);
  };

  useEffect(() => {
    fetchResidences();
  }, []);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      libelle: "",
      type_bien: "maison",
      surface: "",
      price: "",
      prix_journalier: "",
      type_transaction: "vente",
      description: "",
      residence_id: "",
      nb_pieces: "",
    },
  });

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    setUploading(true);
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;

        setUploadedImages(prev => [...prev, { url: URL.createObjectURL(file), file }]);
      }
    } catch (error) {
      console.error('Error handling image upload:', error);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Une erreur est survenue lors du téléchargement des images",
      });
    } finally {
      setUploading(false);
    }
  };

  const removeImage = (index: number) => {
    setUploadedImages(prev => prev.filter((_, i) => i !== index));
  };

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      setLoading(true);
      const reference = Math.random().toString(36).substring(2, 8).toUpperCase();
      const { data: propertyData, error: propertyError } = await supabase.from("bien").insert({
        libelle: values.libelle,
        type_bien: values.type_bien,
        surface: parseFloat(values.surface),
        description: values.description || null,
        nb_pieces: values.nb_pieces ? parseInt(values.nb_pieces) : null,
        price: parseFloat(values.price),
        prix_journalier: values.prix_journalier ? parseFloat(values.prix_journalier) : null,
        residence_id: values.residence_id && values.residence_id !== "none" ? parseInt(values.residence_id) : null,
        reference: reference,
        statut: "disponible",
        type_transaction: values.type_transaction,
        etat: "propre",
      } as PropertyInsert).select().single();

      if (propertyError) throw propertyError;

      if (uploadedImages.length > 0) {
        for (const { file } of uploadedImages) {
          const fileExt = file.name.split('.').pop();
          const fileName = `${Math.random()}.${fileExt}`;

          const { error: uploadError } = await supabase.storage
            .from('property_images')
            .upload(fileName, file);

          if (uploadError) throw uploadError;

          const { data: { publicUrl } } = supabase.storage
            .from('property_images')
            .getPublicUrl(fileName);

          const { error: photoError } = await supabase
            .from('photo')
            .insert({
              bien_id: propertyData.id,
              url: publicUrl,
            });

          if (photoError) throw photoError;
        }
      }

      toast({
        title: "Bien créé avec succès",
        description: `Le bien a été créé avec la référence ${reference}`,
      });

      await queryClient.invalidateQueries({queryKey: ['properties']});
      if (onSuccess) {
        onSuccess();
      } else {
        navigate("/dashboard/biens");
      }
    } catch (error) {
      console.error("Error:", error);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Une erreur est survenue lors de la création du bien",
      });
    } finally {
      setLoading(false);
    }
  };

  const showPriceJournalier = form.watch("type_transaction") === "location";
  const showPriceVente = form.watch("type_transaction") === "vente";

  return (
    <Card className="p-6">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField
              control={form.control}
              name="libelle"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Libellé</FormLabel>
                  <FormControl>
                    <Input placeholder="Libellé du bien" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="type_bien"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Type de bien</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner un type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="maison">Maison</SelectItem>
                      <SelectItem value="appartement">Appartement</SelectItem>
                      <SelectItem value="terrain">Terrain</SelectItem>
                      <SelectItem value="bureau">Bureau</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

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

            <FormField
              control={form.control}
              name="type_transaction"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Type de transaction</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner un type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="vente">Vente</SelectItem>
                      <SelectItem value="location">Location</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {showPriceVente &&
                <FormField
                    control={form.control}
                    name="price"
                    render={({ field }) => (
                        <FormItem>
                          <FormLabel>Prix de vente</FormLabel>
                          <FormControl>
                            <Input type="number" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                    )}
                />
            }

            {showPriceJournalier && (
              <FormField
                control={form.control}
                name="prix_journalier"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Prix journalier</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="residence_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Résidence</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner une résidence" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="none">Aucune</SelectItem>
                      {residences.map((residence) => (
                        <SelectItem key={residence.id} value={residence.id.toString()}>
                          {residence.nom}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Sélectionnez la résidence où se trouve le bien
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Description</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Description du bien"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="space-y-4">
            <div>
              <FormLabel>Images</FormLabel>
              <div className="mt-2">
                <label htmlFor="images" className="cursor-pointer">
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 flex flex-col items-center justify-center">
                    <ImagePlus className="h-8 w-8 text-gray-400" />
                    <span className="mt-2 text-sm text-gray-600">
                      Cliquez pour ajouter des images
                    </span>
                    <input
                      type="file"
                      id="images"
                      multiple
                      accept="image/*"
                      className="hidden"
                      onChange={handleImageUpload}
                      disabled={uploading}
                    />
                  </div>
                </label>
              </div>
              
              {uploadedImages.length > 0 && (
                <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                  {uploadedImages.map((image, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={image.url}
                        alt={`Preview ${index + 1}`}
                        className="h-24 w-full object-cover rounded-lg"
                      />
                      <button
                        type="button"
                        onClick={() => removeImage(index)}
                        className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end space-x-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => isOpen && isOpen(false)}
              disabled={loading}
            >
              Annuler
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Création...
                </>
              ) : (
                "Créer"
              )}
            </Button>
          </div>
        </form>
      </Form>
    </Card>
  );
}
