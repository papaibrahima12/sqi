
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PropertyGalleryProps {
  photos: { url: string }[];
}

export const PropertyGallery = ({ photos }: PropertyGalleryProps) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);

  const nextImage = () => {
    setCurrentIndex((prev) => (prev + 1) % photos.length);
  };

  const previousImage = () => {
    setCurrentIndex((prev) => (prev - 1 + photos.length) % photos.length);
  };

  return (
    <>
      <div
        className="relative h-[60vh] bg-cover bg-center transition-all duration-500 cursor-pointer"
        style={{
          backgroundImage: `url(${photos[currentIndex]?.url || photos[0]?.url})`,
        }}
        onClick={() => setIsLightboxOpen(true)}
      >
        <div className="absolute inset-0 bg-black/30" />
      </div>

      <AnimatePresence>
        {isLightboxOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
          >
            <Button
              variant="ghost"
              className="absolute top-4 right-4 text-white"
              onClick={() => setIsLightboxOpen(false)}
            >
              <X className="h-6 w-6" />
            </Button>
            
            <Button
              variant="ghost"
              className="absolute left-4 text-white"
              onClick={previousImage}
            >
              <ChevronLeft className="h-6 w-6" />
            </Button>

            <motion.img
              key={currentIndex}
              initial={{ opacity: 0, x: 100 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -100 }}
              src={photos[currentIndex]?.url}
              alt="Property"
              className="max-h-[90vh] max-w-[90vw] object-contain"
            />

            <Button
              variant="ghost"
              className="absolute right-4 text-white"
              onClick={nextImage}
            >
              <ChevronRight className="h-6 w-6" />
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
