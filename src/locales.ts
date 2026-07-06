export type Language = 'es' | 'pl';

export interface Translation {
  // Navigation
  navMenu: string;
  navVision: string;
  navReviews: string;
  navReserve: string;
  navAdmin: string;

  // Hero Section
  heroSubtitle: string;
  brandSubtitle: string;
  heroTagline: string;

  // About Section
  storyTitle: string;
  storyHeading: string;
  storyParagraph: string;
  capacityLabel: string;
  capacityValue: string;
  conceptLabel: string;
  conceptValue: string;

  // Experience Section
  expTitle: string;
  expC1_tag: string;
  expC1_title: string;
  expC1_desc: string;
  expC2_tag: string;
  expC2_title: string;
  expC2_desc: string;
  expC3_tag: string;
  expC3_title: string;
  expC3_desc: string;

  // Reviews Section
  reviewsTitle: string;
  reviewsVerified: string;
  reviewsMore: string;

  // Reservation Sidebar & Form
  resTitle: string;
  resSubtitle: string;
  resSidebarTitle: string;
  resSidebarDesc: string;
  resSelectedDetail: string;
  resDate: string;
  resTime: string;
  resGuests: string;
  resCalendarTitle: string;
  resAvailable: string;
  resAvailableHours: string;
  resPartySize: string;
  resBtnProceed: string;
  resBtnBack: string;
  resBtnFinalize: string;
  resBtnConfirming: string;
  resConfirmed: string;
  resConfirmedDesc: string;
  resReference: string;
  resNewBooking: string;

  // Form Fields
  fieldFullName: string;
  fieldEmail: string;
  fieldPhone: string;
  fieldPersonalTitle: string;

  // Footer
  footerTagline: string;
  footerLocation: string;
  footerAddress: string;
  footerHours: string;
  footerHoursWeekdays: string;
  footerHoursWeekends: string;
  footerHoursMon: string;
  footerHoursTue: string;
  footerHoursWed: string;
  footerHoursThu: string;
  footerHoursFri: string;
  footerHoursSat: string;
  footerHoursSun: string;
  footerInquiries: string;
  footerRights: string;
  footerPrivacy: string;
  footerTerms: string;

  // Admin / Dashboard Section
  adminTitle: string;
  adminPasswordLabel: string;
  adminPasswordPlaceholder: string;
  adminBtnLogin: string;
  adminBtnLogout: string;
  adminInvalidPassword: string;
  adminHeaderStatTotal: string;
  adminHeaderStatPending: string;
  adminHeaderStatConfirmed: string;
  adminHeaderStatCancelled: string;
  adminNoReservations: string;
  adminColClient: string;
  adminColDetails: string;
  adminColStatus: string;
  adminColActions: string;
  adminBtnCancel: string;
  adminBtnConfirm: string;
  adminTabCalendar: string;
  adminTabList: string;
}

