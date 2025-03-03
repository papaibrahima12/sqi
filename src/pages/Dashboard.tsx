import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { DashboardSidebar } from "@/components/dashboard/Sidebar";
import { Routes, Route, useNavigate } from "react-router-dom";
import { PropertyTable } from "@/components/dashboard/PropertyTable";
import { RequestTable } from "@/components/dashboard/RequestTable";
import { LocationCalendar } from "@/components/dashboard/LocationCalendar";
import {User, Building2, Calendar, FileText, Home} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import PropertyDetail from "@/pages/PropertyDetail";
import PropertyImagesPage from "@/components/property/PropertyImagePage.tsx";
import {ClientsTable} from "@/components/dashboard/ClientsTable.tsx";
import {ClientDetail} from "@/pages/ClientDetail.tsx";
import {differenceInDays, endOfMonth, format, isWithinInterval, parseISO, startOfMonth} from "date-fns";

interface DashboardStats {
  biens: Array<any>;
  locations: Array<{
    id: number;
    bien_id: number;
    date_debut: string;
    date_fin: string;
    statut: string;
    prix?: number;
    bien?: {
      id: number;
      prix_journalier: string
      residence_id?: number;
      residence?: {
        id: number;
        nom: string;
      }
    }
  }>;
  demandes: Array<any>;
  residences: Array<any>;
}
interface ResidenceRentDays {
  nom: string;
  jours: number;
}

