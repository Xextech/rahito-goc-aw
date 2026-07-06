import React from "react";
import { X, Printer } from "lucide-react";

interface LegalModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: "es" | "pl";
}

export function PrivacyPolicyModal({ isOpen, onClose, lang }: LegalModalProps) {
  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/80 backdrop-blur-sm">
      <div className="relative w-full max-w-3xl max-h-[85vh] overflow-y-auto bg-stone-900 border border-stone-800 rounded-lg shadow-2xl p-6 text-stone-300">
        {/* Sticky header */}
        <div className="sticky top-0 bg-stone-900 pb-4 border-b border-stone-800 flex items-center justify-between mb-6">
          <h2 className="font-serif text-2xl text-gold tracking-wide">
            {lang === "es" ? "Política de Privacidad (GDPR)" : "Polityka Prywatności (RODO)"}
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="p-2 text-stone-400 hover:text-gold hover:bg-stone-800 rounded transition-colors"
              title={lang === "es" ? "Imprimir" : "Drukuj"}
            >
              <Printer size={18} />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-stone-400 hover:text-stone-100 hover:bg-stone-800 rounded transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="space-y-6 text-sm leading-relaxed pr-2">
          {lang === "es" ? (
            <>
              <p className="text-stone-400">Última actualización: Julio 2026</p>
              <p>
                De conformidad con el <strong>Reglamento General de Protección de Datos (GDPR / RGPD)</strong> de la Unión Europea, le informamos en detalle sobre cómo tratamos sus datos personales al utilizar el servicio de reservas de <strong>Rahito Głogów</strong>.
              </p>

              <section className="space-y-2">
                <h3 className="font-serif text-lg text-stone-100">1. Responsable del Tratamiento de Datos</h3>
                <p>
                  El responsable del tratamiento de sus datos personales es:<br />
                  <strong>RAHITO GŁOGÓW</strong><br />
                  Dirección: Stawna 8, 67-200 Głogów, Polonia<br />
                  Contacto: <a href="mailto:bove.abt@gmail.com" className="text-gold underline">bove.abt@gmail.com</a>
                </p>
              </section>

              <section className="space-y-2">
                <h3 className="font-serif text-lg text-stone-100">2. Datos que Recopilamos</h3>
                <p>
                  Recopilamos y tratamos los datos personales estrictamente necesarios para gestionar su reserva:
                </p>
                <ul className="list-disc list-inside space-y-1 pl-2">
                  <li>Nombre y apellidos (para la asignación de la mesa).</li>
                  <li>Dirección de correo electrónico (para el envío de la confirmación y avisos).</li>
                  <li>Número de teléfono (para emergencias, cancelaciones o demoras).</li>
                  <li>Detalles de la reserva: fecha, hora, número de comensales.</li>
                </ul>
              </section>

              <section className="space-y-2">
                <h3 className="font-serif text-lg text-stone-100">3. Finalidad y Base Legal del Tratamiento</h3>
                <p>
                  Tratamos sus datos basándonos en:
                </p>
                <ul className="list-disc list-inside space-y-1 pl-2">
                  <li><strong>Ejecución del contrato / reserva (Art. 6.1.b GDPR):</strong> Tratamiento necesario para formalizar y garantizar su reserva de mesa en nuestro restaurante.</li>
                  <li><strong>Consentimiento explícito (Art. 6.1.a GDPR):</strong> Su aceptación voluntaria al marcar la casilla de consentimiento durante el proceso de reserva.</li>
                </ul>
              </section>

              <section className="space-y-2">
                <h3 className="font-serif text-lg text-stone-100">4. Plazo de Conservación de Datos</h3>
                <p>
                  Los datos de reservas de mesas se conservarán durante un período máximo de 12 meses tras la fecha de la reserva con fines estadísticos, de control y resolución de incidencias, tras el cual serán completamente eliminados o anonimizados, salvo requerimiento legal en Polonia.
                </p>
              </section>

              <section className="space-y-2">
                <h3 className="font-serif text-lg text-stone-100">5. Compartición de Datos</h3>
                <p>
                  No vendemos, alquilamos ni cedemos sus datos personales a terceros. Los datos se almacenan de forma segura en bases de datos de Firebase (Google Cloud) ubicadas en la Unión Europea. Sus datos podrán ser tratados mediante correo electrónico SMTP (Nodemailer) únicamente para enviarle alertas sobre su reserva.
                </p>
              </section>

              <section className="space-y-2">
                <h3 className="font-serif text-lg text-stone-100">6. Sus Derechos (Derechos GDPR)</h3>
                <p>
                  Como titular de los datos, tiene derecho a:
                </p>
                <ul className="list-disc list-inside space-y-1 pl-2">
                  <li>Acceder a sus datos personales almacenados.</li>
                  <li>Solicitar la rectificación de datos inexactos.</li>
                  <li>Solicitar la supresión de sus datos ("derecho al olvido").</li>
                  <li>Limitar u oponerse al tratamiento.</li>
                  <li>Presentar una reclamación ante la autoridad de protección de datos competente en Polonia (<strong>UODO - Urząd Ochrony Danych Osobowych</strong>, ul. Stawki 2, Varsovia).</li>
                </ul>
                <p className="mt-2">
                  Para ejercer sus derechos, póngase en contacto con nosotros en <a href="mailto:bove.abt@gmail.com" className="text-gold underline">bove.abt@gmail.com</a>.
                </p>
              </section>
            </>
          ) : (
            <>
              <p className="text-stone-400">Ostatnia aktualizacja: Lipiec 2026 r.</p>
              <p>
                Zgodnie z <strong>Ogólnym Rozporządzeniem o Ochronie Danych (RODO / GDPR)</strong> Unii Europejskiej, informujemy szczegółowo o zasadach przetwarzania danych osobowych w związku z korzystaniem z systemu rezerwacji stolików w restauracji <strong>Rahito Głogów</strong>.
              </p>

              <section className="space-y-2">
                <h3 className="font-serif text-lg text-stone-100">1. Administrator Danych Osobowych</h3>
                <p>
                  Administratorem Państwa danych osobowych jest:<br />
                  <strong>RAHITO GŁOGÓW</strong><br />
                  Adres: Stawna 8, 67-200 Głogów, Polska<br />
                  Kontakt: <a href="mailto:bove.abt@gmail.com" className="text-gold underline">bove.abt@gmail.com</a>
                </p>
              </section>

              <section className="space-y-2">
                <h3 className="font-serif text-lg text-stone-100">2. Przetwarzane Dane Osobowe</h3>
                <p>
                  Zbieramy i przetwarzamy wyłącznie dane niezbędne do prawidłowej realizacji rezerwacji stolika:
                </p>
                <ul className="list-disc list-inside space-y-1 pl-2">
                  <li>Imię i nazwisko (w celu identyfikacji rezerwacji).</li>
                  <li>Adres e-mail (w celu wysłania potwierdzenia i informacji o rezerwacji).</li>
                  <li>Numer telefonu (w celu kontaktu w sprawach nagłych, opóźnień lub anulacji).</li>
                  <li>Szczegóły rezerwacji: data, godzina, liczba gości.</li>
                </ul>
              </section>

              <section className="space-y-2">
                <h3 className="font-serif text-lg text-stone-100">3. Cel i Podstawa Prawna Przetwarzania</h3>
                <p>
                  Państwa dane osobowe przetwarzane są na podstawie:
                </p>
                <ul className="list-disc list-inside space-y-1 pl-2">
                  <li><strong>Niezbędność do wykonania usługi (Art. 6 ust. 1 lit. b RODO):</strong> Przetwarzanie danych jest konieczne do dokonania i zarządzania rezerwacją stolika.</li>
                  <li><strong>Zgoda użytkownika (Art. 6 ust. 1 lit. a RODO):</strong> Dobrowolne zaznaczenie pola zgody podczas procesu rezerwacji na stronie internetowej.</li>
                </ul>
              </section>

              <section className="space-y-2">
                <h3 className="font-serif text-lg text-stone-100">4. Okres Przechowywania Danych</h3>
                <p>
                  Dane osobowe powiązane z rezerwacjami stolików będą przechowywane przez okres nie dłuższy niż 12 miesięcy od daty planowanej rezerwacji w celach statystycznych i rozpatrywania ewentualnych reklamacji, po czym zostaną trwale usunięte, chyba że dalsze przechowywanie wynika z obowiązujących przepisów prawa podatkowego lub cywilnego w Polsce.
                </p>
              </section>

              <section className="space-y-2">
                <h3 className="font-serif text-lg text-stone-100">5. Odbiorcy Danych</h3>
                <p>
                  Państwa dane nie są sprzedawane ani udostępniane podmiotom komercyjnym. Dane są bezpiecznie przechowywane w bazie danych Firebase (Google Cloud) na serwerach zlokalizowanych w UE. Powiadomienia e-mail o rezerwacjach są przesyłane za pomocą bezpiecznego protokołu SMTP.
                </p>
              </section>

              <section className="space-y-2">
                <h3 className="font-serif text-lg text-stone-100">6. Prawa Użytkownika (Prawa RODO)</h3>
                <p>
                  Każdej osobie, której dane dotyczą, przysługuje prawo do:
                </p>
                <ul className="list-disc list-inside space-y-1 pl-2">
                  <li>Wglądu (dostępu) do swoich danych osobowych.</li>
                  <li>Sprostowania (poprawiania) nieprawidłowych danych.</li>
                  <li>Usunięcia danych ("prawo do bycia zapomnianym").</li>
                  <li>Ograniczenia lub wniesienia sprzeciwu wobec przetwarzania.</li>
                  <li>Wniesienia skargi do organu nadzorczego w Polsce: <strong>UODO - Urząd Ochrony Danych Osobowych</strong>, ul. Stawki 2, 00-193 Warszawa.</li>
                </ul>
                <p className="mt-2">
                  Aby skorzystać ze swoich praw, prosimy o kontakt pod adresem <a href="mailto:bove.abt@gmail.com" className="text-gold underline">bove.abt@gmail.com</a>.
                </p>
              </section>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export function TermsOfServiceModal({ isOpen, onClose, lang }: LegalModalProps) {
  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/80 backdrop-blur-sm">
      <div className="relative w-full max-w-3xl max-h-[85vh] overflow-y-auto bg-stone-900 border border-stone-800 rounded-lg shadow-2xl p-6 text-stone-300">
        {/* Sticky header */}
        <div className="sticky top-0 bg-stone-900 pb-4 border-b border-stone-800 flex items-center justify-between mb-6">
          <h2 className="font-serif text-2xl text-gold tracking-wide">
            {lang === "es" ? "Términos de Servicio" : "Regulamin Usługi"}
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="p-2 text-stone-400 hover:text-gold hover:bg-stone-800 rounded transition-colors"
              title={lang === "es" ? "Imprimir" : "Drukuj"}
            >
              <Printer size={18} />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-stone-400 hover:text-stone-100 hover:bg-stone-800 rounded transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="space-y-6 text-sm leading-relaxed pr-2">
          {lang === "es" ? (
            <>
              <p className="text-stone-400">Última actualización: Julio 2026</p>
              <p>
                Los presentes Términos de Servicio regulan el uso del sistema de reservas en línea de <strong>Rahito Głogów</strong> disponible a través de nuestro sitio web. Al efectuar una reserva, usted acepta íntegramente estas condiciones.
              </p>

              <section className="space-y-2">
                <h3 className="font-serif text-lg text-stone-100">1. Condiciones de la Reserva</h3>
                <p>
                  * <strong>Capacidad y Disponibilidad:</strong> La reserva está sujeta a la disponibilidad de mesas en el restaurante. Rahito Głogów cuenta con una capacidad íntima para garantizar una experiencia exclusiva.
                  <br />
                  * <strong>Puntualidad:</strong> Las mesas reservadas se mantendrán durante un máximo de 15 minutos de cortesía tras la hora acordada. Pasado este tiempo, el restaurante se reserva el derecho de liberar la mesa para otros clientes.
                  <br />
                  * <strong>Modificaciones y Cancelaciones:</strong> Puede cancelar su reserva mediante el enlace o ID de referencia proporcionado en la confirmación, o contactando directamente con el restaurante. Agradecemos que las cancelaciones se realicen con un mínimo de 2 horas de antelación.
                </p>
              </section>

              <section className="space-y-2">
                <h3 className="font-serif text-lg text-stone-100">2. Responsabilidad del Cliente</h3>
                <p>
                  Al realizar la reserva, el cliente se compromete a facilitar información verídica y de contacto (nombre, email y teléfono). Queda terminantemente prohibido el uso de identidades falsas o el envío masivo de reservas automáticas fraudulentas (spam).
                </p>
              </section>

              <section className="space-y-2">
                <h3 className="font-serif text-lg text-stone-100">3. Modificación de las Condiciones</h3>
                <p>
                  Rahito Głogów se reserva el derecho a modificar estos términos en cualquier momento, adaptándolos a cambios legislativos en Polonia o a necesidades operativas del restaurante. Las condiciones vigentes serán siempre las publicadas en esta sección en el momento de efectuar su reserva.
                </p>
              </section>

              <section className="space-y-2">
                <h3 className="font-serif text-lg text-stone-100">4. Ley Aplicable y Jurisdicción</h3>
                <p>
                  Cualquier controversia relacionada con el uso del servicio de reserva estará sometida a la legislación vigente de la República de Polonia y a los tribunales competentes de la jurisdicción de Głogów.
                </p>
              </section>
            </>
          ) : (
            <>
              <p className="text-stone-400">Ostatnia aktualizacja: Lipiec 2026 r.</p>
              <p>
                Niniejszy Regulamin określa warunki korzystania z systemu rezerwacji stolików online w restauracji <strong>Rahito Głogów</strong>, dostępnego za pośrednictwem strony internetowej. Dokonanie rezerwacji oznacza pełną akceptację regulaminu.
              </p>

              <section className="space-y-2">
                <h3 className="font-serif text-lg text-stone-100">1. Warunki Rezerwacji</h3>
                <p>
                  * <strong>Pojemność i dostępność:</strong> Dokonanie rezerwacji zależy od dostępności wolnych stolików. Kameralny charakter Rahito Głogów ma na celu zapewnienie wyjątkowych wrażeń kulinarnych.
                  <br />
                  * <strong>Punktualność:</strong> Rezerwacja stolika jest utrzymywana przez maksymalnie 15 minut od zadeklarowanej godziny. Po upływie tego czasu rezerwacja może zostać anulowana, a stolik udostępniony innym gościom.
                  <br />
                  * <strong>Zmiany i anulowanie rezerwacji:</strong> Anulowanie rezerwacji jest możliwe za pomocą identyfikatora (kodu referencyjnego) otrzymanego przy potwierdzeniu, lub poprzez bezpośredni kontakt z restauracją. Prosimy o informowanie o anulowaniu z wyprzedzeniem co najmniej 2 godzin.
                </p>
              </section>

              <section className="space-y-2">
                <h3 className="font-serif text-lg text-stone-100">2. Odpowiedzialność Gościa</h3>
                <p>
                  Osoba dokonująca rezerwacji zobowiązuje się do podania prawdziwych i aktualnych danych kontaktowych (imię, adres e-mail, telefon). Zabronione jest korzystanie z fikcyjnych danych lub masowe dokonywanie fałszywych rezerwacji (spamowanie).
                </p>
              </section>

              <section className="space-y-2">
                <h3 className="font-serif text-lg text-stone-100">3. Zmiany Regulaminu</h3>
                <p>
                  Rahito Głogów zastrzega sobie prawo do wprowadzania zmian w niniejszym regulaminie w dowolnym momencie, dostosowując go do polskich przepisów prawa lub zmian organizacyjnych w restauracji. Aktualny regulamin jest publikowany w tej sekcji.
                </p>
              </section>

              <section className="space-y-2">
                <h3 className="font-serif text-lg text-stone-100">4. Prawo Właściwe</h3>
                <p>
                  Wszelkie spory wynikające z korzystania z serwisu rezerwacji podlegają prawu Rzeczypospolitej Polskiej i będą rozstrzygane przez sąd właściwy dla siedziby restauracji w Głogowie.
                </p>
              </section>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
