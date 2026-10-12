# Tambú Sushi Talca — Prototipo de tienda online

Prototipo **de demostración**, completo y navegable. No procesa pagos, no tiene usuarios reales ni registra puntos. Todos los productos y precios son ficticios (`demo: true`).

## Estado del proyecto

| Fase | Contenido | Estado |
|---|---|---|
| A | Identidad visual, estilos y componentes compartidos | ✅ |
| B | Inicio, carta, promociones y navegación | ✅ |
| C | Detalle de producto y carrito funcional | ✅ |
| D | Checkout demo, fidelización y mi cuenta | ✅ |
| E | Contacto, nosotros, responsive y modo oscuro | ✅ |
| F | Pruebas de enlaces, consola, carrito, cálculos y pantallas | ✅ |
| G | Animaciones fluidas | ✅ |
| H | Supabase: clientes, cuentas reales y base del programa de puntos | ✅ |
| I | Pago automático con Webpay (vía Flow), seguimiento del pedido y panel de sucursal | ✅ (falta poner las claves de Flow) |
| J | Sección «Pedidos» solo para administradores (copiar a Fudo) | ✅ |
| Siguiente | Publicar con dominio, carta real, integración con la API de Fudo | Pendiente |

## Cómo abrir el proyecto

**Opción simple:** abre la carpeta `tambu-sushi` y haz doble clic en `index.html`. Funciona directamente en Chrome, Edge o Firefox.

**Opción recomendada:** un servidor local, más parecido a la web publicada.
- **Visual Studio Code:** instala la extensión *Live Server*, abre la carpeta y pulsa «Go Live».
- **Python:** en una terminal dentro de la carpeta escribe `python -m http.server 8000` y abre `http://localhost:8000`.

> Las tipografías (Poppins e Inter) vienen de Google Fonts: sin internet se usa una tipografía del sistema.

## Páginas

| Archivo | Qué muestra |
|---|---|
| `index.html` | Portada: hero, accesos a categorías, destacados, promociones, cómo pedir, Tambú Puntos, horario y contacto |
| `carta.html` | Carta con búsqueda, filtro por categoría (`carta.html#rolls-frios`), orden y botón Agregar |
| `promociones.html` | Tablas y combos |
| `producto.html?id=…` | Una sola plantilla para todos los productos: galería, ingredientes, opciones con suplemento, cantidad, relacionados |
| `carrito.html` | Cantidades, eliminar, subtotal, total, vaciar, estado vacío |
| `checkout.html` | Contacto, retiro o despacho, observaciones, medios de pago futuros (desactivados) y resumen para WhatsApp |
| `fidelizacion.html` | Programa de puntos futuro con valores ilustrativos |
| `mi-cuenta.html` | Cuentas reales (Supabase): registro, inicio de sesión, recuperación, perfil, saldo, movimientos, canjes y pedidos |
| `sucursales.html` | Mapa de las 5 sucursales, detección de la más cercana y elección de sucursal |
| `nosotros.html` / `contacto.html` | Marca, valores, horario, WhatsApp, espacio para mapa y preguntas frecuentes |
| `pedido.html` | Seguimiento de un pedido en vivo; sin código, la lista «Mis pedidos» |
| `admin.html` | Panel del superadministrador: carta, precios, promociones, fotos, textos, menú, fuentes, pagos, sucursales, puntos y equipo |
| `admin-pedidos.html` | Pedidos de todas las sucursales para copiarlos a Fudo (solo administradores) |
| `guia-estilos.html` | Página interna con colores, tipografía y componentes (no aparece en el menú) |

## Archivos

