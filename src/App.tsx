import React, { useState } from "react";
import { motion, useScroll, useTransform, AnimatePresence } from "motion/react";
import { MapPin, Phone, Instagram, Facebook, Utensils, Award, Star, ArrowDown, Globe, Shield, Menu as MenuIcon, X, ChevronLeft, ChevronRight } from "lucide-react";
import ReservationForm from "./components/ReservationForm";
import Reviews from "./components/Reviews";
import AdminPortal from "./components/AdminPortal";
import { useLanguage } from "./context/LanguageContext";
import { cn } from "./lib/utils";

// Beautiful monochrome Spanish Bull head SVG LogoIcon
export function LogoIcon({ className = "w-8 h-8" }: { className?: string }) {
  return (
    <img
      src="/logo-dorado.png"
      alt="Rahito Logo"
      className={cn("w-full h-full object-contain", className)}
      referrerPolicy="no-referrer"
    />
  );
}

// Full Brand Logo with text adapted for headers/navigation
export function Logo({ className = "h-8", showText = true }: { className?: string; showText?: boolean }) {
  const { t } = useLanguage();
  return (
    <div className={cn("flex items-center gap-2.5 sm:gap-3", className)}>
      <div className="w-8 h-8 sm:w-9 sm:h-9 text-stone-100 flex-shrink-0">
        <LogoIcon className="w-full h-full" />
      </div>
      {showText && (
        <div className="flex flex-col items-start leading-none select-none text-left">
          <span className="font-serif font-light text-[13px] sm:text-[15px] tracking-[0.25em] uppercase text-stone-100">
            RAHITO
          </span>
          <span className="text-[6.5px] sm:text-[7.5px] tracking-[0.2em] uppercase text-stone-500 font-medium whitespace-nowrap">
            {t.brandSubtitle}
          </span>
        </div>
      )}
    </div>
  );
}

