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
import {differenceInDays, endOfMonth, format, startOfMonth} from "date-fns";
import {ResponsiveLineChart} from "@/components/dashboard/RentalDaysChart.tsx";
import { fr } from 'date-fns/locale';

interface ResidenceRentDays {
  month: string;
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
            residence:residence_id(
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
            )),
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


  const calculateDaysRentedPerResidence = (): ResidenceRentDays[] => {
    const residenceRentDays: Record<string, ResidenceRentDays> = {};

    stats?.locations.forEach(location => {
      if (location.statut !== 'en_cours' && location.statut !== 'finalise') return;

      const startDate = new Date(location.date_debut);
      const endDate = new Date(location.date_fin);

      const months: string[] = [];
      let currentMonth = new Date(startDate);

      while (currentMonth <= endDate) {
        months.push(format(currentMonth, 'MMMM yyyy'));
        currentMonth.setMonth(currentMonth.getMonth() + 1);
        currentMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
      }

      months.forEach(monthKey => {
        const [monthName, year] = monthKey.split(" ");
        const monthIndex = new Date(`${monthName} 1, ${year}`).getMonth();
        const monthStart = startOfMonth(new Date(Number(year), monthIndex, 1));
        const monthEnd = endOfMonth(new Date(Number(year), monthIndex, 1));

        const overlapStart = startDate > monthStart ? startDate : monthStart;
        const overlapEnd = endDate < monthEnd ? endDate : monthEnd;

        const daysInMonth = differenceInDays(overlapEnd, overlapStart) + 1;

        console.log('Days in Month Calculation:', {
          monthKey,
          daysInMonth,
          overlapStartTime: overlapStart.getTime(),
          overlapEndTime: overlapEnd.getTime()
        });

        if (isNaN(daysInMonth)) {
          console.error('NaN days for month:', {
            monthKey,
            overlapStart,
            overlapEnd
          });
          return;
        }

        if (!residenceRentDays[monthKey]) {
          residenceRentDays[monthKey] = {
            month: monthKey,
            jours: 0
          };
        }
        console.log('days', daysInMonth);

        residenceRentDays[monthKey].jours += Math.max(0, daysInMonth);
      });
    });

    return Object.values(residenceRentDays).sort((a, b) =>
        new Date(`1 ${a.month}`).getTime() - new Date(`1 ${b.month}`).getTime()
    );
  };

  const daysRentedPerResidence = calculateDaysRentedPerResidence();
  console.log('nombre de jours', daysRentedPerResidence);

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
                  ? Math.round(stats.locations.reduce((acc, curr) => acc + Number(curr.bien.prix_journalier), 0) / stats.locations.length)
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
            <span>Jours loués par mois </span>
          </CardTitle>
        </CardHeader>
        <ResponsiveLineChart data={daysRentedPerResidence} />
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
