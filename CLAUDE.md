Aquí tienes una versión sintetizada y estructurada para \*\*`CLAUDE.md`\*\*, pensada para que Claude tenga el contexto suficiente del proyecto sin añadir información redundante.



```md

\# Proyecto: Rahito Restaurant Website



\## Descripción



Rahito es la web oficial de un restaurante español ubicado en Głogów (Polonia). La aplicación combina una página corporativa premium con un sistema completo de reservas online y un panel de administración para gestionar el restaurante.



El objetivo es crear una experiencia elegante, moderna y minimalista, centrada en la conversión de reservas.



\---



\# Stack tecnológico



\- React + TypeScript

\- Vite

\- Firebase Firestore (base de datos)

\- Firebase Authentication

\- Express (backend)

\- Nodemailer (notificaciones email)

\- Framer Motion

\- Tailwind CSS

\- date-fns

\- Google Maps / Places API (previsto)



\---



\# Estilo de diseño



Inspiración:



\- Restaurante premium

\- Lujo oscuro

\- Elegante

\- Minimalista

\- Muy visual



Paleta:



\- Negro

\- Gris oscuro

\- Dorado

\- Blanco



Tipografías:



\- Cormorant Garamond

\- Inter



Todo el diseño debe mantener una estética limpia, premium y cinematográfica.



\---



\# Idiomas



Toda la aplicación debe ser completamente bilingüe.



Idiomas:



\- Español

\- Polaco



No debe existir ningún texto hardcodeado.



Todas las cadenas deben obtenerse desde:



\- src/locales.ts



\---



\# Secciones principales



\- Hero

\- Nuestra Historia

\- Menú

\- Opiniones

\- Reservas

\- Contacto



\---



\# Hero



El Hero dispone de:



\- carrusel automático

\- transición fade

\- efecto Ken Burns

\- imágenes en alta resolución

\- logo oficial Rahito



Las imágenes proceden de:



public/



\- interior\_1.png

\- interior\_2.png



No utilizar imágenes de Unsplash salvo fallback.



\---



\# Nuestra Historia



La sección utiliza un carrusel automático.



Imágenes:



\- historia\_1.jpeg

\- historia\_2.jpeg

\- historia\_3.jpeg



Transiciones suaves.



El texto explica la filosofía del restaurante:



Rahito no solo crea platos, sino momentos.



La cocina combina ingredientes seleccionados de España y Polonia para ofrecer auténtica cocina mediterránea.



\---



\# Menú



El menú utiliza un carrusel.



Características:



\- 3 platos visibles en escritorio

\- 2 en tablet

\- 1 en móvil

\- cambio automático cada 15 segundos

\- flechas manuales

\- el carrusel mueve SIEMPRE grupos completos (3 platos)



Las imágenes se encuentran en:



public/



\- paella de conejo.jpg

\- paella marisco 2.jpg

\- plato de jamon.jpg

\- bandeja de surtido.jpg

\- bandeja de empanadas.jpg

\- empanadas.jpg

\- Mohito.jpg

\- postre.jpg



Cada plato dispone de:



\- imagen

\- nombre

\- descripción elegante

\- traducción ES/PL



\---



\# Sistema de reservas



Las reservas permiten:



\- seleccionar fecha

\- seleccionar hora

\- número de personas

\- datos personales



Cada reserva:



\- se guarda en Firestore

\- genera identificador

\- envía email mediante Nodemailer



Variables SMTP:



\- SMTP\_HOST

\- SMTP\_PORT

\- SMTP\_USER

\- SMTP\_PASS

\- OWNER\_EMAIL



\---



\# Panel de administrador



Existe un Dashboard privado.



Funciones:



\- visualizar reservas

\- confirmar reservas

\- cancelar reservas

\- filtrar por fechas

\- estadísticas

\- calendario

\- gestión de mesas



\---



\# Gestión de mesas



El proyecto incorpora un sistema propio tipo TableFlow.



Características:



\- plano visual

\- edición de mesas

\- drag \& drop

\- asignación de reservas

\- capacidad

\- nombre de mesa

\- estado



Toda la información se sincroniza con Firestore.



\---



\# Opiniones



Actualmente:



\- opiniones locales



En el futuro:



Integración con Google Places API para mostrar reseñas reales.



Se utilizará cache para minimizar llamadas.



\---



\# Responsive



Toda la aplicación debe funcionar correctamente en:



\- móvil

\- tablet

\- escritorio



No deben existir scrolls horizontales.



Todos los componentes deben adaptarse mediante Tailwind.



\---



\# Base de datos



Actualmente se utiliza exclusivamente:



Firebase Firestore.



No utilizar Supabase.



\---



\# Imágenes



Las imágenes personalizadas siempre tienen prioridad sobre imágenes externas.



Todas las imágenes se encuentran dentro de:



public/



\---



\#



\# Filosofía del proyecto



Cada modificación futura debe respetar:



\- estética premium

\- experiencia elegante

\- animaciones suaves

\- diseño minimalista

\- alto rendimiento

\- código limpio

\- componentes reutilizables

\- accesibilidad

\- responsive completo

\- internacionalización completa



Evitar soluciones rápidas que rompan la arquitectura existente.

```