export default function App() {
  const { scrollYProgress } = useScroll();
  const heroOpacity = useTransform(scrollYProgress, [0, 0.2], [1, 0]);
  const heroScale = useTransform(scrollYProgress, [0, 0.2], [1, 1.05]);
  
  const { lang, setLang, t } = useLanguage();
  const [showAdmin, setShowAdmin] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // States and data for the cinematic 'image-video' interior slideshow
  const [currentSlide, setCurrentSlide] = useState(0);
  const [slideSourceIndices, setSlideSourceIndices] = useState<Record<string, number>>({
    interior_1: 0,
    interior_2: 0
  });

  const slides = [
    {
      id: "interior_1",
      sources: [
        "/interior_1.png",
        "/interior_1.jpg",
        "/interior_1.jpeg",
        "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&q=80&w=2000"
      ],
      alt: "Rahito Tapas Bar"
    },
    {
      id: "interior_2",
      sources: [
        "/interior_2.png",
        "/interior_2.jpg",
        "/interior_2.jpeg",
        "https://images.unsplash.com/photo-1514933651103-005eec06c04b?auto=format&fit=crop&q=80&w=2000"
      ],
      alt: "Rahito Dining Room"
    }
  ];

  // States and data for the 'Nuestra historia' automatic carousel
  const [currentHistorySlide, setCurrentHistorySlide] = useState(0);
  const [historySourceIndices, setHistorySourceIndices] = useState<Record<string, number>>({
    historia_1: 0,
    historia_2: 0,
    historia_3: 0
  });

  const historySlides = [
    {
      id: "historia_1",
      sources: [
        "/historia_1.jpeg",
        "/historia_1.jpg",
        "/historia_1.png",
        "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&q=80&w=1200"
      ],
      alt: "Rahito Historia 1"
    },
    {
      id: "historia_2",
      sources: [
        "/historia_2.jpeg",
        "/historia_2.jpg",
        "/historia_2.png",
        "https://images.unsplash.com/photo-1579871494447-9811cf80d66c?auto=format&fit=crop&q=80&w=1200"
      ],
      alt: "Rahito Historia 2"
    },
    {
      id: "historia_3",
      sources: [
        "/historia_3.jpeg",
        "/historia_3.jpg",
        "/historia_3.png",
        "https://images.unsplash.com/photo-1563729784474-d77dbb933a9e?auto=format&fit=crop&q=80&w=1200"
      ],
      alt: "Rahito Historia 3"
    }
  ];

  React.useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev === 0 ? 1 : 0));
    }, 6000);
    return () => clearInterval(timer);
  }, []);

  React.useEffect(() => {
    const timer = setInterval(() => {
      setCurrentHistorySlide((prev) => (prev + 1) % 3);
    }, 4500);
    return () => clearInterval(timer);
  }, []);

  // States and data for the menu/experience dishes carousel
  const [menuIndex, setMenuIndex] = useState(0);

  const dishes = [
    {
      id: "dish_1",
      tag: lang === "es" ? "ESPECIALIDAD" : "SPECJALNOŚĆ",
      title: lang === "es" ? "Paella de Marisco Tradicional" : "Tradycyjna Paella de Marisco",
      desc: lang === "es" 
        ? "Nuestra obra maestra marinera. Arroz bomba infusionado con un caldo concentrado de roca, coronado con langostinos, calamares y mejillones frescos seleccionados diariamente."
        : "Nasze arcydzieło prosto z morza. Ryż bomba nasączony esencjonalnym bulionem z owoców morza, podawany z krewetkami tygrysimi, kalmarami i świeżymi małżami.",
      img: "/paella marisco 2.jpg"
    },
    {
      id: "dish_2",
      tag: lang === "es" ? "TRADICIÓN" : "TRADYCJA",
      title: lang === "es" ? "Paella de Conejo y Romero" : "Paella z Królikiem i Rozmarynem",
      desc: lang === "es"
        ? "La esencia del interior mediterráneo. Arroz meloso cocinado lentamente con tierno conejo de campo, judías planas tradicionales y un toque ahumado de romero silvestre fresco."
        : "Esencja śródziemnomorskiego wnętrza kraju. Wolno gotowany, aromatyczny ryż z delikatnym królikiem, tradycyjną płaską fasolą i wędzonym akcentem świeżego dzikiego rozmarynu.",
      img: "/paella de conejo.jpg"
    },
    {
      id: "dish_3",
      tag: lang === "es" ? "LEGADO" : "DZIEDZICTWO",
      title: lang === "es" ? "Jamón Ibérico de Bellota" : "Jamón Ibérico de Bellota",
      desc: lang === "es"
        ? "El mayor tesoro de la gastronomía española. Finas lonchas de jamón ibérico de bellota cortadas a mano al instante, con un veteado perfecto que se funde delicadamente en el paladar."
        : "Największy skarb hiszpańskiej gastronomii. Cienkie, ręcznie krojone plastry dojrzewającej szynki iberyjskiej z żołędziowego wypasu, o doskonałym marmurkowaniu rozpływającym się w ustach.",
      img: "/plato de jamon.jpg"
    },
    {
      id: "dish_4",
      tag: lang === "es" ? "PLACER" : "SŁODKA CHWILA",
      title: lang === "es" ? "Torrija Caramelizada" : "Karmelizowana Torrija z Lodami",
      desc: lang === "es"
        ? "La dulzura de la infancia elevada al arte. Brioche tierno infusionado en leche de vainilla, canela y cítricos, caramelizado a la llama y servido con helado artesanal de leche merengada."
        : "Słodycz dzieciństwa podniesiona do rangi sztuki. Delikatna chałka maślana nasączona mlekiem z wanilią, cynamonem i cytrusami, skarmelizowana ogniem i podawana z rzemieślniczymi lodami.",
      img: "/postre.jpg"
    },
    {
      id: "dish_5",
      tag: lang === "es" ? "SABOR" : "DOJRZAŁY SMAK",
      title: lang === "es" ? "Paella del Señorito" : "Paella del Señorito",
      desc: lang === "es"
        ? "El placer de comer sin pausas. Arroz con todo el marisco completamente pelado e integrado, cocinado a fuego vivo con un sofrito denso de sepia, azafrán y ñoras."
        : "Przyjemność jedzenia bez barier. Aromatyczny ryż z całkowicie obranymi owocami morza, gotowany na dużym ogniu z gęstym sofrito z mątwy, szafranu i suszonych papryczek ñoras.",
      img: "/paella de marisco 2.jpg"
    },
    {
      id: "dish_6",
      tag: lang === "es" ? "BOCADO" : "PRZEKĄSKA",
      title: lang === "es" ? "Surtido de Empanadillas" : "Zestaw Chrupiących Empanadillas",
      desc: lang === "es"
        ? "El aperitivo perfecto para compartir. Empanadillas artesanales crujientes rellenas de nuestros guisos caseros más queridos, horneadas al punto exacto de dorado y sazón."
        : "Idealna przystawka do dzielenia się. Chrupiące, rzemieślnicze pierożki nadziewane naszymi ulubionymi domowymi potrawami, pieczone na złocisty kolor.",
      img: "/bandeja de empanadas.jpg"
    },
    {
      id: "dish_7",
      tag: lang === "es" ? "CALIDEZ" : "DOMOWE CIEPŁO",
      title: lang === "es" ? "Empanadas Caseras de la Abuela" : "Domowe Empanadas Babci",
      desc: lang === "es"
        ? "Receta secreta transmitida de generación en generación. Masa tierna y esponjosa rellena de un sofrito casero de atún, huevo cocido y pimientos asados al horno de leña."
        : "Sekretny przepis przekazywany z pokolenia na pokolenie. Puszyste i delikatne ciasto wypełnione domowym sofrito z tuńczyka, gotowanego jajka i papryki pieczonej w piecu opalany drewnem.",
      img: "/empanadas.jpg"
    },
    {
      id: "dish_8",
      tag: lang === "es" ? "RECORRIDO" : "KLASYKA",
      title: lang === "es" ? "Tabla de Quesos y Embutidos" : "Deska Serów i Wędlin",
      desc: lang === "es"
        ? "Un recorrido por el mapa quesero y de charcutería artesanal. Selección de quesos curados de oveja y cabra, acompañados de embutidos tradicionales curados al aire de la sierra."
        : "Podróż po mapie hiszpańskich serów i wędlin rzemieślniczych. Wybór dojrzałych serów owczych i kozich w towarzystwie tradycyjnych wędlin dojrzewających na górskim powietrzu.",
      img: "/bandeja de surtido.jpg"
    },
    {
      id: "dish_9",
      tag: lang === "es" ? "FRESCURA" : "ORZEŹWIENIE",
      title: lang === "es" ? "Mojito de Autor" : "Autorskie Mojito",
      desc: lang === "es"
        ? "Frescura botánica en su máxima expresión. Hierbabuena fresca seleccionada, ron añejo macerado con cítricos y agua con gas premium para un trago largo, vibrante y refrescante."
        : "Botaniczna świeżość w najlepszym wydaniu. Wyselekcjonowana świeża mięta, starzony rum macerowany z cytrusami i wysokiej jakości woda gazowana dla żywego, orzeźwiającego smaku.",
      img: "/Mohito.jpg"
    }
  ];

  React.useEffect(() => {
    const timer = setInterval(() => {
      setMenuIndex((prev) => (prev + 3) % dishes.length);
    }, 15000);
    return () => clearInterval(timer);
  }, [dishes.length]);

  if (showAdmin) {
    return (
      <div className="min-h-screen bg-dark text-stone-muted font-sans selection:bg-gold selection:text-dark">
        {/* Admin Navigation */}
        <nav className="fixed top-0 left-0 right-0 z-50 px-4 sm:px-8 py-4 sm:py-6 flex justify-between items-center bg-dark/95 border-b border-border backdrop-blur-md">
          <div className="flex items-center gap-2 sm:gap-6">
            <button
              onClick={() => {
                setShowAdmin(false);
                setMobileMenuOpen(false);
              }}
              className="hover:opacity-80 transition-opacity"
            >
              <Logo className="h-6 sm:h-7" showText={true} />
            </button>
            <span className="text-stone-700">|</span>
            <span className="text-[9px] sm:text-[10px] text-gold font-light tracking-widest uppercase flex items-center gap-1">
              <Shield size={10} className="sm:w-3 sm:h-3" />
              <span className="hidden xs:inline">Owner Portal</span>
              <span className="xs:hidden">Portal</span>
            </span>
          </div>

          <div className="flex items-center gap-3 sm:gap-6">
            {/* Language Switch */}
            <div className="flex border border-border rounded-full p-0.5 bg-stone-900/50">
              <button
                onClick={() => setLang('es')}
                className={cn(
                  "px-2 sm:px-3 py-1 text-[8px] sm:text-[9px] uppercase tracking-widest rounded-full transition-all",
                  lang === 'es' ? "bg-gold text-dark font-bold" : "text-stone-400 hover:text-stone-200"
                )}
              >
                ES
              </button>
              <button
                onClick={() => setLang('pl')}
                className={cn(
                  "px-2 sm:px-3 py-1 text-[8px] sm:text-[9px] uppercase tracking-widest rounded-full transition-all",
                  lang === 'pl' ? "bg-gold text-dark font-bold" : "text-stone-400 hover:text-stone-200"
                )}
              >
                PL
              </button>
            </div>

            <button
              onClick={() => setShowAdmin(false)}
              className="px-3 sm:px-6 py-1.5 sm:py-2 border border-gold text-[8px] sm:text-[10px] uppercase tracking-widest text-gold hover:bg-gold hover:text-dark transition-all duration-300"
            >
              {lang === "es" ? "Salir" : "Wyjdź"}
            </button>
          </div>
        </nav>

        <AdminPortal />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark text-stone-muted font-sans selection:bg-gold selection:text-dark relative">
      
      {/* Dynamic Floating Language Switcher */}
      <div className="fixed bottom-6 ssm:bottom-8 right-6 ssm:right-8 z-55 flex items-center gap-2 bg-stone-950/90 border border-border px-3 sm:px-4 py-2 sm:py-2.5 rounded-full hover:border-gold/50 transition-all shadow-2xl backdrop-blur-md">
        <Globe size={11} className="text-stone-500" />
        <button
          onClick={() => setLang('es')}
          className={cn(
            "text-[9px] sm:text-[10px] tracking-widest font-bold transition-all",
            lang === 'es' ? "text-gold" : "text-stone-500 hover:text-stone-300"
          )}
        >
          ES
        </button>
        <span className="text-stone-800 text-[10px]">|</span>
        <button
          onClick={() => setLang('pl')}
          className={cn(
            "text-[9px] sm:text-[10px] tracking-widest font-bold transition-all",
            lang === 'pl' ? "text-gold" : "text-stone-500 hover:text-stone-300"
          )}
        >
          PL
        </button>
      </div>

      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 px-4 sm:px-8 py-6 sm:py-8 flex justify-between items-center bg-dark/50 backdrop-blur-md border-b border-white/[0.03]">
        <motion.div 
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="cursor-pointer hover:opacity-90 transition-opacity"
          onClick={() => {
            setShowAdmin(false);
            setMobileMenuOpen(false);
          }}
        >
          <Logo showText={true} />
        </motion.div>
        
        {/* Desktop Menu */}
        <motion.div 
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="hidden md:flex gap-8 lg:gap-12 text-[10px] uppercase tracking-[0.3em] items-center"
        >
          <a href="#menu" className="hover:text-gold transition-colors">{t.navMenu}</a>
          <a href="#about" className="hover:text-gold transition-colors">{t.navVision}</a>
          <a href="#reviews" className="hover:text-gold transition-colors">{t.navReviews}</a>
          
          <button 
            onClick={() => setShowAdmin(true)}
            className="hover:text-gold transition-colors flex items-center gap-1.5 text-stone-400 border border-stone-800/60 rounded px-2.5 py-1 hover:border-gold/30 bg-stone-950/20"
          >
            <Shield size={10} />
            <span>{t.navAdmin}</span>
          </button>

          <a href="#booking" className="border border-gold px-8 py-2 hover:bg-gold hover:text-dark transition-all duration-300 font-bold">
            {t.navReserve}
          </a>
        </motion.div>

        {/* Mobile Menu Trigger & Action */}
        <div className="flex md:hidden items-center gap-3">
          <a 
            href="#booking" 
            className="border border-gold px-4 py-1.5 text-[9px] uppercase tracking-widest text-gold hover:bg-gold hover:text-dark transition-all font-bold"
          >
            {t.navReserve}
          </a>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 border border-border bg-stone-900/40 text-stone-300 hover:text-gold transition-colors"
            aria-label="Toggle Menu"
          >
            {mobileMenuOpen ? <X size={18} /> : <MenuIcon size={18} />}
          </button>
        </div>
      </nav>

      {/* Mobile Menu Drawer Overlay */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-40 bg-stone-950 px-6 pt-32 pb-16 flex flex-col justify-between md:hidden"
          >
            <div className="space-y-10 flex flex-col justify-center items-center flex-1">
              <a 
                href="#menu" 
                onClick={() => setMobileMenuOpen(false)}
                className="text-2xl font-serif text-stone-300 uppercase tracking-widest hover:text-gold transition-colors"
              >
                {t.navMenu}
              </a>
              <a 
                href="#about" 
                onClick={() => setMobileMenuOpen(false)}
                className="text-2xl font-serif text-stone-300 uppercase tracking-widest hover:text-gold transition-colors"
              >
                {t.navVision}
              </a>
              <a 
                href="#reviews" 
                onClick={() => setMobileMenuOpen(false)}
                className="text-2xl font-serif text-stone-300 uppercase tracking-widest hover:text-gold transition-colors"
              >
                {t.navReviews}
              </a>
              
              <button 
                onClick={() => {
                  setMobileMenuOpen(false);
                  setShowAdmin(true);
                }}
                className="hover:text-gold text-lg transition-colors flex items-center gap-2 text-stone-400 border border-stone-800/60 rounded px-6 py-3 bg-stone-950/20 uppercase tracking-widest"
              >
                <Shield size={14} />
                <span>{t.navAdmin}</span>
              </button>
            </div>

            <div className="border-t border-border pt-8 text-center space-y-4">
              <p className="text-stone-600 text-[10px] tracking-widest uppercase font-serif italic">
                {t.heroTagline}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hero Section */}
      <section className="relative h-screen flex flex-col items-center justify-center overflow-hidden px-6">
        {/* Cinematic 'Imagen-Video' Slideshow Background */}
        <motion.div 
          style={{ opacity: heroOpacity, scale: heroScale }}
          className="absolute inset-0 z-0 w-full h-full"
        >
          <AnimatePresence mode="popLayout">
            <motion.div
              key={currentSlide}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.8, ease: "easeInOut" }}
              className="absolute inset-0 w-full h-full overflow-hidden"
            >
              {/* Overlay with rich vignette gradient for high text readability */}
              <div className="absolute inset-0 bg-gradient-to-b from-dark/80 via-dark/25 to-dark/85 z-10" />
              
              <motion.img
                initial={{ scale: 1.04, x: -2, y: -1 }}
                animate={{ scale: 1.00, x: 0, y: 0 }}
                transition={{ duration: 6.5, ease: "linear" }}
                src={slides[currentSlide].sources[slideSourceIndices[slides[currentSlide].id] || 0]}
                onError={() => {
                  const id = slides[currentSlide].id;
                  const currentIdx = slideSourceIndices[id] || 0;
                  if (currentIdx < slides[currentSlide].sources.length - 1) {
                    setSlideSourceIndices(prev => ({
                      ...prev,
                      [id]: currentIdx + 1
                    }));
                  }
                }}
                alt={slides[currentSlide].alt}
                className="w-full h-full object-cover brightness-[0.70] contrast-[1.05]"
                referrerPolicy="no-referrer"
              />
            </motion.div>
          </AnimatePresence>
        </motion.div>

        <div className="relative z-20 text-center max-w-4xl space-y-8">
          <motion.div 
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.8 }}
            className="flex flex-col items-center justify-center space-y-4"
          >
            {/* Ambient glowing brand mark as requested */}
            <div className="w-20 h-20 sm:w-28 sm:h-28 text-gold flex items-center justify-center">
              <LogoIcon className="w-full h-full drop-shadow-[0_0_15px_rgba(217,119,6,0.2)]" />
            </div>
            
            <h1 className="text-4xl xs:text-5xl sm:text-7xl md:text-[6rem] lg:text-[7.5rem] font-serif font-light tracking-[0.25em] leading-none text-stone-100 uppercase pt-2">
              RAHITO
            </h1>
            
            <div className="flex items-center gap-4 w-full justify-center max-w-xs sm:max-w-md">
              <div className="h-px bg-gold/30 flex-1" />
              <span className="text-[8px] sm:text-xs tracking-[0.4em] uppercase text-gold font-mono whitespace-nowrap">
                {t.brandSubtitle}
              </span>
              <div className="h-px bg-gold/30 flex-1" />
            </div>
          </motion.div>

          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="text-stone-400 max-w-lg mx-auto text-xs sm:text-sm md:text-base font-serif italic tracking-widest leading-relaxed px-4"
          >
            {t.heroTagline}
          </motion.p>
        </div>

        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="absolute bottom-12 left-1/2 -translate-x-1/2 flex flex-col items-center gap-4 text-stone-600"
        >
          <motion.div
            animate={{ y: [0, 10, 0] }}
            transition={{ repeat: Infinity, duration: 2.5 }}
            className="w-px h-12 bg-gold/30 relative"
          >
            <div className="absolute top-0 left-0 w-full h-1/2 bg-gold" />
          </motion.div>
        </motion.div>
      </section>

      {/* About Section */}
      <section className="py-20 sm:py-32 md:py-40 px-6 sm:px-12 max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-24 items-center" id="about">
        <div className="space-y-12 order-2 md:order-1">
          <div className="space-y-6">
            <h2 className="text-[11px] uppercase tracking-[0.5em] text-gold font-semibold">{t.storyTitle}</h2>
            <h3 className="text-3xl sm:text-5xl md:text-7xl font-serif font-light tracking-tight text-stone-muted leading-[1.1]">{t.storyHeading}</h3>
          </div>
          <p className="text-stone-500 font-light leading-relaxed tracking-wider text-base sm:text-lg">
            {t.storyParagraph}
          </p>
          <div className="grid grid-cols-2 gap-6 sm:gap-12 pt-12 border-t border-border">
             <div className="space-y-3">
                <span className="text-[10px] uppercase tracking-widest text-stone-600">{t.capacityLabel}</span>
                <span className="text-xl sm:text-3xl font-serif font-light block">{t.capacityValue}</span>
             </div>
             <div className="space-y-3">
                <span className="text-[10px] uppercase tracking-widest text-stone-600">{t.conceptLabel}</span>
                <span className="text-xl sm:text-3xl font-serif font-light block">{t.conceptValue}</span>
             </div>
          </div>
        </div>
        <div className="relative aspect-[3/4] border border-border p-4 order-1 md:order-2 group w-full max-w-md mx-auto">
            <div className="absolute inset-4 overflow-hidden bg-dark flex items-center justify-center">
              <AnimatePresence mode="wait">
                <motion.img 
                  key={currentHistorySlide}
                  initial={{ opacity: 0, scale: 1.05 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 1.2, ease: "easeInOut" }}
                  src={historySlides[currentHistorySlide].sources[historySourceIndices[historySlides[currentHistorySlide].id] || 0]} 
                  onError={() => {
                    const id = historySlides[currentHistorySlide].id;
                    const currentIdx = historySourceIndices[id] || 0;
                    if (currentIdx < historySlides[currentHistorySlide].sources.length - 1) {
                      setHistorySourceIndices(prev => ({
                        ...prev,
                        [id]: currentIdx + 1
                      }));
                    }
                  }}
                  alt={historySlides[currentHistorySlide].alt}
                  className="w-full h-full object-cover grayscale brightness-90 contrast-[1.02] transition-all duration-1000 group-hover:scale-102"
                  referrerPolicy="no-referrer"
                />
              </AnimatePresence>
              
              {/* Pagination indicators for the carousel */}
              <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2 z-20">
                {historySlides.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentHistorySlide(idx)}
                    className={`w-1.5 h-1.5 rounded-full transition-all duration-500 ${
                      currentHistorySlide === idx ? "bg-gold w-4" : "bg-white/40 hover:bg-white/70"
                    }`}
                    aria-label={`Go to slide ${idx + 1}`}
                  />
                ))}
              </div>
            </div>
        </div>
      </section>

      {/* Menu / Experience */}
      <section className="py-20 sm:py-32 md:py-40 bg-dark/50 px-6 border-y border-border" id="menu">
        <div className="max-w-7xl mx-auto space-y-20">
          <div className="text-center space-y-4">
            <h2 className="text-3xl sm:text-5xl md:text-8xl font-serif font-light tracking-tight">{t.expTitle}</h2>
            <div className="w-24 h-px bg-gold mx-auto mt-8" />
          </div>

          <div className="relative max-w-6xl mx-auto px-2 sm:px-12">
            {/* Arrows */}
            <button
              onClick={() => setMenuIndex((prev) => (prev - 3 + dishes.length) % dishes.length)}
              className="absolute -left-2 sm:left-0 md:-left-12 top-[180px] sm:top-[220px] md:top-[240px] -translate-y-1/2 z-20 w-10 h-10 md:w-12 md:h-12 rounded-full border border-border bg-dark/95 backdrop-blur-md flex items-center justify-center text-stone-400 hover:text-gold hover:border-gold transition-all duration-300 shadow-xl cursor-pointer"
              aria-label="Previous dish"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={() => setMenuIndex((prev) => (prev + 3) % dishes.length)}
              className="absolute -right-2 sm:right-0 md:-right-12 top-[180px] sm:top-[220px] md:top-[240px] -translate-y-1/2 z-20 w-10 h-10 md:w-12 md:h-12 rounded-full border border-border bg-dark/95 backdrop-blur-md flex items-center justify-center text-stone-400 hover:text-gold hover:border-gold transition-all duration-300 shadow-xl cursor-pointer"
              aria-label="Next dish"
            >
              <ChevronRight className="w-5 h-5" />
            </button>

            {/* Grid Container */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
              {[0, 1, 2].map((offset) => {
                const itemIdx = (menuIndex + offset) % dishes.length;
                const item = dishes[itemIdx];
                return (
                  <motion.div 
                    key={`${item.id}-${offset}`} 
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                    className={cn(
                      "group flex flex-col justify-between h-full",
                      offset === 0 ? "flex" : offset === 1 ? "hidden md:flex" : "hidden lg:flex"
                    )}
                  >
                    <div>
                      <div className="relative aspect-[4/5] overflow-hidden mb-6 border border-border group-hover:border-gold transition-colors duration-500 bg-black/40">
                        <img 
                          src={item.img} 
                          alt={item.title} 
                          className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105"
                          referrerPolicy="no-referrer"
                        />
                        <div className="absolute inset-0 bg-dark/20 group-hover:bg-transparent transition-colors" />
                      </div>
                      <span className="text-[9px] uppercase tracking-[0.4em] text-gold mb-3 block">{item.tag}</span>
                      <h4 className="text-2xl sm:text-3xl font-serif font-light mb-4 tracking-tight min-h-[2.5rem] flex items-center">{item.title}</h4>
                    </div>
                    <p className="text-stone-500 font-light text-sm leading-relaxed tracking-wide italic min-h-[6.5rem]">{item.desc}</p>
                  </motion.div>
                );
              })}
            </div>

            {/* Indicator Dots */}
            <div className="flex justify-center gap-2 mt-12">
              {Array.from({ length: Math.ceil(dishes.length / 3) }).map((_, pageIdx) => {
                const isActive = Math.floor(menuIndex / 3) === pageIdx;
                return (
                  <button
                    key={pageIdx}
                    onClick={() => setMenuIndex(pageIdx * 3)}
                    className={`w-1.5 h-1.5 rounded-full transition-all duration-500 ${
                      isActive ? "bg-gold w-4" : "bg-white/20 hover:bg-white/40"
                    }`}
                    aria-label={`Go to page ${pageIdx + 1}`}
                  />
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Reviews Section */}
      <Reviews />

      {/* Booking Section */}
      <section className="py-24 md:py-40 px-6 relative overflow-hidden" id="booking">
        <div className="max-w-7xl mx-auto flex flex-col items-center gap-20">
          <div className="text-center space-y-6 max-w-2xl">
            <h2 className="text-5xl md:text-8xl font-serif font-light tracking-tight italic">{t.resTitle}</h2>
            <div className="flex gap-4 justify-center text-[10px] tracking-[0.4em] uppercase text-stone-600">
              <span className="text-gold">{lang === "es" ? "Mesas" : "Stoliki"}</span>
              <span>{lang === "es" ? "Eventos" : "Wydarzenia"}</span>
              <span>{lang === "es" ? "Privativo" : "Prwatne"}</span>
            </div>
          </div>
          <div className="w-full">
            <ReservationForm />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-24 px-12 border-t border-border bg-dark">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-16 lg:gap-24">
          <div className="space-y-8">
             <div className="text-3xl font-serif font-light tracking-[0.2em] uppercase">Rahito</div>
             <p className="text-xs text-stone-600 uppercase tracking-[0.3em] leading-loose">
               {t.footerTagline}
             </p>
             <div className="flex gap-6">
               <a href="#" className="text-stone-500 hover:text-gold transition-all"><Instagram size={20} /></a>
               <a href="#" className="text-stone-500 hover:text-gold transition-all"><Facebook size={20} /></a>
             </div>
          </div>
          <div className="space-y-8">
             <h5 className="text-[10px] uppercase tracking-[0.4em] text-gold font-bold">{t.footerLocation}</h5>
             <address className="text-stone-400 not-italic text-sm font-light space-y-3 font-serif italic text-lg leading-relaxed">
               {t.footerAddress}
             </address>
          </div>
          <div className="space-y-8">
             <h5 className="text-[10px] uppercase tracking-[0.4em] text-gold font-bold">{t.footerHours}</h5>
             <div className="text-stone-400 text-sm font-light space-y-2 uppercase tracking-widest text-[11px]">
               <p>{t.footerHoursWeekdays}</p>
               <p>{t.footerHoursWeekends}</p>
             </div>
          </div>
          <div className="space-y-8">
             <h5 className="text-[10px] uppercase tracking-[0.4em] text-gold font-bold">{t.footerInquiries}</h5>
             <div className="text-stone-400 text-sm font-light space-y-3">
               <p className="text-2xl font-serif italic text-stone-200">+ 48510276655</p>
               <p className="text-xs uppercase tracking-widest border-b border-border pb-2 inline-block">Rahitorestaurant@gmail.com</p>
             </div>
          </div>
        </div>
        
        <div className="max-w-7xl mx-auto pt-24 mt-24 border-t border-border flex flex-col md:flex-row justify-between text-stone-700 text-[9px] uppercase tracking-[0.5em] gap-6">
           <p>{t.footerRights}</p>
           <div className="flex gap-12 mt-6 md:mt-0">
             <a href="#" className="hover:text-gold transition-colors">{t.footerPrivacy}</a>
             <a href="#" className="hover:text-gold transition-colors">{t.footerTerms}</a>
             <button onClick={() => setShowAdmin(true)} className="hover:text-gold transition-colors flex items-center gap-1">
               <Shield size={10} /> {lang === "es" ? "Acceso Propietario" : "Logowanie Właściciela"}
             </button>
           </div>
        </div>
      </footer>
    </div>
  );
}