```
css/
  styles.css        Variables (colores de modo claro y oscuro, tipografía, espacios) y botones
  components.css    Todos los componentes y secciones
  responsive.css    Ajustes para tablet (640px) y computador (1024px)
  motion.css        Animaciones (se desactivan con «reducir movimiento»)
js/
  demo-data.js      DATOS: local, horario, categorías, productos, opciones, fidelización, textos
  theme.js          Modo claro / oscuro (se carga en el <head>)
  cart.js           Carrito guardado temporalmente en el navegador
  navigation.js     Cabecera, menú móvil, pie de página e iconos
  main.js           Precios, estado abierto/cerrado (hora de Chile), avisos
  products.js       Tarjetas, carta, promociones, cálculo de precios
  product-detail.js Página de producto
  cart-page.js      Página del carrito
  checkout.js       Checkout de demostración
  loyalty.js        Tarjetas y recompensas de puntos (ilustrativas)
  account.js        Mi cuenta (solo interfaz)
  content.js        Textos de marca, preguntas frecuentes y contacto
  motion.js         Animaciones (cambio de página, scroll, pieza que vuela al carrito)
  supabase-client.js Conexión con Supabase (URL y clave pública) y detección de administrador
  admin-orders.js   Sección Pedidos (solo administradores)
  site-data.js      Carga el contenido editable (carta, textos, fotos, menú, fuentes) desde la base de datos
  admin-shell.js    Panel: barra lateral, acceso, secciones, subir fotos
  admin-config.js   Panel: inicio, pagos, sucursales, puntos, equipo, historial
  admin-carta.js    Panel: carta, precios, opciones, promociones y categorías
  admin-contenido.js Panel: textos con vista previa, contacto/horario, Nosotros, FAQ, fotos, menú, fuentes
  my-orders.js      Mis pedidos y aviso flotante de pedido en curso
  order-page.js     Seguimiento del pedido
  branches.js       Sucursal elegida, distancias y más cercana
  branches-page.js  Página de sucursales con mapa (MapLibre + OpenFreeMap)
assets/images/      Logos (y fotos oficiales cuando lleguen)
assets/textures/    Texturas propias de bambú y madera (SVG)
supabase/migrations/ Copia del SQL aplicado en la base de datos
```

## Cambios frecuentes

> Lo normal ahora es hacerlo desde el **panel del superadministrador** (`admin.html`). Lo siguiente es solo el respaldo que se usa sin conexión.

- **Datos del local:** `js/demo-data.js`, sección 1. Lo que está en `null` (dirección, mapa, correo, redes) se muestra como «por confirmar».
- **Productos:** sección 6 de `js/demo-data.js`. Copia un bloque `{ … }`, cambia `id`, `nombre`, `precio`, etc. Las opciones se eligen por producto (`opciones: [G.proteina, G.extras]`).
- **Fotos:** guarda la imagen en `assets/images/` y agrégala al producto: `imagenes: ["assets/images/roll-panko.jpg"]`. Sin foto se muestra el recuadro provisional.
- **Colores:** bloque `:root` de `css/styles.css` (modo claro) y `:root[data-theme="dark"]` (modo oscuro).
- **Menú:** lista `TAMBU.menu` en `js/navigation.js`.

## Modo oscuro

El botón de luna/sol de la cabecera alterna entre modo claro y oscuro. En el menú del teléfono y en «Mi cuenta» hay un selector Claro / Oscuro. La elección se recuerda en ese navegador. Por defecto el sitio se abre en modo claro.

## Cómo probar

1. En la carta, pulsa «Agregar» en varios productos: el contador del carrito sube.
2. Abre un producto, cambia la proteína a Camarón (+$800) y suma extras: el botón muestra el total actualizado.
3. Cambia de página y recarga: el carrito se mantiene.
4. En el carrito, cambia cantidades y elimina productos: subtotales y total se recalculan.
5. En el checkout, intenta continuar sin datos: se marcan los campos faltantes. Con datos válidos se arma el resumen para WhatsApp.
6. Prueba `producto.html?id=no-existe`: aparece un aviso con enlace a la carta.

## Sucursales

- 4 en Talca (Mall Go Florida, Mall Portal Centro 3er y 4to piso, Jumbo Las Rastras) y 1 en Punto Fijo, Venezuela (C.C. Las Virtudes, patio de comidas).
- La barra superior muestra la sucursal elegida y su estado (abierto/cerrado con la hora de su país).
- Sin sucursal elegida, la página Sucursales y el checkout piden la ubicación y eligen la más cercana. La ubicación nunca se guarda ni se envía.
- El pedido por WhatsApp va al número de la sucursal elegida.
- **WhatsApp y teléfono de cada sucursal:** en Supabase → *Table Editor* → `branches` → columnas `whatsapp` (solo números, con código de país, ej. `56912345678`) y `telefono` (como se muestra, ej. `+56 9 1234 5678`). Mientras estén vacías se usa el número general.
- Venezuela: `precios_confirmados = false` (la sucursal confirma el total por WhatsApp) y sin pago en línea (`acepta_pago_en_linea = false`).
- Al abrir cualquier página por primera vez, la web pide la ubicación y elige sola la sucursal más cercana (avisa con un mensaje y permite cambiarla). Si el cliente elige una a mano, se respeta.
- El mapa usa MapLibre + OpenFreeMap: gratis, sin clave y sin límite declarado.

## Chile y Venezuela

