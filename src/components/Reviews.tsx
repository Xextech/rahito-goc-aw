import React from 'react';
import { motion } from 'motion/react';
import { Star, Quote, ExternalLink } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

interface GoogleReview {
  author_name: string;
  rating: number;
  relative_time: Record<'es' | 'pl', string>;
  text: Record<'es' | 'pl', string>;
  profile_photo_url: string;
}

const TRANSLATED_REVIEWS: GoogleReview[] = [
  {
    author_name: "Aleksandra Kamińska",
    rating: 5,
    relative_time: {
      es: "Hace 2 semanas",
      pl: "2 tygodnie temu"
    },
    text: {
      es: "Absolutamente increíble. El Omakase fue una revelación. El ambiente en Głogów es íntimo y sofisticado. Sin duda el mejor japonés de la región ahora mismo.",
      pl: "Absolutnie niesamowite. Omakase było rewelacją. Atmosfera w Głogowie jest kameralna i wyrafinowana. Bez wątpienia najlepsza japońska kuchnia w regionie."
    },
    profile_photo_url: "https://i.pravatar.cc/150?u=aleksandra"
  },
  {
    author_name: "Marek Wiśniewski",
    rating: 5,
    relative_time: {
      es: "Hace 1 mes",
      pl: "Miesiąc temu"
    },
    text: {
      es: "Rahito es una joya escondida. La atención al detalle en cada plato de Wagyu es insuperable. Una experiencia de 'luz y sombra' que no te puedes perder.",
      pl: "Rahito to ukryty klejnot. Dbałość o szczegóły w każdym daniu z Wagyu jest niezrównana. Doświadczenie 'światła i cienia', którego nie można przegapić."
    },
    profile_photo_url: "https://i.pravatar.cc/150?u=marek"
  },
  {
    author_name: "Elena Rodriguez",
    rating: 4,
    relative_time: {
      es: "Hace 3 días",
      pl: "3 dni temu"
    },
    text: {
      es: "Diseño minimalista precioso y comida de autor de altísimo nivel. El servicio es impecable. Un poco difícil de reservar pero vale totalmente la pena.",
      pl: "Piękny minimalistyczny design i autorskie jedzenie na najwyższym poziomie. Obsługa jest nienaganna. Trochę trudno o rezerwację, ale całkowicie warto."
    },
    profile_photo_url: "https://i.pravatar.cc/150?u=elena"
  }
];

export default function Reviews() {
  const { lang, t } = useLanguage();
  
  return (
    <section className="py-20 sm:py-32 md:py-40 px-6 bg-dark border-t border-border" id="reviews">
      <div className="max-w-7xl mx-auto space-y-24">
        <div className="text-center space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="flex flex-col items-center gap-4"
          >
            <h2 className="text-3xl sm:text-5xl md:text-8xl font-serif font-light tracking-tight italic">{t.reviewsTitle}</h2>
            <div className="flex items-center gap-2 text-gold">
               <Star size={16} fill="currentColor" />
               <Star size={16} fill="currentColor" />
               <Star size={16} fill="currentColor" />
               <Star size={16} fill="currentColor" />
               <Star size={16} fill="currentColor" />
               <span className="text-stone-muted ml-2 text-sm tracking-[0.2em] font-light">{t.reviewsVerified}</span>
            </div>
          </motion.div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
          {TRANSLATED_REVIEWS.map((review, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.1 }}
              className="group p-10 border border-border bg-stone-900/20 relative hover:border-gold/50 transition-all duration-500"
            >
              <Quote className="absolute top-6 right-8 text-stone-800 group-hover:text-gold/20 transition-colors" size={48} />
              
              <div className="flex items-center gap-4 mb-8">
                <img 
                  src={review.profile_photo_url} 
                  alt={review.author_name} 
                  className="w-12 h-12 rounded-full border border-border group-hover:border-gold transition-colors"
                />
                <div>
                  <h4 className="text-stone-100 font-serif italic text-lg">{review.author_name}</h4>
                  <div className="flex items-center gap-1 text-gold">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} size={10} fill={i < review.rating ? "currentColor" : "none"} />
                    ))}
                    <span className="text-[9px] text-stone-600 ml-2 uppercase tracking-widest">{review.relative_time[lang]}</span>
                  </div>
                </div>
              </div>

              <p className="text-stone-400 font-light leading-relaxed tracking-wide italic text-sm">
                "{review.text[lang]}"
              </p>
            </motion.div>
          ))}
        </div>

        <div className="text-center pt-10">
           <a 
            href="https://google.com" 
            target="_blank" 
            rel="noopener noreferrer" 
            className="inline-flex items-center gap-3 text-[10px] uppercase tracking-[0.4em] text-stone-600 hover:text-gold transition-colors group"
           >
             {t.reviewsMore} <ExternalLink size={14} className="group-hover:translate-x-1 transition-transform" />
           </a>
        </div>
      </div>
    </section>
  );
}
