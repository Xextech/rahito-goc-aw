import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, ShieldCheck, FileText } from "lucide-react";
import { Language } from "../locales";

interface LegalModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: Language;
}

export function PrivacyPolicyModal({ isOpen, onClose, lang }: LegalModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 md:p-10">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/80 backdrop-blur-md"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", duration: 0.5 }}
            className="relative w-full max-w-2xl max-h-[80vh] overflow-y-auto border border-border bg-dark/95 backdrop-blur-md p-6 sm:p-10 rounded-lg shadow-2xl text-stone-300 z-10 font-sans custom-scrollbar"
          >
            {/* Top Close Button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 sm:top-6 sm:right-6 text-stone-500 hover:text-gold transition-colors p-2 rounded-full hover:bg-white/5 cursor-pointer"
              aria-label="Close modal"
            >
              <X size={18} />
            </button>

            {/* Content header */}
            <div className="flex items-center gap-4 border-b border-border pb-6 mb-6">
              <div className="w-10 h-10 rounded-full bg-gold/10 border border-gold/30 flex items-center justify-center text-gold">
                <ShieldCheck size={20} />
              </div>
              <div>
                <h3 className="text-xl sm:text-2xl font-serif font-light text-stone-100 tracking-wide">
                  {lang === "es" ? "Política de Privacidad" : "Polityka Prywatności"}
                </h3>
                <p className="text-[10px] uppercase tracking-widest text-stone-500 mt-1">
                  {lang === "es" ? "Reglamento General de Protección de Datos (RGPD)" : "Ogólne Rozporządzenie o Ochronie Danych (RODO)"}
                </p>
              </div>
            </div>

            {/* Legal content */}
            <div className="space-y-6 text-sm leading-relaxed text-stone-400 font-light">
              {lang === "es" ? (
                <>
                  <p>
                    En <strong>Rahito Głogów</strong>, valoramos y respetamos su privacidad. Esta Política de Privacidad describe cómo recopilamos, utilizamos y protegemos la información personal que nos proporciona al utilizar nuestro sitio web y sistema de reservas en línea.
                  </p>

                  <div className="space-y-2">
                    <h4 className="text-stone-200 font-serif font-medium tracking-wide">1. Responsable del Tratamiento de Datos</h4>
                    <p>
                      El responsable del tratamiento de sus datos personales es <strong>Rahito Głogów</strong>, con domicilio en Stawna 8, 67-200 Głogów, Polonia. Puede ponerse en contacto con nosotros en cualquier momento a través del correo electrónico: <a href="mailto:Rahitorestaurant@gmail.com" className="text-gold hover:underline">Rahitorestaurant@gmail.com</a>.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <h4 className="text-stone-200 font-serif font-medium tracking-wide">2. Datos Personales que Recopilamos</h4>
                    <p>
                      Al realizar una reserva en nuestro restaurante, recopilamos únicamente los datos necesarios para gestionar la reserva de forma eficaz:
                    </p>
                    <ul className="list-disc pl-5 space-y-1 text-xs">
                      <li>Nombre completo para identificar la reserva.</li>
                      <li>Dirección de correo electrónico para enviarle confirmaciones automáticas y enlaces de anulación.</li>
                      <li>Número de teléfono para ponernos en contacto con usted en caso de cambios o incidencias de última hora.</li>
                      <li>Detalles de la reserva: fecha, hora, número de comensales y notas o peticiones especiales.</li>
                    </ul>
                  </div>

                  <div className="space-y-2">
                    <h4 className="text-stone-200 font-serif font-medium tracking-wide">3. Finalidad del Tratamiento</h4>
                    <p>
                      Utilizamos su información estrictamente para las siguientes finalidades:
                    </p>
                    <ul className="list-disc pl-5 space-y-1 text-xs">
                      <li>Procesar, confirmar, modificar y gestionar su reserva de mesa en Rahito Głogów.</li>
                      <li>Permitirle la autogestión de su reserva (incluyendo la cancelación automatizada desde el correo electrónico).</li>
                      <li>Notificar a nuestro personal de cocina y servicio sobre sus peticiones o restricciones alimentarias.</li>
                    </ul>
                  </div>

                  <div className="space-y-2">
                    <h4 className="text-stone-200 font-serif font-medium tracking-wide">4. Conservación y Seguridad de los Datos</h4>
                    <p>
                      Sus datos personales se almacenan de manera segura en un servicio de base de datos en la nube cifrado (Firestore) y solo son accesibles por el personal autorizado del restaurante. Se conservarán durante el periodo estrictamente necesario para cumplir con la finalidad de la reserva y fines contables, tras lo cual se eliminarán o anonimizarán.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <h4 className="text-stone-200 font-serif font-medium tracking-wide">5. Transferencia a Terceros</h4>
                    <p>
                      No vendemos, comercializamos ni transferimos sus datos personales a terceros bajo ningún concepto, salvo en cumplimiento de obligaciones legales o para el correcto funcionamiento de los servicios técnicos (como el envío de correos automatizados por SMTP).
                    </p>
                  </div>

                  <div className="space-y-2">
                    <h4 className="text-stone-200 font-serif font-medium tracking-wide">6. Sus Derechos</h4>
                    <p>
                      De conformidad con el RGPD, usted dispone de los siguientes derechos: acceso, rectificación, supresión ("derecho al olvido"), limitación del tratamiento y portabilidad. Para ejercer cualquiera de estos derechos, o si desea que eliminemos su registro de nuestro sistema, envíe un correo electrónico a <a href="mailto:Rahitorestaurant@gmail.com" className="text-gold hover:underline">Rahitorestaurant@gmail.com</a>.
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <p>
                    W <strong>Rahito Głogów</strong> cenimy i szanujemy Twoją prywatność. Niniejsza Polityka Prywatności określa, w jaki sposób gromadzimy, przetwarzamy i chronimy dane osobowe, które nam przekazujesz podczas korzystania z naszej strony internetowej i systemu rezerwacji stolików.
                  </p>

                  <div className="space-y-2">
                    <h4 className="text-stone-200 font-serif font-medium tracking-wide">1. Administrator Danych Osobowych</h4>
                    <p>
                      Administratorem Twoich danych osobowych jest <strong>Rahito Głogów</strong>, z siedzibą pod adresem ul. Stawna 8, 67-200 Głogów, Polska. Możesz się z nami skontaktować w dowolnym momencie pod adresem e-mail: <a href="mailto:Rahitorestaurant@gmail.com" className="text-gold hover:underline">Rahitorestaurant@gmail.com</a>.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <h4 className="text-stone-200 font-serif font-medium tracking-wide">2. Jakie Dane Osobowe Gromadzimy</h4>
                    <p>
                      Podczas dokonywania rezerwacji w naszej restauracji zbieramy wyłącznie dane niezbędne do prawidłowej obsługi rezerwacji:
                    </p>
                    <ul className="list-disc pl-5 space-y-1 text-xs">
                      <li>Imię i nazwisko w celu identyfikacji rezerwacji.</li>
                      <li>Adres e-mail w celu przesyłania automatycznych potwierdzeń oraz linków do anulowania rezerwacji.</li>
                      <li>Numer telefonu w celu kontaktu w przypadku nagłych zmian lub pytań dotyczących rezerwacji.</li>
                      <li>Szczegóły rezerwacji: data, godzina, liczba gości oraz specjalne życzenia lub uwagi.</li>
                    </ul>
                  </div>

                  <div className="space-y-2">
                    <h4 className="text-stone-200 font-serif font-medium tracking-wide">3. Cel Przetwarzania Danych</h4>
                    <p>
                      Twoje dane osobowe są wykorzystywane wyłącznie w następujących celach:
                    </p>
                    <ul className="list-disc pl-5 space-y-1 text-xs">
                      <li>Przetwarzanie, potwierdzanie, modyfikowanie i zarządzanie rezerwacją stolika w Rahito Głogów.</li>
                      <li>Umożliwienie samodzielnego zarządzania rezerwacją (w tym automatycznego anulowania za pośrednictwem e-maila).</li>
                      <li>Poinformowanie personelu kuchni i sali o Twoich życzeniach lub alergiach pokarmowych.</li>
                    </ul>
                  </div>

                  <div className="space-y-2">
                    <h4 className="text-stone-200 font-serif font-medium tracking-wide">4. Bezpieczeństwo i Przechowywanie Danych</h4>
                    <p>
                      Twoje dane osobowe są bezpiecznie przechowywane w zaszyfrowanej bazie danych w chmurze (Firestore) i mają do nich dostęp wyłącznie upoważnieni pracownicy restauracji. Dane będą przechowywane przez okres niezbędny do realizacji rezerwacji oraz celów rozliczeniowych, po czym zostaną usunięte lub zanonimizowane.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <h4 className="text-stone-200 font-serif font-medium tracking-wide">5. Udostępnianie Danych Podmiotom Trzecim</h4>
                    <p>
                      W żadnym wypadku nie sprzedajemy, nie handlujemy ani nie przekazujemy Twoich danych osobowych podmiotom zewnętrznym, z wyjątkiem sytuacji wymaganych przez prawo lub niezbędnych do działania usług technicznych (takich jak wysyłanie wiadomości e-mail przez SMTP).
                    </p>
                  </div>

                  <div className="space-y-2">
                    <h4 className="text-stone-200 font-serif font-medium tracking-wide">6. Twoje Prawa</h4>
                    <p>
                      Zgodnie z RODO przysługują Ci następujące prawa: prawo dostępu do danych, ich sprostowania, usunięcia („prawo do bycia zapomnianym”), ograniczenia przetwarzania oraz przenoszenia danych. Aby skorzystać z tych praw, napisz do nas na adres <a href="mailto:Rahitorestaurant@gmail.com" className="text-gold hover:underline">Rahitorestaurant@gmail.com</a>.
                    </p>
                  </div>
                </>
              )}
            </div>

            {/* Bottom button */}
            <div className="mt-8 pt-6 border-t border-border flex justify-end">
              <button
                onClick={onClose}
                className="px-6 py-2 bg-stone-900 border border-border text-stone-200 text-xs uppercase tracking-widest hover:border-gold hover:text-gold transition-colors duration-300 rounded cursor-pointer"
              >
                {lang === "es" ? "Entendido" : "Rozumiem"}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

export function TermsOfServiceModal({ isOpen, onClose, lang }: LegalModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 md:p-10">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/80 backdrop-blur-md"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", duration: 0.5 }}
            className="relative w-full max-w-2xl max-h-[80vh] overflow-y-auto border border-border bg-dark/95 backdrop-blur-md p-6 sm:p-10 rounded-lg shadow-2xl text-stone-300 z-10 font-sans custom-scrollbar"
          >
            {/* Top Close Button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 sm:top-6 sm:right-6 text-stone-500 hover:text-gold transition-colors p-2 rounded-full hover:bg-white/5 cursor-pointer"
              aria-label="Close modal"
            >
              <X size={18} />
            </button>

            {/* Content header */}
            <div className="flex items-center gap-4 border-b border-border pb-6 mb-6">
              <div className="w-10 h-10 rounded-full bg-gold/10 border border-gold/30 flex items-center justify-center text-gold">
                <FileText size={20} />
              </div>
              <div>
                <h3 className="text-xl sm:text-2xl font-serif font-light text-stone-100 tracking-wide">
                  {lang === "es" ? "Términos de Servicio" : "Regulamin Usług"}
                </h3>
                <p className="text-[10px] uppercase tracking-widest text-stone-500 mt-1">
                  {lang === "es" ? "Condiciones de Uso del Portal y Reservas" : "Zasady i Warunki Rezerwacji w Restauracji"}
                </p>
              </div>
            </div>

            {/* Legal content */}
            <div className="space-y-6 text-sm leading-relaxed text-stone-400 font-light">
              {lang === "es" ? (
                <>
                  <p>
                    Bienvenido al portal web y sistema de reservas de <strong>Rahito Głogów</strong>. Al utilizar este sitio web o realizar una reserva con nosotros, usted acepta cumplir y quedar sujeto a los siguientes términos y condiciones de servicio.
                  </p>

                  <div className="space-y-2">
                    <h4 className="text-stone-200 font-serif font-medium tracking-wide">1. Exactitud de la Información</h4>
                    <p>
                      Al utilizar nuestro sistema de reservas, el usuario se compromete a proporcionar información de contacto verídica, exacta y actualizada (nombre, correo electrónico y número de teléfono). Nos reservamos el derecho de cancelar cualquier reserva si los datos de contacto proporcionados son falsos o incompletos.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <h4 className="text-stone-200 font-serif font-medium tracking-wide">2. Confirmación y Disponibilidad</h4>
                    <p>
                      El envío de la reserva a través del formulario web inicial genera un estado de solicitud. Aunque nuestro sistema gestiona la asignación de mesas en tiempo real según la disponibilidad, el restaurante se reserva el derecho de ajustar o reprogramar reservas en circunstancias excepcionales, notificando siempre con antelación.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <h4 className="text-stone-200 font-serif font-medium tracking-wide">3. Política de Cancelación y Modificación</h4>
                    <p>
                      Si necesita cancelar o modificar su reserva, le rogamos encarecidamente que lo haga con una antelación mínima de <strong>2 horas</strong>. Puede anular su mesa de forma inmediata haciendo clic en el botón "Anular mi Reserva" que encontrará en el correo electrónico de confirmación enviado por el sistema.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <h4 className="text-stone-200 font-serif font-medium tracking-wide">4. Tiempos de Cortesía (Retrasos)</h4>
                    <p>
                      Para garantizar el correcto flujo de nuestro servicio y respetar la experiencia de todos nuestros comensales, mantendremos su mesa reservada durante un máximo de <strong>15 minutos de cortesía</strong> sobre la hora acordada. Pasado este tiempo sin haber recibido aviso de retraso por su parte, consideraremos la reserva como "no presentado" (no-show) y la mesa quedará libre para otros comensales.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <h4 className="text-stone-200 font-serif font-medium tracking-wide">5. Modificaciones del Servicio</h4>
                    <p>
                      Rahito Głogów se reserva el derecho de modificar los menús, horarios de apertura, precios e ingredientes descritos en esta web de acuerdo con la disponibilidad del mercado de temporada y decisiones operativas internas.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <h4 className="text-stone-200 font-serif font-medium tracking-wide">6. Limitación de Responsabilidad</h4>
                    <p>
                      El restaurante no se hace responsable de las interrupciones técnicas temporales de la plataforma web o de los fallos en el sistema de mensajería SMTP ajenos a nuestro control directo. Si no recibe el correo de confirmación, le sugerimos revisar su carpeta de correo no deseado (spam) o contactarnos telefónicamente.
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <p>
                    Witamy na stronie internetowej i w systemie rezerwacji <strong>Rahito Głogów</strong>. Korzystając z tej strony internetowej lub dokonując rezerwacji, wyrażasz zgodę na przestrzeganie poniższych warunków i zasad świadczenia usług.
                  </p>

                  <div className="space-y-2">
                    <h4 className="text-stone-200 font-serif font-medium tracking-wide">1. Prawdziwość Podanych Informacji</h4>
                    <p>
                      Korzystając z systemu rezerwacji, użytkownik zobowiązuje się do podania prawdziwych, dokładnych i aktualnych danych kontaktowych (imię i nazwisko, adres e-mail oraz numer telefonu). Zastrzegamy sobie prawo do anulowania rezerwacji, jeśli podane dane kontaktowe są nieprawidłowe lub niekompletne.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <h4 className="text-stone-200 font-serif font-medium tracking-wide">2. Potwierdzenie i Dostępność Stolików</h4>
                    <p>
                      Przesłanie formularza rezerwacyjnego generuje zgłoszenie w naszym systemie. Choć system automatycznie przydziela stoliki w oparciu o bieżącą dostępność, restauracja zastrzega sobie prawo do zmiany lub anulowania rezerwacji w wyjątkowych okolicznościach, o czym niezwłocznie poinformuje klienta.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <h4 className="text-stone-200 font-serif font-medium tracking-wide">3. Polityka Anulowania i Zmian</h4>
                    <p>
                      Jeśli chcesz anulować lub zmienić rezerwację, prosimy o dokonanie tego co najmniej <strong>2 godziny</strong> przed planowanym czasem wizyty. Rezerwację można anulować natychmiast, klikając przycisk „Anuluj moją rezerwację” w wiadomości e-mail z potwierdzeniem.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <h4 className="text-stone-200 font-serif font-medium tracking-wide">4. Czas Oczekiwania (Spóźnienia)</h4>
                    <p>
                      W trosce o płynność serwisu i komfort wszystkich naszych gości, stolik utrzymujemy przez maksymalnie <strong>15 minut</strong> od planowanej godziny rezerwacji. Po tym czasie, bez uprzedniego powiadomienia ze strony klienta, rezerwacja zostanie uznana za nieaktualną, a stolik zostanie udostępniony innym gościom.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <h4 className="text-stone-200 font-serif font-medium tracking-wide">5. Zmiany w Ofercie</h4>
                    <p>
                      Rahito Głogów zastrzega sobie prawo do zmiany menu, godzin otwarcia, cen oraz składników dań opisanych na stronie internetowej, w zależności od sezonowej dostępności produktów oraz wewnętrznych decyzji operacyjnych.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <h4 className="text-stone-200 font-serif font-medium tracking-wide">6. Ograniczenie Odpowiedzialności</h4>
                    <p>
                      Restauracja nie ponosi odpowiedzialności za tymczasowe błędy techniczne platformy internetowej lub opóźnienia w dostarczaniu wiadomości e-mail (SMTP) z przyczyn niezależnych od nas. W przypadku braku maila potwierdzającego, prosimy o sprawdzenie folderu Spam lub kontakt telefoniczny.
                    </p>
                  </div>
                </>
              )}
            </div>

            {/* Bottom button */}
            <div className="mt-8 pt-6 border-t border-border flex justify-end">
              <button
                onClick={onClose}
                className="px-6 py-2 bg-stone-900 border border-border text-stone-200 text-xs uppercase tracking-widest hover:border-gold hover:text-gold transition-colors duration-300 rounded cursor-pointer"
              >
                {lang === "es" ? "Entendido" : "Rozumiem"}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
