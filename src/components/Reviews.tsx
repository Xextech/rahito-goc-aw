import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Star, ChevronLeft, ChevronRight, MessageSquare, ExternalLink, User } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

interface Review {
  authorName: string;
  authorPhoto: string;
  rating: number;
  text: string;
  originalText: string;
  languageCode: string;
  originalLanguageCode: string;
  relativeTime: string;
}

const FALLBACK_REVIEWS: Review[] = [
  {
    authorName: "Alla P",
    authorPhoto: "https://lh3.googleusercontent.com/a-/ALV-UjWdrEjD-omA_MBPynk_VrvnMyyOUAaYvABTwtGoNji7_2EUriY=s128-c0x00000000-cc-rp-mo-ba3",
    rating: 5,
    text: "This place is an absolute hidden gem! We’ve already been here four times, and every dish has been spot on. I come from a country known for amazing food, so I know what good flavors are — and this place delivers every single time. We love coming here for a tasty breakfast with coffee, lunch, or dinner. The vibe is cozy, the staff are friendly, and the food always hits the mark.",
    originalText: "This place is an absolute hidden gem! We’ve already been here four times, and every dish has been spot on. I come from a country known for amazing food, so I know what good flavors are — and this place delivers every single time. We love coming here for a tasty breakfast with coffee, lunch, or dinner. The vibe is cozy, the staff are friendly, and the food always hits the mark.",
    languageCode: "en",
    originalLanguageCode: "en",
    relativeTime: "3 months ago"
  },
  {
    authorName: "Musi M",
    authorPhoto: "https://lh3.googleusercontent.com/a/ACg8ocIKyMDKXrk2vQMSPPlPmWOgRkDVb_H1W0cqJef5ENdmFiPp_g=s128-c0x00000000-cc-rp-mo",
    rating: 5,
    text: "Lovely place, the food was amazing and so was the service, really happy and welcoming couple. We had some free empanadas for a start followed by some lovely paella (ribs). Highly recommend!",
    originalText: "Lovely place, the food was amazing and so was the service, really happy and welcoming couple. We had some free empanadas for a start followed by some lovely paella (ribs). Highly recommend!",
    languageCode: "en",
    originalLanguageCode: "en",
    relativeTime: "5 months ago"
  },
  {
    authorName: "Natalia Samborski",
    authorPhoto: "https://lh3.googleusercontent.com/a/ACg8ocJASUQiYKPtpgm4trpuBgpxrc5sh7xfjjtRWsfvEeMEeW832g=s128-c0x00000000-cc-rp-mo",
    rating: 5,
    text: "Awasome place, the food was fantastic and so was the service, really happy and opendoor couple.",
    originalText: "Awasome place, the food was fantastic and so was the service, really happy and opendoor couple.",
    languageCode: "en",
    originalLanguageCode: "en",
    relativeTime: "4 months ago"
  },
  {
    authorName: "Noreply",
    authorPhoto: "https://lh3.googleusercontent.com/a/ACg8ocK3K1tCl0VZVnuM6_x_0ERwei97x9x-1XkG-1XZDCooEtNybw=s128-c0x00000000-cc-rp-mo-ba6",
    rating: 4,
    text: "We visited Rahito twice with friends and had the opportunity to try a variety of dishes, from appetizers to main courses. The menu is interesting, and the food is good and carefully prepared, though we didn't find it particularly impressive. Nevertheless, the service is a big plus: it's very friendly and welcoming. The owner is charismatic, chatting with guests, joking, and creating a relaxed atmosphere.",
    originalText: "Odwiedziliśmy Rahito dwukrotnie ze znajomymi i mieliśmy okazję spróbować różnych potraw, od przystawek po dania główne. Menu jest ciekawe, a jedzenie dobre i starannie przygotowane, choć w naszym odczuciu nie było „wow”. Mimo to uważam, że warto przyjść i wyrobić sobie własną opinię. Na duży plus zasługuje obsługa, bardzo miła i serdeczna. Pani właścicielka to osoba z charyzmą, która rozmawia z gośćmi, żartuje.",
    languageCode: "en",
    originalLanguageCode: "pl",
    relativeTime: "4 months ago"
  }
];

