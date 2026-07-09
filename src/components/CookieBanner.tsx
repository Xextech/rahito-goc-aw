import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Cookie } from "lucide-react";
import { useLanguage } from "../context/LanguageContext";

const CONSENT_KEY = "rahito_cookie_consent";

export type CookieConsent = "accepted" | "rejected";

export function getCookieConsent(): CookieConsent | null {
  try {
    const value = localStorage.getItem(CONSENT_KEY);
    return value === "accepted" || value === "rejected" ? value : null;
  } catch {
    return null;
  }
}

export default function CookieBanner({ onShowPrivacy }: { onShowPrivacy: () => void }) {
  const { t } = useLanguage();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!getCookieConsent()) setVisible(true);
  }, []);

  const decide = (consent: CookieConsent) => {
    try {
      localStorage.setItem(CONSENT_KEY, consent);
    } catch {
      // localStorage unavailable: the banner will simply reappear next visit
    }
    setVisible(false);
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 40 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          role="dialog"
          aria-label={t.cookieTitle}
          className="fixed bottom-0 left-0 right-0 z-[70] bg-stone-950/97 border-t border-gold/25 backdrop-blur-md shadow-[0_-10px_40px_rgba(0,0,0,0.6)]"
        >
          <div className="max-w-6xl mx-auto px-6 py-5 sm:py-6 flex flex-col md:flex-row items-start md:items-center gap-4 md:gap-8">
            <div className="flex items-start gap-3 flex-1">
              <Cookie size={18} className="text-gold shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-[10px] uppercase tracking-[0.25em] text-gold font-bold">{t.cookieTitle}</p>
                <p className="text-stone-400 text-xs leading-relaxed font-light max-w-2xl">
                  {t.cookieText}{" "}
                  <button
                    onClick={onShowPrivacy}
                    className="text-gold underline underline-offset-2 hover:text-stone-100 transition-colors"
                  >
                    {t.cookieMore}
                  </button>
                </p>
              </div>
            </div>

            <div className="flex gap-3 w-full md:w-auto shrink-0">
              <button
                onClick={() => decide("rejected")}
                className="flex-1 md:flex-none px-6 py-3 border border-border text-stone-400 text-[10px] uppercase tracking-widest hover:text-stone-100 hover:border-stone-500 transition-all"
              >
                {t.cookieReject}
              </button>
              <button
                onClick={() => decide("accepted")}
                className="flex-1 md:flex-none px-8 py-3 bg-gold text-dark text-[10px] uppercase tracking-widest font-bold hover:bg-gold/90 transition-all"
              >
                {t.cookieAccept}
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