- El **país activo** lo define la sucursal: detectada por ubicación o elegida por el cliente. Cambiar de país recarga la página.
- **Chile:** carta de `TAMBU.productos`, pesos chilenos, Webpay (futuro) y Tambú Puntos.
- **Venezuela:** carta propia `TAMBU.productosVE` (sección 6b de `js/demo-data.js`), precios en dólares con su equivalente en bolívares, pagos por pago móvil, Zelle o efectivo (coordinados por WhatsApp). Solo se ve con una sucursal de Venezuela.
- Cada país tiene **su propio carrito**: no se mezclan productos ni monedas.
- **Tasa del día (Bs por 1 US$):** Supabase → *Table Editor* → `paises` → fila `VE` → columna `tasa_secundaria`. La fecha de actualización se registra sola. Sin tasa, la web muestra «Bs a la tasa del día».
- En la base de datos los montos en dólares se guardan en centavos (850 = US$ 8,50). **Tambú Puntos por país, con saldos separados:** Chile 1 punto por cada $1.000; Venezuela 1 punto por cada US$ 1. Cada país tiene sus recompensas (`rewards.pais`) y su interruptor de activación (`loyalty_settings`, una fila por país). En Mi cuenta se ve el saldo del país de la sucursal activa.

## Pagos automáticos (Chile · Webpay vía Flow)

**Cómo funciona**
1. En el checkout, el cliente pulsa «Pagar $X». La web envía solo qué productos quiere.
2. La función `crear-pago` (Supabase) recalcula el total con los precios de la tabla `products`, crea el pedido «pendiente de pago» y pide a Flow el link de Webpay.
3. El cliente paga en Webpay. Este sitio nunca ve los datos de la tarjeta.
4. Flow avisa a `flow-confirmacion`; la función consulta a Flow el estado real, revisa que monto y número de pedido coincidan y marca el pedido **pagado**. Eso suma los puntos (si el programa está activo) y lo envía al panel de la sucursal.
5. El cliente vuelve a `pedido.html`, que muestra el estado en vivo (pago confirmado → en preparación → listo → entregado). Si la notificación de Flow se demora, `estado-pedido` vuelve a consultar a Flow.

**Claves de Flow:** se ingresan en la web, en el **panel → Medios de pago** (solo superadministrador; ver más abajo). Quedan cifradas en Supabase Vault y la web nunca puede volver a leerlas.
- (Alternativa avanzada, tiene prioridad) Supabase → Edge Functions → Secrets: `FLOW_API_KEY`, `FLOW_SECRET_KEY`, `FLOW_API_URL`.
- `SITIO_URLS`: la dirección de la web publicada (ej. `https://tambusushi.cl`). En pruebas locales se acepta `http://127.0.0.1` y `http://localhost`.

**Tarjeta de prueba (sandbox):** 4051885600446623, cualquier fecha, CVV 123. En el simulador del banco: RUT 11111111-1, clave 123.

**Precios:** el precio que se cobra es el de la tabla `products` en Supabase. La web muestra los de `js/demo-data.js`: cuando cambie la carta, se actualizan ambos (o se pasa la carta a leerse directo de la base de datos).

**Despacho:** por ahora el pago en línea es solo para retiro en local (falta definir zonas y costo de despacho).

## Panel de pedidos (personal de sucursal)

- `panel.html` (no aparece en el menú). Cada trabajador inicia sesión con su cuenta (Google o correo).
- Para dar acceso: la persona entra una vez al panel; luego en Supabase → *Table Editor* → `branch_staff` → *Insert row* con su `user_id` (está en Authentication → Users) y la `sucursal_id` (ej. `talca-portal-3`).
- Los pedidos pagados aparecen solos y en tiempo real, con sonido («Activar sonido» al empezar el turno).
- Botones: Empezar a preparar → Marcar listo → Entregado. «Cancelar» no devuelve el dinero: la devolución se hace en el panel de Flow.

## Efectivo al retirar (solo para pruebas)

- En el checkout de Chile aparece **«Efectivo al retirar · Prueba»**. Crea un pedido real que entra directo a la sucursal (panel y sección Pedidos) sin pasar por Flow; funciona incluso abriendo la web con doble clic.
- Esos pedidos quedan marcados como **prueba**, se muestran como «Cobrar en efectivo» y **no suman puntos**.
- Se activa o desactiva en el **panel → Medios de pago**. **Antes de lanzar:** desactívalo.

## Pedidos (solo administradores) · copiar a Fudo

