# Synerveil en Vercel · Guía paso a paso

Synerveil es una web que se instala en el móvil como una app. Usa tres servicios gratuitos:

| Servicio | Para qué |
|---|---|
| **Firebase** | Las cuentas (correo y contraseña) y guardar colecciones, mazos y partidas |
| **GitHub** | Guardar el código |
| **Vercel** | Publicar la web |

No hay nada de pago: la "IA" de Synerveil funciona dentro de la propia app, con la base de datos de cartas, los precios, la popularidad de EDHREC y los combos de Commander Spellbook.

---

## 1. Firebase (una sola vez)

Entra en <https://console.firebase.google.com> y abre el proyecto **SYnerveil**.

**Activar el registro con correo**
1. Menú de la izquierda: **Compilación → Authentication**. Si te lo pide, pulsa **Comenzar**.
2. Pestaña **Método de acceso** → **Correo electrónico/contraseña** → activa el primer interruptor → **Guardar**.
3. Pestaña **Plantillas** → abajo, **Idioma de las plantillas** → **Español**.

**Base de datos**
1. Menú: **Compilación → Firestore Database**. Si aún no existe, pulsa **Crear base de datos**, elige una ubicación de Europa (por ejemplo `eur3`) y modo **Producción**.
2. Pestaña **Reglas**: borra todo lo que haya, pega el contenido del archivo `firestore.rules` de esta carpeta y pulsa **Publicar**.
   Así cada persona solo puede ver y cambiar sus propias cosas.

## 2. Subir el código a GitHub (con GitHub Desktop)

1. Descomprime el `.zip`.
2. Abre GitHub Desktop con el repositorio **SYnerveil** y pulsa **Repository → Show in Explorer** (o *Show in Finder*). Se abre la carpeta del repositorio.
3. Copia **todo** lo que hay dentro de la carpeta descomprimida y pégalo ahí. Si te pregunta si quieres reemplazar archivos, di que sí.
   Ojo: incluye la carpeta `.github`, que en Windows puede estar oculta. Para verla: en el Explorador, **Vista → Mostrar → Elementos ocultos**.
4. Vuelve a GitHub Desktop: verás unos 300 archivos nuevos. Abajo a la izquierda escribe un resumen, por ejemplo `Synerveil web`, y pulsa **Commit to main**.
5. Pulsa **Push origin** arriba. Tardará un rato: son unos 140 MB, sobre todo el arte de los comandantes.

Al subirse, GitHub lanza solo un proceso que **actualiza los precios** de las cartas. Lo verás en la pestaña **Actions** como "Actualizar precios". Después se repite cada lunes.

## 3. Publicar en Vercel

1. Entra en <https://vercel.com> con tu cuenta de GitHub.
2. **Add New… → Project** → busca **SYnerveil** → **Import**.
3. En **Framework Preset** elige **Other**. No toques nada más: no hace falta comando de build.
4. Pulsa **Deploy**. En un minuto te da una dirección del tipo `https://synerveil-xxxx.vercel.app`.

Cada vez que subas cambios a GitHub (o que se actualicen los precios), Vercel publica la versión nueva sola.

## 4. Autorizar la dirección en Firebase

1. Firebase → **Authentication → Configuración → Dominios autorizados → Agregar dominio**.
2. Pon tu dirección de Vercel **sin** `https://`, por ejemplo `synerveil-xxxx.vercel.app`.

Sin este paso, al crear la cuenta saldrá "Esta dirección no está autorizada en Firebase".

## 5. Instalarla en el móvil

1. Abre tu dirección de Vercel en el móvil y crea tu cuenta (nombre, correo y contraseña).
2. Instálala:
   - **Android (Chrome):** menú ⋮ → **Instalar aplicación** (o "Añadir a pantalla de inicio").
   - **iPhone (Safari):** botón **Compartir** → **Añadir a pantalla de inicio**.
3. Pasa la dirección a tus amigos: cada uno se crea su cuenta y tiene sus propias colecciones, mazos y partidas.

---

## Qué cambia respecto a la versión dentro de Claude

- **La IA es propia.** Monta mazos, analiza y entiende el chat ("añade X", "quita X", "cambia X por Y", "más robo", "más rampa", "más interacción", "más tierras", "menos tierras", "más barato"). Es más mecánica que Claude: no conversa libremente, pero es instantánea y gratis.
- **El escáner de fotos no está.** Para añadir cartas, búscalas o pega una lista.
- **Funciona sin conexión.** Después de abrirla una vez, el contador de vidas, la colección y los mazos funcionan sin internet, y se sincroniza cuando vuelve la señal.

## Si algo falla

| Lo que ves | Qué hacer |
|---|---|
| "El registro con correo no está activado" | Paso 1, activar el registro con correo. |
| "Esta dirección no está autorizada en Firebase" | Paso 4. |
| No se guarda nada o pone "Guardado solo en este navegador" | Revisa las reglas de Firestore (paso 1) y que `firebase-config.js` tenga tus datos. |
| La web no se actualiza | En Vercel → tu proyecto → **Deployments**, mira que el último esté en verde. En el móvil, cierra la app del todo y vuelve a abrirla. |
| "Actualizar precios" sale en rojo en Actions | Vuelve a lanzarlo: Actions → Actualizar precios → **Run workflow**. Si sigue fallando, avísame. |

## Qué hay en esta carpeta

| Archivo | Qué es |
|---|---|
| `index.html` | La app entera (la misma que en Claude, con la IA propia) |
| `web.js`, `web.css`, `fb.js` | Cuentas y guardado con Firebase |
| `firebase-config.js` | Los datos de conexión de tu proyecto de Firebase |
| `cards.json`, `oracle.json`, `texts.json` | Las 32.000 cartas con sus textos, precios y popularidad |
| `combos.json`, `combodesc/` | Los combos de Commander Spellbook |
| `art/` | El arte de los comandantes para el contador de vidas |
| `sounds/` | Los sonidos de golpe, curación, espada, dado y moneda |
| `sw.js`, `manifest.webmanifest`, `icons/` | Para instalarla en el móvil y usarla sin conexión |
| `firestore.rules` | Las reglas de seguridad de la base de datos |
| `.github/workflows/` | Los procesos automáticos de GitHub (precios y arte) |

Datos de cartas cortesía de [Scryfall](https://scryfall.com), popularidad de [EDHREC](https://edhrec.com) y combos de [Commander Spellbook](https://commanderspellbook.com). Magic: The Gathering es propiedad de Wizards of the Coast; Synerveil no está afiliada ni respaldada por ellos.
