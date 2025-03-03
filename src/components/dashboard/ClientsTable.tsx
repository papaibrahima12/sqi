import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select.tsx";
import {useNavigate} from "react-router-dom";

type Client = {
    id: number;
    nom: string;
    prenom: string;
    email: string;
    telephone: string;
    created_at: string;
};


export function ClientsTable() {
    const navigate = useNavigate();

    const { data: clients} = useQuery({
        queryKey: ["clients"],
        queryFn: async () => {
            const query = supabase
                .from("client")
                .select('*')
                .order("created_at", { ascending: false });

            const { data, error } = await query;

            if (error) throw error;
            return data as Client[];
        },
    });

    const handleRowClick = (clientId: number) => {
        navigate(`/dashboard/locataires/${clientId}`);
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold">Liste des Clients</h2>
                {/*<Select value={selectedStatus} onValueChange={handleStatusChange}>*/}
                {/*    <SelectTrigger className="w-[180px]">*/}
                {/*        <SelectValue placeholder="Filtrer par statut" />*/}
                {/*    </SelectTrigger>*/}
                {/*    <SelectContent>*/}
                {/*        <SelectItem value="all">Tous les types</SelectItem>*/}
                {/*        <SelectItem value="vente">Vente</SelectItem>*/}
                {/*        <SelectItem value="location">Location</SelectItem>*/}
                {/*    </SelectContent>*/}
                {/*</Select>*/}
            </div>
            <div className="border rounded-lg">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Prénom</TableHead>
                            <TableHead>Nom</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Telephone</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {clients?.map((client) => (
                            <TableRow
                                key={client.id}
                                onClick={() => handleRowClick(client.id)}
                                className="hover:bg-gray-100 cursor-pointer"
                            >
                                <TableCell>
                                    {client.prenom}
                                </TableCell>
                                <TableCell>
                                    {client.nom}
                                </TableCell>
                                <TableCell>
                                    {client.email}
                                </TableCell>
                                <TableCell>
                                    {client.telephone}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
