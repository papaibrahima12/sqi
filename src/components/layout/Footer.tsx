
import { motion } from "framer-motion";

const fadeInUpVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 }
};

const FooterLink = ({ href, children }: { href: string; children: React.ReactNode }) => (
  <a
    href={href}
    className="block font-inter text-[#4B5563] hover:text-sqi-gold transition-colors duration-200 ease-in-out relative group"
  >
    <span className="relative">
      {children}
      <span className="absolute bottom-0 left-0 w-full h-0.5 bg-sqi-gold transform scale-x-0 origin-left transition-transform duration-300 group-hover:scale-x-100" />
    </span>
  </a>
);

const FooterSection = ({ title, children, delay = 0 }: { title: string; children: React.ReactNode; delay?: number }) => (
  <motion.div
    initial="hidden"
    whileInView="visible"
    viewport={{ once: true }}
    variants={fadeInUpVariants}
    transition={{ duration: 0.5, delay }}
    className="space-y-4"
  >
    <h3 className="font-dm-sans text-[#111827] tracking-wide uppercase font-medium">
      {title}
    </h3>
    {children}
  </motion.div>
);

export const Footer = () => {
  const links = [
    "SQI",
    "QUI SOMMES-NOUS",
    "NOS SERVICES",
    "REALISATIONS",
    "MEDIATHEQUE",
    "CONTACTEZ-NOUS"
  ];

  return (
    <footer className="bg-white border-t border-[#E5E7EB] pt-16 mt-24">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          <FooterSection title="Contact" delay={0.1}>
            <div className="space-y-4 font-inter text-[#4B5563]">
              <p>Siège, Liberté 6, DAKAR, SENEGAL</p>
              <p>infos-contact@sqigroupsn.com</p>
            </div>
          </FooterSection>

          <FooterSection title="Liens utiles" delay={0.2}>
            <div className="space-y-3">
              {links.map((link, index) => (
                <motion.div
                  key={link}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true }}
                  variants={fadeInUpVariants}
                  transition={{ duration: 0.5, delay: 0.1 * (index + 3) }}
                >
                  <FooterLink href="#">{link}</FooterLink>
                </motion.div>
              ))}
            </div>
          </FooterSection>
        </div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeInUpVariants}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="border-t border-[#E5E7EB] mt-12 pt-6 text-center"
        >
          <p className="font-inter text-[#6B7280]">
            © SQI - Tous les droits sont réservés
          </p>
        </motion.div>
      </div>
    </footer>
  );
};
