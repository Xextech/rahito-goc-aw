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
                    En <strong>Rahito Głogów</strong>, valoramos y respetamos su privacidad. Esta Política de Privacidad describe cómo recopilamos, utilizamos y protegemos la información personal que nos proporciona al utilizar nuestro sitio web y sistema de reservas en línea, de conformidad con el Reglamento (UE) 2016/679 (RGPD) y la Ley polaca de 10 de mayo de 2018 de Protección de Datos Personales (<em>Ustawa o ochronie danych osobowych</em>).
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
                      <li>Detalles de la reserva: fecha, hora, número de comensales y, en su caso, tipo de evento.</li>
                    </ul>
                  </div>

                  <div className="space-y-2">
                    <h4 className="text-stone-200 font-serif font-medium tracking-wide">3. Base Legal y Finalidad del Tratamiento</h4>
                    <p>
                      Tratamos sus datos sobre las siguientes bases legales del artículo 6.1 RGPD:
                    </p>
                    <ul className="list-disc pl-5 space-y-1 text-xs">
                      <li><strong>Ejecución de un contrato</strong> (art. 6.1.b): procesar, confirmar, modificar y gestionar su reserva o evento privado, incluida la autogestión de la cancelación.</li>
                      <li><strong>Obligación legal</strong> (art. 6.1.c): conservación de registros con fines fiscales y contables cuando proceda.</li>
                      <li><strong>Interés legítimo</strong> (art. 6.1.f): prevención de abusos del sistema de reservas (por ejemplo, límites de peticiones para evitar el bloqueo malicioso del calendario) y seguridad técnica del servicio.</li>
                    </ul>
                  </div>

                  <div className="space-y-2">
                    <h4 className="text-stone-200 font-serif font-medium tracking-wide">4. Cookies y Almacenamiento Local</h4>
                    <p>
                      Utilizamos únicamente almacenamiento técnico estrictamente necesario: una cookie/registro local para recordar su decisión sobre el aviso de cookies y su idioma preferido (ES/PL). No utilizamos cookies de analítica, publicidad ni seguimiento de terceros. Esta gestión se ajusta al art. 402 de la Ley de Comunicaciones Electrónicas de 12 de julio de 2024 (<em>Prawo komunikacji elektronicznej</em>, que sustituyó al art. 173 de la anterior Ley de Telecomunicaciones), que exige informar y, salvo excepción técnica, recabar su consentimiento antes de almacenar información en su dispositivo.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <h4 className="text-stone-200 font-serif font-medium tracking-wide">5. Destinatarios y Transferencias Internacionales</h4>
                    <p>
                      Sus datos nunca son de acceso público: se procesan exclusivamente en nuestro servidor y solo son legibles por el personal autorizado del restaurante. Compartimos datos únicamente con los proveedores estrictamente necesarios para prestar el servicio: nuestro proveedor de alojamiento e infraestructura en la nube (Google Cloud / Firebase) y nuestro proveedor de correo SMTP para el envío de confirmaciones. Estos proveedores pueden implicar transferencias fuera del Espacio Económico Europeo, amparadas por Cláusulas Contractuales Tipo de la UE u otras garantías equivalentes reconocidas por el RGPD.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <h4 className="text-stone-200 font-serif font-medium tracking-wide">6. Conservación y Seguridad de los Datos</h4>
                    <p>
                      Sus datos se almacenan en una base de datos en la nube cifrada (Firestore) protegida por reglas de acceso restrictivas y limitación de peticiones (rate limiting) frente a abusos automatizados. Se conservan durante un máximo de 12 meses desde la fecha de la reserva, salvo que la ley exija un plazo mayor con fines contables, tras lo cual se eliminan o anonimizan.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <h4 className="text-stone-200 font-serif font-medium tracking-wide">7. Sus Derechos</h4>
                    <p>
                      De conformidad con el RGPD, usted dispone de los derechos de acceso, rectificación, supresión ("derecho al olvido"), limitación del tratamiento, portabilidad y oposición. Para ejercerlos, escriba a <a href="mailto:Rahitorestaurant@gmail.com" className="text-gold hover:underline">Rahitorestaurant@gmail.com</a>. Responderemos en el plazo de un mes conforme al art. 12.3 RGPD.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <h4 className="text-stone-200 font-serif font-medium tracking-wide">8. Reclamaciones ante la Autoridad de Control</h4>
                    <p>
                      Si considera que el tratamiento de sus datos personales infringe la normativa, tiene derecho a presentar una reclamación ante el <strong>Prezes Urzędu Ochrony Danych Osobowych (UODO)</strong>, ul. Stawki 2, 00-193 Varsovia, Polonia (<a href="https://uodo.gov.pl" target="_blank" rel="noopener noreferrer" className="text-gold hover:underline">uodo.gov.pl</a>), o ante la autoridad de protección de datos de su país de residencia dentro de la UE.
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <p>
                    W <strong>Rahito Głogów</strong> cenimy i szanujemy Twoją prywatność. Niniejsza Polityka Prywatności określa, w jaki sposób gromadzimy, przetwarzamy i chronimy dane osobowe przekazywane nam podczas korzystania ze strony internetowej i systemu rezerwacji, zgodnie z Rozporządzeniem (UE) 2016/679 (RODO) oraz ustawą z dnia 10 maja 2018 r. o ochronie danych osobowych.
                  </p>

                  <div className="space-y-2">
                    <h4 className="text-stone-200 font-serif font-medium tracking-wide">1. Administrator Danych Osobowych</h4>
                    <p>
                      Administratorem Twoich danych osobowych jest <strong>Rahito Głogów</strong>, z siedzibą pod adresem ul. Stawna 8, 67-200 Głogów, Polska. Możesz się z nami skontaktować pod adresem e-mail: <a href="mailto:Rahitorestaurant@gmail.com" className="text-gold hover:underline">Rahitorestaurant@gmail.com</a>.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <h4 className="text-stone-200 font-serif font-medium tracking-wide">2. Jakie Dane Osobowe Gromadzimy</h4>
                    <p>
                      Podczas dokonywania rezerwacji zbieramy wyłącznie dane niezbędne do jej prawidłowej obsługi:
                    </p>
                    <ul className="list-disc pl-5 space-y-1 text-xs">
                      <li>Imię i nazwisko w celu identyfikacji rezerwacji.</li>
                      <li>Adres e-mail w celu przesyłania automatycznych potwierdzeń oraz linków do anulowania.</li>
                      <li>Numer telefonu w celu kontaktu w razie zmian lub pytań dotyczących rezerwacji.</li>
                      <li>Szczegóły rezerwacji: data, godzina, liczba gości oraz ewentualny rodzaj wydarzenia.</li>
                    </ul>
                  </div>

                  <div className="space-y-2">
                    <h4 className="text-stone-200 font-serif font-medium tracking-wide">3. Podstawa Prawna i Cel Przetwarzania</h4>
                    <p>
                      Przetwarzamy Twoje dane na następujących podstawach z art. 6 ust. 1 RODO:
                    </p>
                    <ul className="list-disc pl-5 space-y-1 text-xs">
                      <li><strong>Wykonanie umowy</strong> (art. 6 ust. 1 lit. b): obsługa rezerwacji lub wydarzenia prywatnego, w tym samodzielne anulowanie.</li>
                      <li><strong>Obowiązek prawny</strong> (art. 6 ust. 1 lit. c): przechowywanie dokumentacji do celów podatkowo-księgowych, gdy ma to zastosowanie.</li>
                      <li><strong>Uzasadniony interes</strong> (art. 6 ust. 1 lit. f): zapobieganie nadużyciom systemu rezerwacji (np. limity zapytań chroniące kalendarz przed złośliwym blokowaniem) oraz bezpieczeństwo techniczne usługi.</li>
                    </ul>
                  </div>

                  <div className="space-y-2">
                    <h4 className="text-stone-200 font-serif font-medium tracking-wide">4. Pliki Cookie i Przechowywanie Lokalne</h4>
                    <p>
                      Wykorzystujemy wyłącznie ściśle niezbędne przechowywanie techniczne: zapis lokalny Twojej decyzji dotyczącej banera cookies oraz wybranego języka (PL/ES). Nie stosujemy plików cookie analitycznych, reklamowych ani śledzących podmiotów trzecich. Jest to zgodne z art. 402 ustawy z dnia 12 lipca 2024 r. – Prawo komunikacji elektronicznej (która zastąpiła art. 173 dawnej ustawy Prawo telekomunikacyjne), wymagającym poinformowania i, co do zasady, uzyskania zgody przed zapisaniem informacji na Twoim urządzeniu.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <h4 className="text-stone-200 font-serif font-medium tracking-wide">5. Odbiorcy Danych i Transfery Międzynarodowe</h4>
                    <p>
                      Twoje dane nigdy nie są publicznie dostępne: przetwarzane są wyłącznie po stronie naszego serwera i dostęp do nich ma jedynie upoważniony personel restauracji. Udostępniamy dane wyłącznie dostawcom niezbędnym do świadczenia usługi: dostawcy infrastruktury chmurowej (Google Cloud / Firebase) oraz dostawcy poczty SMTP wysyłającemu potwierdzenia. Może to wiązać się z przekazywaniem danych poza Europejski Obszar Gospodarczy, zabezpieczonym Standardowymi Klauzulami Umownymi UE lub innymi mechanizmami zgodnymi z RODO.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <h4 className="text-stone-200 font-serif font-medium tracking-wide">6. Bezpieczeństwo i Przechowywanie Danych</h4>
                    <p>
                      Dane przechowywane są w zaszyfrowanej bazie danych w chmurze (Firestore), chronionej restrykcyjnymi regułami dostępu oraz limitowaniem liczby zapytań (rate limiting) przed automatycznymi nadużyciami. Dane przechowujemy maksymalnie przez 12 miesięcy od daty rezerwacji, chyba że przepisy prawa wymagają dłuższego okresu z przyczyn podatkowo-księgowych, po czym są usuwane lub anonimizowane.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <h4 className="text-stone-200 font-serif font-medium tracking-wide">7. Twoje Prawa</h4>
                    <p>
                      Zgodnie z RODO przysługują Ci prawa: dostępu do danych, sprostowania, usunięcia („prawo do bycia zapomnianym”), ograniczenia przetwarzania, przenoszenia danych oraz sprzeciwu. Aby z nich skorzystać, napisz na adres <a href="mailto:Rahitorestaurant@gmail.com" className="text-gold hover:underline">Rahitorestaurant@gmail.com</a>. Odpowiemy w terminie miesiąca zgodnie z art. 12 ust. 3 RODO.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <h4 className="text-stone-200 font-serif font-medium tracking-wide">8. Skarga do Organu Nadzorczego</h4>
                    <p>
                      Jeśli uważasz, że przetwarzanie Twoich danych osobowych narusza przepisy, masz prawo wnieść skargę do <strong>Prezesa Urzędu Ochrony Danych Osobowych (UODO)</strong>, ul. Stawki 2, 00-193 Warszawa (<a href="https://uodo.gov.pl" target="_blank" rel="noopener noreferrer" className="text-gold hover:underline">uodo.gov.pl</a>), lub do organu ochrony danych właściwego dla Twojego kraju zamieszkania w UE.
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
                    Bienvenido al portal web y sistema de reservas de <strong>Rahito Głogów</strong>. Al utilizar este sitio web o realizar una reserva con nosotros, usted acepta cumplir y quedar sujeto a los siguientes términos y condiciones de servicio, redactados conforme al derecho polaco y a la normativa de protección de consumidores de la Unión Europea.
                  </p>

                  <div className="space-y-2">
                    <h4 className="text-stone-200 font-serif font-medium tracking-wide">1. Exactitud de la Información y Capacidad</h4>
                    <p>
                      Al utilizar nuestro sistema de reservas, el usuario se compromete a proporcionar información de contacto verídica, exacta y actualizada (nombre, correo electrónico y número de teléfono), y declara ser mayor de edad y tener capacidad legal para contratar. Nos reservamos el derecho de cancelar cualquier reserva si los datos de contacto proporcionados son falsos o incompletos.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <h4 className="text-stone-200 font-serif font-medium tracking-wide">2. Confirmación y Asignación de Mesa</h4>
                    <p>
                      Nuestro sistema valida la disponibilidad real y asigna la mesa automáticamente en el servidor en el momento de la reserva, respetando un margen mínimo de <strong>2 horas</strong> de ocupación por mesa. El restaurante se reserva el derecho de ajustar o reprogramar reservas en circunstancias excepcionales, notificando siempre con antelación.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <h4 className="text-stone-200 font-serif font-medium tracking-wide">3. Eventos Privados</h4>
                    <p>
                      La reserva del restaurante completo para un evento privado bloquea el establecimiento en exclusiva para ese día. Estas reservas están sujetas a confirmación por nuestro equipo y a condiciones particulares (aforo, horario y menú) que se acordarán directamente con el cliente por correo electrónico o teléfono.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <h4 className="text-stone-200 font-serif font-medium tracking-wide">4. Política de Cancelación y Modificación</h4>
                    <p>
                      Si necesita cancelar o modificar su reserva, le rogamos encarecidamente que lo haga con una antelación mínima de <strong>2 horas</strong>. Puede anular su mesa de forma inmediata haciendo clic en el botón "Anular mi Reserva" que encontrará en el correo electrónico de confirmación enviado por el sistema.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <h4 className="text-stone-200 font-serif font-medium tracking-wide">5. Tiempos de Cortesía (Retrasos)</h4>
                    <p>
                      Para garantizar el correcto flujo de nuestro servicio, mantendremos su mesa reservada durante un máximo de <strong>15 minutos de cortesía</strong> sobre la hora acordada. Pasado este tiempo sin aviso de retraso, consideraremos la reserva como "no presentado" (no-show) y la mesa quedará libre para otros comensales.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <h4 className="text-stone-200 font-serif font-medium tracking-wide">6. Derecho de Desistimiento</h4>
                    <p>
                      De acuerdo con el artículo 38, apartado 12, de la Ley polaca de Derechos del Consumidor de 30 de mayo de 2014 (<em>Ustawa o prawach konsumenta</em>), que traspone la Directiva 2011/83/UE, los contratos de prestación de servicios de restauración y ocio vinculados a una fecha u hora concreta —como las reservas de mesa o de evento— quedan excluidos del derecho de desistimiento de 14 días aplicable a otras compras a distancia. Las cancelaciones se rigen, por tanto, por la política del apartado 4 anterior.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <h4 className="text-stone-200 font-serif font-medium tracking-wide">7. Modificaciones del Servicio</h4>
                    <p>
                      Rahito Głogów se reserva el derecho de modificar los menús, horarios de apertura, precios e ingredientes descritos en esta web de acuerdo con la disponibilidad del mercado de temporada y decisiones operativas internas.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <h4 className="text-stone-200 font-serif font-medium tracking-wide">8. Limitación de Responsabilidad</h4>
                    <p>
                      El restaurante no se hace responsable de las interrupciones técnicas temporales de la plataforma web o de los fallos en el sistema de mensajería SMTP ajenos a nuestro control directo. Si no recibe el correo de confirmación, le sugerimos revisar su carpeta de correo no deseado (spam) o contactarnos telefónicamente.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <h4 className="text-stone-200 font-serif font-medium tracking-wide">9. Ley Aplicable y Resolución de Conflictos</h4>
                    <p>
                      Estos términos se rigen por la legislación polaca. Como consumidor de la UE, tiene derecho a acudir a mecanismos de resolución alternativa de litigios (ADR) ante el rzecznik konsumentów competente o la <strong>UOKiK</strong>, así como a la plataforma europea de resolución de litigios en línea: <a href="https://ec.europa.eu/consumers/odr" target="_blank" rel="noopener noreferrer" className="text-gold hover:underline">ec.europa.eu/consumers/odr</a>.
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <p>
                    Witamy na stronie internetowej i w systemie rezerwacji <strong>Rahito Głogów</strong>. Korzystając z tej strony internetowej lub dokonując rezerwacji, wyrażasz zgodę na przestrzeganie poniższych warunków, sporządzonych zgodnie z prawem polskim oraz przepisami UE o ochronie konsumentów.
                  </p>

                  <div className="space-y-2">
                    <h4 className="text-stone-200 font-serif font-medium tracking-wide">1. Prawdziwość Podanych Informacji i Zdolność do Czynności Prawnych</h4>
                    <p>
                      Korzystając z systemu rezerwacji, użytkownik zobowiązuje się do podania prawdziwych, dokładnych i aktualnych danych kontaktowych (imię i nazwisko, adres e-mail oraz numer telefonu) oraz oświadcza, że jest pełnoletni i posiada pełną zdolność do czynności prawnych. Zastrzegamy sobie prawo do anulowania rezerwacji, jeśli podane dane kontaktowe są nieprawidłowe lub niekompletne.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <h4 className="text-stone-200 font-serif font-medium tracking-wide">2. Potwierdzenie i Przydział Stolika</h4>
                    <p>
                      Nasz system weryfikuje rzeczywistą dostępność i automatycznie przydziela stolik po stronie serwera w momencie rezerwacji, zachowując minimalny odstęp <strong>2 godzin</strong> zajętości stolika. Restauracja zastrzega sobie prawo do zmiany lub anulowania rezerwacji w wyjątkowych okolicznościach, o czym niezwłocznie poinformuje klienta.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <h4 className="text-stone-200 font-serif font-medium tracking-wide">3. Wydarzenia Prywatne</h4>
                    <p>
                      Rezerwacja całej restauracji na wydarzenie prywatne blokuje lokal wyłącznie na ten dzień. Takie rezerwacje wymagają potwierdzenia przez nasz zespół i podlegają indywidualnym ustaleniom (liczba gości, godziny, menu) uzgadnianym bezpośrednio z klientem e-mailowo lub telefonicznie.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <h4 className="text-stone-200 font-serif font-medium tracking-wide">4. Polityka Anulowania i Zmian</h4>
                    <p>
                      Jeśli chcesz anulować lub zmienić rezerwację, prosimy o dokonanie tego co najmniej <strong>2 godziny</strong> przed planowanym czasem wizyty. Rezerwację można anulować natychmiast, klikając przycisk „Anuluj moją rezerwację” w wiadomości e-mail z potwierdzeniem.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <h4 className="text-stone-200 font-serif font-medium tracking-wide">5. Czas Oczekiwania (Spóźnienia)</h4>
                    <p>
                      W trosce o płynność serwisu stolik utrzymujemy przez maksymalnie <strong>15 minut</strong> od planowanej godziny rezerwacji. Po tym czasie, bez uprzedniego powiadomienia, rezerwacja zostanie uznana za nieaktualną, a stolik udostępniony innym gościom.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <h4 className="text-stone-200 font-serif font-medium tracking-wide">6. Prawo Odstąpienia od Umowy</h4>
                    <p>
                      Zgodnie z art. 38 pkt 12 ustawy z dnia 30 maja 2014 r. o prawach konsumenta, implementującej dyrektywę 2011/83/UE, umowy o świadczenie usług związanych z wypoczynkiem oraz usług gastronomicznych, w których oznaczono dzień lub okres świadczenia usługi — takie jak rezerwacje stolika lub wydarzenia — są wyłączone spod 14-dniowego prawa odstąpienia przysługującego przy innych umowach zawieranych na odległość. Anulowanie rezerwacji podlega zatem zasadom opisanym w punkcie 4 powyżej.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <h4 className="text-stone-200 font-serif font-medium tracking-wide">7. Zmiany w Ofercie</h4>
                    <p>
                      Rahito Głogów zastrzega sobie prawo do zmiany menu, godzin otwarcia, cen oraz składników dań opisanych na stronie internetowej, w zależności od sezonowej dostępności produktów oraz wewnętrznych decyzji operacyjnych.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <h4 className="text-stone-200 font-serif font-medium tracking-wide">8. Ograniczenie Odpowiedzialności</h4>
                    <p>
                      Restauracja nie ponosi odpowiedzialności za tymczasowe błędy techniczne platformy internetowej lub opóźnienia w dostarczaniu wiadomości e-mail (SMTP) z przyczyn niezależnych od nas. W przypadku braku maila potwierdzającego, prosimy o sprawdzenie folderu Spam lub kontakt telefoniczny.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <h4 className="text-stone-200 font-serif font-medium tracking-wide">9. Prawo Właściwe i Rozstrzyganie Sporów</h4>
                    <p>
                      Niniejszy regulamin podlega prawu polskiemu. Jako konsumentowi z UE przysługuje Ci prawo do skorzystania z pozasądowych sposobów rozpatrywania reklamacji i dochodzenia roszczeń (ADR) za pośrednictwem właściwego rzecznika konsumentów lub <strong>UOKiK</strong>, a także z unijnej platformy internetowego rozstrzygania sporów: <a href="https://ec.europa.eu/consumers/odr" target="_blank" rel="noopener noreferrer" className="text-gold hover:underline">ec.europa.eu/consumers/odr</a>.
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
