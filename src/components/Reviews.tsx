import React from 'react';
import { motion } from 'motion/react';
import { Star, ExternalLink } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

export default function Reviews() {
  const { t } = useLanguage();
  
  return (
    <section className="pt-20 sm:pt-32 md:pt-40 pb-4 sm:pb-6 md:pb-8 px-6 bg-dark border-t border-border" id="reviews">
      <div className="max-w-7xl mx-auto space-y-8">
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

        <div className="space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="overflow-hidden border border-border bg-stone-900/20 rounded-2xl shadow-2xl shadow-black/20"
          >
            <div className="relative w-full h-[430px] sm:h-[520px] lg:h-[640px]">
              <iframe
                src="https://widgets.sociablekit.com/google-reviews/iframe/25694992"
                title={t.reviewsIframeTitle}
                frameBorder="0"
                loading="lazy"
                className="absolute inset-0 h-full w-full"
              />
            </div>
          </motion.div>
          <div className="text-center pt-0 -mt-1">
            <a 
              href="https://www.google.com/maps/place/RAHITO+Restauracja+Hiszpa%C5%84ska/@51.6615367,16.0802946,17z/data=!3m1!4b1!4m16!1m7!3m6!1s0x4705f53746a6bb2f:0xfa16400786a855e6!2sRAHITO+Restauracja+Hiszpa%C5%84ska!8m2!3d51.6615334!4d16.0828695!16s%2Fg%2F11yhxct1qs!3m7!1s0x4705f53746a6bb2f:0xfa16400786a855e6!8m2!3d51.6615334!4d16.0828695!9m1!1b1!16s%2Fg%2F11yhxct1qs?authuser=0&entry=ttu&g_ep=EgoyMDI2MDYyOS4wIKXMDSoASAFQAw%3D%3D" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="inline-flex items-center gap-3 text-[10px] uppercase tracking-[0.4em] text-stone-600 hover:text-gold transition-colors group"
            >
              {t.reviewsMore} <ExternalLink size={14} className="group-hover:translate-x-1 transition-transform" />
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
