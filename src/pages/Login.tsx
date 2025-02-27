
import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      if (data.user) {
        toast({
          title: "Connexion réussie",
          description: "Bienvenue !",
        });

        // Redirect to the page the user tried to access, or dashboard by default
        const from = (location.state as any)?.from?.pathname || "/dashboard";
        navigate(from, { replace: true });
      }
    } catch (error) {
      console.error('Erreur:', error);
      toast({
        variant: "destructive",
        title: "Erreur de connexion",
        description: "Email ou mot de passe incorrect",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-sqi-white flex flex-col">
      <header className="fixed top-0 left-0 w-full h-header bg-sqi-white shadow-sm z-50">
        <div className="container mx-auto h-full flex items-center px-4">
          <img 
            src="/lovable-uploads/373c7b04-910a-4cba-9bc2-8574323bc8e9.png" 
            alt="SQI Logo" 
            className="h-12 w-auto cursor-pointer"
            onClick={() => navigate('/')}
          />
        </div>
      </header>

      <div className="flex-1 flex items-center justify-center mt-header">
        <div className="w-full max-w-md p-8">
          <h1 className="font-dm-sans text-3xl font-bold text-sqi-black mb-8 text-center">
            Connexion
          </h1>
          
          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label htmlFor="email" className="block font-medium text-sm text-sqi-black mb-2">
                Email
              </label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Votre email"
                required
                className="w-full"
              />
            </div>

            <div>
              <label htmlFor="password" className="block font-medium text-sm text-sqi-black mb-2">
                Mot de passe
              </label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Votre mot de passe"
                required
                className="w-full"
              />
            </div>

            <Button
              type="submit"
              className="w-full bg-sqi-gold hover:bg-sqi-gold/90"
              disabled={loading}
            >
              {loading ? "Connexion en cours..." : "Se connecter"}
            </Button>

            <div className="text-center">
              <button
                type="button"
                onClick={() => navigate('/forgot-password')}
                className="text-sm text-sqi-gold hover:underline"
              >
                Mot de passe oublié ?
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;
