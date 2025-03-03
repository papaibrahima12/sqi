import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";

type Client = {
    id: number;
    nom: string;
    prenom: string;
    email: string;
    telephone: string;
    created_at: string;
};

export function ClientDetail() {
    const { id } = useParams();
    const navigate = useNavigate();

    const { data: client, isLoading, error } = useQuery({
        queryKey: ["client", id],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("client")
                .select("*")
                .eq("id", parseInt(id))
                .single();

            if (error) throw error;
            return data as Client;
        },
    });

    // Fonction pour retourner à la liste des clients
    const handleBack = () => {
        navigate("/dashboard/locataires");
    };

    if (isLoading) {
        return <div className="flex justify-center items-center min-h-screen">Chargement...</div>;
    }

    if (error) {
        return <div className="text-red-500">Erreur lors du chargement des détails du client.</div>;
    }

    return (
        <div className="container mx-auto py-8">
            <div className="mb-6">
                <Button variant="outline" onClick={handleBack} className="flex items-center gap-2">
                    <ArrowLeft size={16} />
                    Retour à la liste
                </Button>
            </div>

            <h1 className="text-3xl font-bold mb-8">Informations du locataire</h1>

            {client ? (
                <Card className="shadow-md max-w-2xl mx-auto">
                    <CardHeader>
                        <CardTitle className="text-2xl">{client.prenom} {client.nom}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <h3 className="text-sm font-medium text-gray-500">Prénom</h3>
                                <p className="mt-1">{client.prenom}</p>
                            </div>
                            <div>
                                <h3 className="text-sm font-medium text-gray-500">Nom</h3>
                                <p className="mt-1">{client.nom}</p>
                            </div>
                            <div>
                                <h3 className="text-sm font-medium text-gray-500">Email</h3>
                                <p className="mt-1">{client.email}</p>
                            </div>
                            <div>
                                <h3 className="text-sm font-medium text-gray-500">Téléphone</h3>
                                <p className="mt-1">{client.telephone}</p>
                            </div>
                            <div>
                                <h3 className="text-sm font-medium text-gray-500">Date de création</h3>
                                <p className="mt-1">{new Date(client.created_at).toLocaleDateString('fr-FR')}</p>
                            </div>
                        </div>
                    </CardContent>
                    {/*<CardFooter className="flex justify-end gap-2">*/}
                    {/*    <Button variant="outline" onClick={() => navigate(`/clients/${id}/edit`)}>*/}
                    {/*        Modifier*/}
                    {/*    </Button>*/}
                    {/*</CardFooter>*/}
                </Card>
            ) : (
                <div className="text-center">Client non trouvé</div>
            )}
        </div>
    );
}