const DashboardHome = () => {
  const { data: stats, isLoading, error } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      try {
        const { data: biens, error: biensError } = await supabase
          .from('bien')
          .select(`
            *,
            residence(
              id,
              nom
            ),
            photo(
              id,
              url
            )
          `);

        if (biensError) throw biensError;

        const { data: locations, error: locationsError } = await supabase
          .from('location')
          .select(`
            *,
            bien(
            id,
            libelle,
            type_transaction,
            prix_journalier,
            reference,
            residence(
              id,
              nom
            ),
            client(
              id,
              nom,
              prenom,
              email
              )
          `);
        
        if (locationsError) throw locationsError;

        const { data: demandes, error: demandesError } = await supabase
          .from('demande')
          .select('*');

        if (demandesError) throw demandesError;

        const biensWithPhotos = biens.map(bien => ({
          ...bien,
          photos: bien.photo || []
        }));

        return {
          biens: biensWithPhotos || [],
          locations: locations || [],
          demandes: demandes || []
        };
      } catch (error) {
        console.error('Error fetching dashboard stats:', error);
        throw error;
      }
    },
    retry: 1,
  });

  if (isLoading) {
    return <div className="p-6">Chargement des statistiques...</div>;
  }

  if (error) {
    console.error('Erreur lors du chargement des statistiques:', error);
    return <div className="p-6 text-red-500">Une erreur est survenue lors du chargement des statistiques.</div>;
  }

  const biensDisponibles = stats?.biens.filter(b => b.statut === 'disponible') || [];
  const locationsEnCours = stats?.locations.filter(l => l.statut === 'en_cours') || [];
  const demandesEnAttente = stats?.demandes.filter(d => d.statut === 'en_attente') || [];

  const currentMonthStart = startOfMonth(new Date());
  const currentMonthEnd = endOfMonth(new Date());
  const currentMonthName = format(new Date(), 'MMMM yyyy');
  const calculateDaysRentedPerResidence = (): ResidenceRentDays[] => {
    const residenceRentDays: Record<string, ResidenceRentDays> = {};
    stats?.residences.forEach(residence => {
      residenceRentDays[residence.id] = {
        nom: residence.nom,
        jours: 0
      };
    });
    // Calculer les jours de location pour chaque résidence
    stats?.locations.forEach(location => {
      if (location.statut !== 'en_cours' && location.statut !== 'finalise') return;
      // Si le bien n'a pas de résidence associée, ignorer
      if (!location.bien?.residence?.id) return;
      const residenceId = location.bien.residence?.id;
      const residenceName = location.bien.residence?.nom || 'Inconnue';
      // S'assurer que cette résidence est dans notre objet
      if (!residenceRentDays[residenceId]) {
        residenceRentDays[residenceId] = {
          nom: residenceName,
          jours: 0
        };
      }
      const startDate = parseISO(location.date_debut);
      const endDate = parseISO(location.date_fin);
      // Déterminer l'intersection entre la période de location et le mois courant
      const overlapStart = startDate > currentMonthStart ? startDate : currentMonthStart;
      const overlapEnd = endDate < currentMonthEnd ? endDate : currentMonthEnd;
      // Vérifier s'il y a une intersection
      if (isWithinInterval(overlapStart, { start: currentMonthStart, end: currentMonthEnd }) ||
          isWithinInterval(overlapEnd, { start: currentMonthStart, end: currentMonthEnd }) ||
          (startDate <= currentMonthStart && endDate >= currentMonthEnd)) {
        // Calculer le nombre de jours dans l'intersection
        const daysInMonth = differenceInDays(overlapEnd, overlapStart) + 1;
        residenceRentDays[residenceId].jours += Math.max(0, daysInMonth);
      }
    });
    return Object.values(residenceRentDays);
  };
  const daysRentedPerResidence = calculateDaysRentedPerResidence();

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold text-sqi-black">Tableau de bord</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Biens immobiliers</CardTitle>
            <Building2 className="w-4 h-4 text-sqi-gold" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.biens.length || 0}</div>
            <div className="text-xs text-muted-foreground mt-1">
              {biensDisponibles.length} biens disponibles
            </div>
            <div className="mt-4 space-y-2">
              <div className="text-sm">
                En location : {stats?.biens.filter(b => b.type_transaction === 'location').length || 0}
              </div>
              <div className="text-sm">
                En vente : {stats?.biens.filter(b => b.type_transaction === 'vente').length || 0}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Locations</CardTitle>
            <Calendar className="w-4 h-4 text-sqi-gold" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.locations.length || 0}</div>
            <div className="text-xs text-muted-foreground mt-1">
              {locationsEnCours.length} locations en cours
            </div>
            <div className="mt-4">
              <div className="text-sm">
                Montant moyen : {stats?.locations.length 
                  ? Math.round(stats.locations.reduce((acc, curr) => acc + Number(curr.prix_journalier), 0) / stats.locations.length)
                  : 0} FCFA
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Demandes</CardTitle>
            <FileText className="w-4 h-4 text-sqi-gold" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.demandes.length || 0}</div>
            <div className="text-xs text-muted-foreground mt-1">
              {demandesEnAttente.length} demandes en attente
            </div>
            <div className="mt-4 space-y-2">
              <div className="text-sm">
                Locations : {stats?.demandes.filter(d => d.type_demande === 'location').length || 0}
              </div>
              <div className="text-sm">
                Ventes : {stats?.demandes.filter(d => d.type_demande === 'vente').length || 0}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Home className="w-5 h-5 text-sqi-gold" />
            <span>Jours loués par résidence ({currentMonthName})</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {daysRentedPerResidence.length > 0 ? (
                daysRentedPerResidence.map((item, index) => (
                    <div key={index} className="flex items-center justify-between border-b pb-2 last:border-0">
                      <div className="font-medium">{item.nom}</div>
                      <div className="flex items-center">
                        <span className="text-lg font-bold">{item.jours}</span>
                        <span className="ml-1 text-sm text-muted-foreground">jour{item.jours !== 1 ? 's' : ''}</span>
                      </div>
                    </div>
                ))
            ) : (
                <div className="text-center text-muted-foreground">Aucune résidence avec des locations ce mois-ci</div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

const DashboardBiens = () => (
  <div className="p-6">
    <PropertyTable />
  </div>
);

const DashboardLocations = () => (
  <div className="p-6">
    <h1 className="text-2xl font-bold text-sqi-black mb-6">Gestion des locations</h1>
    <LocationCalendar />
  </div>
);

const DashboardDemandes = () => (
  <div className="p-6">
    <RequestTable />
  </div>
);

const DashboardClients = () => (
    <div className="p-6">
      <ClientsTable />
    </div>
);

export default function Dashboard() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setEmail(user.email);
      }
    };
    getUser();
  }, []);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      toast({
        title: "Déconnexion réussie",
        description: "À bientôt !",
      });
      navigate('/login');
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Une erreur est survenue lors de la déconnexion",
      });
    }
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <DashboardSidebar />
        <main className="flex-1">
          <div className="h-header flex items-center justify-between px-4 border-b">
            <SidebarTrigger />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <User className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  {email}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate('/profile')}>
                  Profil
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={handleLogout}
                  className="text-red-600"
                >
                  Déconnexion
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <Routes>
            <Route index element={<DashboardHome />} />
            <Route path="biens" element={<DashboardBiens />} />
            <Route path="locations" element={<DashboardLocations />} />
            <Route path="demandes" element={<DashboardDemandes />} />
            <Route path="locataires" element={<DashboardClients />} />
            <Route path="locataires/:id" element={<ClientDetail />} />
            <Route path="property/:id" element={<PropertyDetail isAdmin={true} />} />
            <Route path="property/:id/images" element={<PropertyImagesPage isAdmin={true} />} />
          </Routes>
        </main>
      </div>
    </SidebarProvider>
  );
}
