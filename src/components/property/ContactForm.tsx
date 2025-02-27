
import { Property } from "@/types/property";
import { Button } from "@/components/ui/button";
import { MapPin } from "lucide-react";
import { motion } from "framer-motion";
import { DialogClose } from "@/components/ui/dialog";
import { useRef } from "react";

interface ContactFormProps {
  property: Property;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => Promise<void>;
}

const ContactForm = ({ property, onSubmit }: ContactFormProps) => {
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    await onSubmit(e);
    closeButtonRef.current?.click();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      <div>
        <span className="font-dm-sans font-bold text-sm uppercase text-sqi-gold">
          {property.type_transaction === "location" ? "Location" : "Vente"}
        </span>
        <h2 className="font-dm-sans text-2xl font-bold text-sqi-black mt-1">
          {property.libelle}
        </h2>
        <span className="font-dm-sans font-bold text-xl text-sqi-black block mt-2">
          {property.price.toLocaleString()} FCFA
          {property.type_transaction === "location" ? "/mois" : ""}
        </span>
      </div>
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-sqi-gold" />
          <span className="font-inter">
            {property.residence?.nom || "Localisation non spécifiée"}
          </span>
        </div>
        <p className="font-inter text-gray-600">{property.description || "Aucune description disponible"}</p>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="text"
          name="nom"
          placeholder="Votre nom"
          required
          className="w-full p-3 border rounded-lg font-inter transition-colors focus:border-sqi-gold focus:outline-none"
        />
        <input
          type="text"
          name="prenom"
          placeholder="Votre prénom"
          required
          className="w-full p-3 border rounded-lg font-inter transition-colors focus:border-sqi-gold focus:outline-none"
        />
        <input
          type="email"
          name="email"
          placeholder="Votre email"
          required
          className="w-full p-3 border rounded-lg font-inter transition-colors focus:border-sqi-gold focus:outline-none"
        />
        <input
          type="tel"
          name="telephone"
          placeholder="Votre téléphone"
          required
          className="w-full p-3 border rounded-lg font-inter transition-colors focus:border-sqi-gold focus:outline-none"
        />
        <Button type="submit" className="w-full bg-sqi-gold hover:bg-sqi-gold/90 text-sqi-white transition-all duration-default">
          Envoyer ma demande
        </Button>
      </form>
      <DialogClose ref={closeButtonRef} className="hidden" />
    </motion.div>
  );
};

export default ContactForm;