export const translations: Record<Language, Translation> = {
  es: {
    navMenu: "Menú",
    navVision: "Visión",
    navReviews: "Opiniones",
    navReserve: "Reservar",
    navAdmin: "Propietario",
    heroSubtitle: "Głogów • Polonia",
    brandSubtitle: "Restaurante Español",
    heroTagline: "Una experiencia culinaria donde la luz y la sombra se encuentran. Cocina de autor en el corazón de Głogów.",
    storyTitle: "Nuestra Historia",
    storyHeading: "Donde la tradición se encuentra con la vanguardia.",
    storyParagraph: "En Rahito no solo creamos platos, diseñamos momentos memorables. Nuestra filosofía se arraiga en la selección meticulosa de ingredientes selectos del Mediterráneo, cultivados con esmero y pasión tanto en España como en Polonia. Juntos, se fusionan para alcanzar el sabor incomparable de nuestros platos.",
    capacityLabel: "Capacidad",
    capacityValue: "20 Personas • 4 Terraza",
    conceptLabel: "Concepto",
    conceptValue: "Mediterráneo y Cocina de la Abuela",
    expTitle: "La Experiencia",
    expC1_tag: "Colección I",
    expC1_title: "Alma Botánica",
    expC1_desc: "Verduras de temporada preparadas con técnicas japonesas olvidadas.",
    expC2_tag: "Colección II",
    expC2_title: "Profundidad Oceánica",
    expC2_desc: "Pescados y mariscos salvajes madurados y servidos en su forma más pura.",
    expC3_tag: "Colección III",
    expC3_title: "Eco Pastoral",
    expC3_desc: "Carne de vacuno alimentada con pasto combinada con delicias fermentadas locales.",
    reviewsTitle: "Ecos de Rahito",
    reviewsVerified: "4.9 / 5 en Google",
    reviewsMore: "Ver más opiniones en Google",
    resTitle: "Reserva",
    resSubtitle: "Mesas • Eventos • Privé",
    resSidebarTitle: "Rahito",
    resSidebarDesc: "La intersección de la luz y la sombra en el arte culinario.",
    resSelectedDetail: "Detalles Seleccionados",
    resDate: "Fecha",
    resTime: "Hora",
    resGuests: "Comensales",
    resCalendarTitle: "Selección de Calendario",
    resAvailable: "Disponible",
    resAvailableHours: "Horario Disponible",
    resPartySize: "Tamaño del grupo",
    resBtnProceed: "Continuar a Detalles",
    resBtnBack: "Atrás",
    resBtnFinalize: "Finalizar Reserva",
    resBtnConfirming: "Confirmando...",
    resConfirmed: "Confirmado",
    resConfirmedDesc: "Hemos preparado su espacio. Nos vemos en Rahito.",
    resReference: "Referencia",
    resNewBooking: "Nueva Reserva",
    fieldFullName: "Nombre Completo",
    fieldEmail: "Correo Electrónico",
    fieldPhone: "Teléfono",
    fieldPersonalTitle: "Detalles Personales",
    footerTagline: "El destino culinario más íntimo de Głogów.",
    footerLocation: "Ubicación",
    footerAddress: "Stawna 8, 67-200 Głogów, Polonia",
    footerHours: "Horario de Servicio",
    footerHoursWeekdays: "Lun - Vie: 08:00 - 20:00 / Vie-Sáb: 08:00 - 22:00",
    footerHoursWeekends: "",
    footerHoursMon: "Lunes: Cerrado",
    footerHoursTue: "Martes: 8:00–20:00",
    footerHoursWed: "Miércoles: 8:00–20:00",
    footerHoursThu: "Jueves: 8:00–20:00",
    footerHoursFri: "Viernes: 8:00–22:00",
    footerHoursSat: "Sábado: 8:00–22:00",
    footerHoursSun: "Domingo: 8:00–20:00",
    footerInquiries: "Consultas",
    footerRights: "© 2026 RAHITO GŁOGÓW • LUZ Y SOMBRA",
    footerPrivacy: "Política de Privacidad",
    footerTerms: "Términos de Servicio",
    adminTitle: "Portal del Propietario",
    adminPasswordLabel: "Contraseña del Administrador",
    adminPasswordPlaceholder: "Introduzca su contraseña...",
    adminBtnLogin: "Acceder",
    adminBtnLogout: "Cerrar Sesión",
    adminInvalidPassword: "Contraseña incorrecta. Inténtelo de nuevo.",
    adminHeaderStatTotal: "Reservas Totales",
    adminHeaderStatPending: "Pendientes",
    adminHeaderStatConfirmed: "Confirmadas",
    adminHeaderStatCancelled: "Canceladas",
    adminNoReservations: "No hay reservas registradas en esta fecha.",
    adminColClient: "Cliente",
    adminColDetails: "Detalles ",
    adminColStatus: "Estado",
    adminColActions: "Acciones",
    adminBtnCancel: "Cancelar",
    adminBtnConfirm: "Confirmar",
    adminTabCalendar: "Vista Calendario",
    adminTabList: "Ver Todas"
  },
  pl: {
    navMenu: "Menu",
    navVision: "Wizja",
    navReviews: "Opinie",
    navReserve: "Rezerwacja",
    navAdmin: "Właściciel",
    heroSubtitle: "Głogów • Polska",
    brandSubtitle: "Restauracja Hiszpańska",
    heroTagline: "Doświadczenie kulinarne, w którym spotykają się światło i cień. Autorska kuchnia w sercu Głogowa.",
    storyTitle: "Nasza Historia",
    storyHeading: "Gdzie tradycja spotyka się z awangardą.",
    storyParagraph: "W Rahito nie tylko tworzymy dania, projektujemy niezapomniane chwile. Nasza filozofia opiera się na skrupulatnym doborze starannie wyselekcjonowanych składników śródziemnomorskich, uprawianych z pasją zarówno w Hiszpanii, jak i w Polsce. Łącząc się w naszej kuchni, pozwalają osiągnąć nieporównywalny smak naszych potraw.",
    capacityLabel: "Pojemność",
    capacityValue: "20 Miejsc wewnątrz • 4 na Tarasie",
    conceptLabel: "Koncepcja",
    conceptValue: "Kuchnia Śródziemnomorska i Smaki Babci",
    expTitle: "Doświadczenie",
    expC1_tag: "Kolekcja I",
    expC1_title: "Botaniczna Dusza",
    expC1_desc: "Sezonowe warzywa przygotowane z użyciem zapomnianych japońskich technik.",
    expC2_tag: "Kolekcja II",
    expC2_title: "Głębia Oceanu",
    expC2_desc: "Dzikie ryby i owoce morza, dojrzewające i podawane w najczystszej postaci.",
    expC3_tag: "Kolekcja III",
    expC3_title: "Pastoralne Echo",
    expC3_desc: "Wołowina z krów karmionych trawą, łączona z lokalnymi fermentowanymi przysmakami.",
    reviewsTitle: "Echa Rahito",
    reviewsVerified: "4.9 / 5 w Google",
    reviewsMore: "Zobacz więcej opinii w Google",
    resTitle: "Rezerwacja",
    resSubtitle: "Stoliki • Wydarzenia • Prywatne",
    resSidebarTitle: "Rahito",
    resSidebarDesc: "Skrzyżowanie światła i cienia w sztuce kulinarnej.",
    resSelectedDetail: "Wybrane Szczegóły",
    resDate: "Data",
    resTime: "Godzina",
    resGuests: "Liczba Osób",
    resCalendarTitle: "Wybór Daty",
    resAvailable: "Dostępne",
    resAvailableHours: "Dostępne Godziny",
    resPartySize: "Liczba gości",
    resBtnProceed: "Przejdź do Szczegółów",
    resBtnBack: "Wstecz",
    resBtnFinalize: "Zatwierdź Rezerwację",
    resBtnConfirming: "Potwierdzanie...",
    resConfirmed: "Potwierdzono",
    resConfirmedDesc: "Przygotowaliśmy dla Ciebie stolik. Do zobaczenia w Rahito.",
    resReference: "Numer rezerwacji",
    resNewBooking: "Nowa Rezerwacja",
    fieldFullName: "Imię i Nazwisko",
    fieldEmail: "Adres E-mail",
    fieldPhone: "Numer Telefonu",
    fieldPersonalTitle: "Dane Osobowe",
    footerTagline: "Najbardziej kameralna restauracja w Głogowie.",
    footerLocation: "Lokalizacja",
    footerAddress: "Stawna 8, 67-200 Głogów, Polonia",
    footerHours: "Godziny Otwarcia",
    footerHoursWeekdays: "Pon - Pt: 08:00 - 20:00 / Pt-Sob: 08:00 - 22:00",
    footerHoursWeekends: "",
    footerHoursMon: "Poniedziałek: Zamknięte",
    footerHoursTue: "Wtorek: 8:00–20:00",
    footerHoursWed: "Środa: 8:00–20:00",
    footerHoursThu: "Czwartek: 8:00–20:00",
    footerHoursFri: "Piątek: 8:00–22:00",
    footerHoursSat: "Sobota: 8:00–22:00",
    footerHoursSun: "Niedziela: 8:00–20:00",
    footerInquiries: "Kontakt",
    footerRights: "© 2026 RAHITO GŁOGÓW • ŚWIATŁO I CIEŃ",
    footerPrivacy: "Polityka Prywatności",
    footerTerms: "Regulamin Usługi",
    adminTitle: "Portal Właściciela",
    adminPasswordLabel: "Hasło Administratora",
    adminPasswordPlaceholder: "Wpisz hasło...",
    adminBtnLogin: "Zaloguj się",
    adminBtnLogout: "Wyloguj się",
    adminInvalidPassword: "Nieprawidłowe hasło. Spróbuj ponownie.",
    adminHeaderStatTotal: "Suma Rezerwacji",
    adminHeaderStatPending: "Oczekujące",
    adminHeaderStatConfirmed: "Potwierdzone",
    adminHeaderStatCancelled: "Anulowane",
    adminNoReservations: "Brak rezerwacji w wybranym dniu.",
    adminColClient: "Klient",
    adminColDetails: "Szczegóły",
    adminColStatus: "Status",
    adminColActions: "Akcje",
    adminBtnCancel: "Anuluj",
    adminBtnConfirm: "Potwierdź",
    adminTabCalendar: "Widok Kalendarza",
    adminTabList: "Wszystkie Rezerwacje"
  }
};