export default function Reviews() {
  const { t, lang } = useLanguage();
  const [reviews, setReviews] = useState<Review[]>(FALLBACK_REVIEWS);
  const [rating, setRating] = useState<number>(4.9);
  const [userRatingCount, setUserRatingCount] = useState<number>(193);
  const [loading, setLoading] = useState<boolean>(true);
  
  const [currentIndex, setCurrentIndex] = useState(0);
  const [visibleCards, setVisibleCards] = useState(3);
  const [showOriginal, setShowOriginal] = useState<Record<number, boolean>>({});

  const scrollRef = React.useRef<HTMLDivElement>(null);

  // Detect responsive visible cards
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 640) setVisibleCards(1);
      else if (window.innerWidth < 1024) setVisibleCards(2);
      else setVisibleCards(3);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Fetch reviews from our cached endpoint (bilingual)
  useEffect(() => {
    let active = true;
    setLoading(true);
    fetch(`/api/reviews?lang=${lang}`)
      .then((res) => {
        if (!res.ok) throw new Error('API response error');
        return res.json();
      })
      .then((data) => {
        if (active && data && Array.isArray(data.reviews) && data.reviews.length > 0) {
          setReviews(data.reviews);
          setRating(data.rating || 4.9);
          setUserRatingCount(data.userRatingCount || 193);
        }
      })
      .catch((err) => {
        console.warn('Failed to load reviews from API, using premium defaults:', err);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [lang]);

  const maxIndex = Math.max(0, reviews.length - visibleCards);

  // Track scroll position to update current index
  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const cardWidth = el.offsetWidth / visibleCards;
    const index = Math.round(el.scrollLeft / cardWidth);
    if (index !== currentIndex && index >= 0 && index <= maxIndex) {
      setCurrentIndex(index);
    }
  };

  // Scroll to index programmatically
  const scrollTo = (index: number) => {
    const el = scrollRef.current;
    if (!el) return;
    const cardWidth = el.offsetWidth / visibleCards;
    el.scrollTo({
      left: index * cardWidth,
      behavior: 'smooth'
    });
    setCurrentIndex(index);
  };

  const handleNext = () => {
    const nextIdx = currentIndex >= maxIndex ? 0 : currentIndex + 1;
    scrollTo(nextIdx);
  };

  const handlePrev = () => {
    const prevIdx = currentIndex <= 0 ? maxIndex : prev - 1;
    scrollTo(prevIdx);
  };

  const toggleLanguage = (index: number) => {
    setShowOriginal((prev) => ({ ...prev, [index]: !prev[index] }));
  };

  const googleMapsUrl = "https://www.google.com/maps/place/RAHITO+Restauracja+Hiszpa%C5%84ska/@51.6615334,16.0828695!16s%2Fg%2F11yhxct1qs?authuser=0&entry=ttu";
  const googleWriteReviewUrl = "https://search.google.com/local/writereview?placeid=ChIJL7umRjf1BUcR5lWohgdAFvo";

  return (
    <section className="pt-20 sm:pt-32 md:pt-40 pb-16 sm:pb-24 px-6 bg-dark border-t border-border" id="reviews">
      <div className="max-w-7xl mx-auto space-y-12">
        
        {/* Title and Ratings Summary */}
        <div className="text-center space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="flex flex-col items-center gap-4"
          >
            <h2 className="text-3xl sm:text-5xl md:text-8xl font-serif font-light tracking-tight italic">
              {t.reviewsTitle}
            </h2>
            
            <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-6 mt-2">
              <div className="flex items-center gap-1.5 text-gold bg-stone-900/60 border border-stone-800/80 px-4 py-2 rounded-full shadow-lg">
                <span className="font-serif font-semibold text-lg mr-1">{rating.toFixed(1)}</span>
                <div className="flex items-center gap-0.5">
                  {[...Array(5)].map((_, i) => (
                    <Star 
                      key={i} 
                      size={14} 
                      fill={i < Math.round(rating) ? "currentColor" : "none"} 
                      className={i < Math.round(rating) ? "text-gold" : "text-stone-700"}
                    />
                  ))}
                </div>
              </div>
              <span className="text-stone-muted text-xs sm:text-sm tracking-[0.2em] font-light uppercase">
                {lang === 'es' 
                  ? `Basado en ${userRatingCount} valoraciones en Google` 
                  : `Na podstawie ${userRatingCount} opinii w Google`}
              </span>
            </div>
          </motion.div>
        </div>

        {/* Carousel Container */}
        <div className="relative group space-y-6">
          <div 
            ref={scrollRef}
            onScroll={handleScroll}
            className="flex overflow-x-auto snap-x snap-mandatory scroll-smooth [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] px-1 py-4 gap-0"
          >
            {reviews.map((review, index) => {
              const isTranslated = review.originalText && review.originalText !== review.text;
              const showOrig = showOriginal[index] || false;
              const reviewText = showOrig && isTranslated ? review.originalText : review.text;

              return (
                <div 
                  key={index} 
                  className="flex-shrink-0 w-full sm:w-1/2 lg:w-1/3 px-3 snap-center"
                >
                  <div className="h-full flex flex-col justify-between p-6 sm:p-8 rounded-2xl border border-stone-800/60 bg-stone-900/10 backdrop-blur-md hover:border-stone-700/80 transition-all duration-300 shadow-xl hover:shadow-black/30 relative group/card">
                    
                    {/* Top content */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {review.authorPhoto ? (
                            <img 
                              src={review.authorPhoto} 
                              alt={review.authorName} 
                              className="w-10 h-10 rounded-full object-cover border border-stone-800"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full border border-stone-800 bg-stone-950 flex items-center justify-center text-stone-600">
                              <User size={18} />
                            </div>
                          )}
                          <div>
                            <h4 className="text-sm font-semibold text-stone-200 tracking-wide">{review.authorName}</h4>
                            <p className="text-[10px] text-stone-500 font-light">{review.relativeTime}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-0.5 text-gold">
                          {[...Array(5)].map((_, i) => (
                            <Star 
                              key={i} 
                              size={12} 
                              fill={i < review.rating ? "currentColor" : "none"} 
                              className={i < review.rating ? "text-gold" : "text-stone-800"}
                            />
                          ))}
                        </div>
                      </div>

                      {/* Review text */}
                      <div className="text-stone-300 font-light text-sm leading-relaxed font-sans min-h-[100px] max-h-[160px] overflow-y-auto custom-scrollbar">
                        "{reviewText}"
                      </div>
                    </div>

                    {/* Bottom translation controls / branding */}
                    <div className="pt-4 mt-4 border-t border-stone-900/60 flex items-center justify-between text-[10px] tracking-wider uppercase font-semibold">
                      {isTranslated ? (
                        <button
                          onClick={() => toggleLanguage(index)}
                          className="text-gold hover:text-gold-light transition-colors"
                        >
                          {showOrig 
                            ? (lang === 'es' ? "Ver traducción" : "Zobacz tłumaczenie") 
                            : (lang === 'es' ? "Ver original (Polaco)" : "Zobacz oryginał (Polski)")
                          }
                        </button>
                      ) : (
                        <span className="text-stone-600">Google Verified</span>
                      )}
                      <img 
                        src="https://upload.wikimedia.org/wikipedia/commons/c/c1/Google_%22G%22_logo.svg" 
                        alt="Google logo" 
                        className="w-3.5 h-3.5 opacity-40 group-hover/card:opacity-75 transition-opacity"
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Navigation Controls */}
          {maxIndex > 0 && (
            <>
              <button
                onClick={handlePrev}
                className="absolute left-0 top-1/2 -translate-y-1/2 -ml-4 w-10 h-10 rounded-full border border-stone-800 bg-stone-950/80 backdrop-blur-sm flex items-center justify-center text-stone-400 hover:text-gold hover:border-gold/30 transition-all shadow-xl hover:scale-105 z-10 opacity-0 group-hover:opacity-100 focus:opacity-100"
                aria-label="Previous reviews"
              >
                <ChevronLeft size={20} />
              </button>
              <button
                onClick={handleNext}
                className="absolute right-0 top-1/2 -translate-y-1/2 -mr-4 w-10 h-10 rounded-full border border-stone-800 bg-stone-950/80 backdrop-blur-sm flex items-center justify-center text-stone-400 hover:text-gold hover:border-gold/30 transition-all shadow-xl hover:scale-105 z-10 opacity-0 group-hover:opacity-100 focus:opacity-100"
                aria-label="Next reviews"
              >
                <ChevronRight size={20} />
              </button>
            </>
          )}

          {/* Pagination Indicators */}
          {maxIndex > 0 && (
            <div className="flex justify-center gap-1.5 pt-2">
              {[...Array(maxIndex + 1)].map((_, i) => (
                <button
                  key={i}
                  onClick={() => scrollTo(i)}
                  className={`h-1 rounded-full transition-all duration-350 ${
                    i === currentIndex ? "w-6 bg-gold" : "w-1.5 bg-stone-800"
                  }`}
                  aria-label={`Go to slide ${i + 1}`}
                />
              ))}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-6 pt-4">
          <a 
            href={googleMapsUrl} 
            target="_blank" 
            rel="noopener noreferrer" 
            className="inline-flex items-center gap-3 text-[10px] uppercase tracking-[0.4em] text-stone-500 hover:text-gold transition-colors group"
          >
            {t.reviewsMore} <ExternalLink size={12} className="group-hover:translate-x-0.5 transition-transform" />
          </a>
          
          <span className="hidden sm:inline text-stone-800 font-light">•</span>

          <a 
            href={googleWriteReviewUrl} 
            target="_blank" 
            rel="noopener noreferrer" 
            className="inline-flex items-center gap-2.5 text-[10px] uppercase tracking-[0.4em] text-gold hover:text-gold-light transition-colors group font-semibold"
          >
            <MessageSquare size={13} className="text-gold" />
            {lang === 'es' ? "Escribir una opinión" : "Napisz opinię"} 
            <ExternalLink size={12} className="opacity-60 group-hover:translate-x-0.5 transition-transform" />
          </a>
        </div>

      </div>
    </section>
  );
}