- Al iniciar sesión con una cuenta **administradora** aparece la opción **Pedidos** en el menú y una tarjeta en Mi cuenta. Con cualquier otra cuenta no aparece, y aunque alguien abra `admin-pedidos.html` a mano, la base de datos no le entrega ningún pedido.
- Filtros: **Pendientes** (pagados, en preparación, listos) · **Sin registrar en Fudo** · **Finalizados** (entregados y cancelados) · **Todos**; además sucursal, fecha (hoy / 7 / 30 días / todo) y búsqueda por N°, nombre o teléfono.
- Al abrir un pedido: datos del cliente, productos con opciones, observaciones, total y pago. Botón **Copiar para Fudo** (copia todo en texto) y **Marcar como registrado en Fudo** (con el N° de Fudo opcional) para no ingresarlo dos veces.
- Los pedidos nuevos pagados llegan en vivo con aviso y sonido («Activar sonido»).
- **Agregar o quitar administradores y personal:** desde el **panel → Equipo y accesos** (la persona primero crea su cuenta en la web).

## Panel del superadministrador (`admin.html`)

Hay tres niveles de acceso:
| Rol | Ve |
|---|---|
| **Personal** de una sucursal | `panel.html` con los pedidos de su sucursal |
| **Administrador** | Pedidos (todas las sucursales) · copiar a Fudo |
| **Superadministrador** | Todo: el **panel** con barra lateral «Modo superadministrador» |

**Cómo se entra:** al iniciar sesión (correo o Google) con la cuenta de superadministrador, la web abre el panel sola. También está el enlace **Panel** en el menú y en Mi cuenta. La barra lateral aparece también en Pedidos.

**Secciones (todo sin tocar código):**
- **Inicio:** pedidos de hoy, en curso, ventas del día, estado de los pagos, últimos cambios y accesos rápidos.
- **Carta y precios:** agregar comidas, cambiar nombre, precio, precio «antes» (tachado), piezas, descripciones, ingredientes, etiquetas, **fotos** (hasta 8, se achican solas), **opciones con precio adicional** (envoltura, proteína, extras…), visible/escondida, destacada en el inicio. Chile en pesos y Venezuela en dólares. «Eliminar» archiva la comida (se puede recuperar en «Ver eliminados»). Además, **categorías**: nombre, orden, ícono, visible.
- **Promociones:** las comidas marcadas como promoción, y botón «Nueva promoción».
- **Medios de pago:** encender/apagar Webpay (Flow) y Efectivo de prueba; claves de Flow; **Mercado Pago**: sus credenciales ya se pueden guardar (cifradas). El botón de cobro con Mercado Pago se activa cuando hagamos esa integración.
- **Sucursales**, **Puntos y tasa Bs**, **Equipo y accesos**, **Historial** (quién cambió qué y cuándo).
- **Textos:** cada título, párrafo y botón de cada página, con **vista previa en vivo**. `*palabra*` la destaca en color. También contacto (WhatsApp, correo, redes), **horario** (abre/cierra cada día), página Nosotros y preguntas frecuentes.
- **Fotos:** logo de la cabecera, logo del pie, foto principal del inicio y fotos de Nosotros.
- **Menú:** renombrar, ordenar, esconder o agregar enlaces (ej. Instagram).
- **Fuentes:** tipografía de títulos y de textos (lista curada de Google Fonts, con combinaciones recomendadas).

**Cómo llega a la web:** los cambios se guardan en Supabase (tabla `site_content`, tabla `products` y la carpeta de fotos `tienda`). Cada página los lee con `js/site-data.js` (una sola consulta, con copia en el navegador para abrir rápido). `js/demo-data.js` queda como respaldo si no hay conexión.

**Seguridad:** nada de esto queda en el HTML. Cada cambio pasa por funciones de la base de datos que vuelven a comprobar que quien lo pide es superadministrador, y validan los datos (precios, opciones, enlaces solo `https://` o páginas propias, fotos solo de la carpeta de la tienda, fuentes de una lista fija). Los textos se muestran siempre como texto (no como código). Las claves de Flow y Mercado Pago son de solo escritura. Un administrador normal o un visitante que abra `admin.html` no ve ni puede cambiar nada. `configuracion.html` ahora redirige al panel.

## Mis pedidos (seguimiento para todos, con o sin cuenta)

- Al comprar, el pedido se guarda en el navegador del cliente (solo su código, sin datos personales).
- Mientras el pedido está en curso aparece un **aviso flotante** abajo a la derecha en todas las páginas («Pedido #106 · En preparación»); se pone verde cuando está **listo para retirar**. Tocándolo vuelve al seguimiento.
- **Mis pedidos**: ícono de boleta en la cabecera (con punto naranjo si hay un pedido en curso), menú del teléfono y pie de página → `pedido.html`.
- La lista muestra los pedidos de los últimos 30 días con su estado.
- Sin cuenta: funciona en el mismo teléfono/navegador donde compró. Con cuenta: también en cualquier dispositivo al iniciar sesión (y desde Mi cuenta → historial).

## Animaciones

- Al cambiar de página el contenido se desvanece y aparece una barra fina de bambú arriba.
- Botones, chips y tarjetas responden al presionar; las secciones aparecen suavemente al hacer scroll.
- Al agregar un producto, una pieza de sushi vuela al carrito y el aviso muestra unos palillos.
- El cambio de modo claro/oscuro es un fundido.
- Si el teléfono o computador tiene activado «reducir movimiento», las animaciones se apagan.
- Velocidades en `css/motion.css` (`--m-rapido`, `--m-normal`).

## Base de datos (Supabase · proyecto «Tambu Sushi»)

**Qué hay:**

| Tabla | Para qué |
|---|---|
| `profiles` | Datos del cliente; se crea sola al registrarse |
| `loyalty_settings` | Reglas: puntos por cada X pesos y si el programa está activo |
| `rewards` | Recompensas canjeables |
| `orders` / `order_items` | Pedidos y su detalle |
| `payments` | Pagos (Webpay). Nunca visible desde la web |
| `points_ledger` | Movimientos de puntos: el saldo es su suma |
| `redemptions` | Canjes |

**Reglas de seguridad:**
- Cada cliente solo ve sus propios datos. Desde la web no se pueden crear, editar ni borrar puntos, pedidos ni pagos.
- Los puntos se suman solos cuando un pedido pasa a «pagado», una sola vez aunque el pago se notifique varias veces. Si el pedido se cancela, se descuentan.
- Canjear (`canjear_recompensa`) revisa el saldo en el servidor y bloquea dos canjes simultáneos.
- El programa está **desactivado** (`loyalty_settings.activo = false`) hasta el lanzamiento.

**Cómo cambiar reglas o recompensas:** en el panel de Supabase, *Table Editor* → `loyalty_settings` (puntos y activo) o `rewards`.

**Configuración pendiente en el panel de Supabase (Authentication):**
1. *URL Configuration* → **Site URL**: la dirección donde quede publicada la web (mientras pruebas con Live Server: `http://127.0.0.1:5500`). Agrega también esa dirección + `/mi-cuenta.html` en **Redirect URLs**. Sin esto, los enlaces de confirmación y recuperación no vuelven a la web.
2. *Emails*: personaliza en español los correos de confirmación y recuperación.
3. Antes de lanzar, configura un **SMTP propio** (el envío de correos incluido es limitado y solo para pruebas).

### Activar «Continuar con Google»

1. En **Google Cloud Console** crea un proyecto (por ejemplo «Tambu Sushi»).
2. En **Google Auth Platform**: completa la pantalla de consentimiento (nombre «Tambú Sushi», tu correo de soporte, público *Externo*).
3. En **Clientes** → *Crear cliente* → tipo **Aplicación web**:
   - *Orígenes de JavaScript autorizados*: `http://127.0.0.1:5500` (pruebas) y luego tu dominio, ej. `https://tambusushi.cl`.
   - *URI de redirección autorizados*: `https://uxvxcuspkbuyykefrcvt.supabase.co/auth/v1/callback`
4. Copia el **ID de cliente** y el **secreto**.
5. En **Supabase** → Authentication → *Sign In / Providers* → **Google**: actívalo y pega ambos datos.
6. Asegúrate de haber puesto la Site URL y las Redirect URLs (punto anterior).

> Para probar cuentas, abre el sitio con Live Server (http://), no con doble clic: los correos de confirmación necesitan una dirección web real.

## Qué falta para una tienda real

1. **Carta, precios y fotos oficiales**, dirección, redes y políticas (términos, privacidad, despacho).
2. **Supabase:** ✅ clientes, cuentas y puntos. Falta: pasar la carta (productos y categorías) a la base de datos y crear pedidos desde el checkout a través de una función del servidor.
3. **Webpay Plus (Transbank):** el pago se crea y se confirma en un servidor propio con el SDK oficial. Solo con el pago confirmado se marca el pedido como pagado y se acreditan puntos, ignorando confirmaciones repetidas. Comentarios guía en `js/checkout.js`.
4. **Fudo:** conexión a través de una capa propia e intercambiable. Antes hay que confirmar con Fudo qué permite su API para esta cuenta. Las cuentas y los puntos no dependen de Fudo.
5. **Publicación:** dominio y hosting (por ejemplo Netlify, Vercel o Cloudflare Pages para esta versión estática).
