/* ==========================================================================
   TAMBÚ SUSHI — DATOS CENTRALES (demo-data.js)
   --------------------------------------------------------------------------
   Este es el ÚNICO archivo que debes editar para cambiar datos del negocio,
   categorías, productos, textos de marca y reglas de fidelización.

   IMPORTANTE: todos los productos y precios de este archivo son de
   DEMOSTRACIÓN (demo: true). Se reemplazarán por la carta oficial.
   Más adelante estos datos vendrán de Supabase; el resto del código ya los
   lee desde aquí, así que solo habrá que cambiar el origen.
   ========================================================================== */

window.TAMBU = window.TAMBU || {};

/* ==========================================================================
   1. DATOS DEL LOCAL (confirmados por el cliente)
   ========================================================================== */
TAMBU.negocio = {
  nombre: "Tambú Sushi",
  ciudad: "Talca, Región del Maule",
  // Número en formato internacional, sin espacios ni "+" (para enlaces wa.me)
  whatsapp: "56967053487",
  whatsappVisible: "+56 9 6705 3487",
  zonaHoraria: "America/Santiago",

  // PENDIENTES: dejar en null hasta tener el dato real. No inventar.
  direccion: null,         // ej: "Calle 1 Sur 123, Talca"
  mapaUrl: null,           // enlace de Google Maps del local
  email: null,
  redes: {
    instagram: null,       // ej: "https://instagram.com/tu_cuenta"
    facebook: null,
    tiktok: null
  }
};

/* ==========================================================================
   2. HORARIO  (día: 0 = domingo, 1 = lunes ... 6 = sábado · formato 24 h)
   ========================================================================== */
TAMBU.horario = [
  { dia: 1, nombre: "Lunes",     abre: "12:00", cierra: "19:30" },
  { dia: 2, nombre: "Martes",    abre: "12:00", cierra: "19:30" },
  { dia: 3, nombre: "Miércoles", abre: "12:00", cierra: "19:30" },
  { dia: 4, nombre: "Jueves",    abre: "12:00", cierra: "19:30" },
  { dia: 5, nombre: "Viernes",   abre: "12:00", cierra: "19:30" },
  { dia: 6, nombre: "Sábado",    abre: "12:00", cierra: "19:30" },
  { dia: 0, nombre: "Domingo",   abre: "12:00", cierra: "18:30" }
];

TAMBU.horarioResumen = [
  { dias: "Lunes a sábado", horas: "12:00 – 19:30" },
  { dias: "Domingo",        horas: "12:00 – 18:30" }
];

/* ==========================================================================
   2b. SUCURSALES
   - lat/lng: ubicación del centro comercial (para el mapa y la distancia).
   - whatsapp: número propio de cada sucursal, formato internacional sin "+"
     (ej. "56912345678"). Si está en null se usa el número general del local.
   - horario: null = usa el horario general (sección 2).
   - preciosConfirmados: false = los precios de la carta no aplican a esa
     sucursal todavía y el total lo confirma la sucursal por WhatsApp.
   ========================================================================== */
TAMBU.sucursales = [
  {
    id: "talca-go-florida", nombre: "Mall Go Florida", corto: "Go Florida",
    pais: "CL", region: "Chile", ciudad: "Talca, Maule",
    direccion: "Av. Colín 635, Talca", detalle: "Local por confirmar",
    lat: -35.4439255, lng: -71.6887679,
    whatsapp: null, telefonoVisible: null,
    zonaHoraria: "America/Santiago", horario: null,
    moneda: "CLP", preciosConfirmados: true, nueva: false
  },
  {
    id: "talca-portal-3", nombre: "Mall Portal Centro · 3er piso", corto: "Portal 3er piso",
    pais: "CL", region: "Chile", ciudad: "Talca, Maule",
    direccion: "1 Sur 1537, Talca", detalle: "Tercer piso",
    lat: -35.4275679, lng: -71.6544093,
    whatsapp: null, telefonoVisible: null,
    zonaHoraria: "America/Santiago", horario: null,
    moneda: "CLP", preciosConfirmados: true, nueva: false
  },
  {
    id: "talca-portal-4", nombre: "Mall Portal Centro · 4to piso", corto: "Portal 4to piso",
    pais: "CL", region: "Chile", ciudad: "Talca, Maule",
    direccion: "1 Sur 1537, Talca", detalle: "Cuarto piso",
    lat: -35.4275679, lng: -71.6544093,
    whatsapp: null, telefonoVisible: null,
    zonaHoraria: "America/Santiago", horario: null,
    moneda: "CLP", preciosConfirmados: true, nueva: false
  },
  {
    id: "talca-jumbo-rastras", nombre: "Jumbo Las Rastras", corto: "Las Rastras",
    pais: "CL", region: "Chile", ciudad: "Talca, Maule",
    direccion: "Calle 30 Oriente, Talca", detalle: "Local por confirmar",
    lat: -35.43188, lng: -71.627509,
    whatsapp: null, telefonoVisible: null,
    zonaHoraria: "America/Santiago", horario: null,
    moneda: "CLP", preciosConfirmados: true, nueva: true
  },
  {
    id: "ve-las-virtudes", nombre: "C.C. Las Virtudes · Patio de comidas", corto: "Las Virtudes",
    pais: "VE", region: "Venezuela", ciudad: "Punto Fijo, Falcón",
    direccion: "Av. 6, Comunidad Cardón, Punto Fijo", detalle: "Patio de comidas",
    lat: 11.6580284, lng: -70.2054868,
    whatsapp: null, telefonoVisible: null,
    zonaHoraria: "America/Caracas", horario: null,
    moneda: "USD", preciosConfirmados: true, nueva: false
  }
];

/* Regiones para el mapa y la lista (botones Chile / Venezuela) */
TAMBU.regionesMapa = [
  { id: "Chile", nombre: "Chile", pais: "CL" },
  { id: "Venezuela", nombre: "Venezuela", pais: "VE" }
];

/* ==========================================================================
   2c. PAÍSES
   El país activo lo define la sucursal elegida (o detectada por ubicación).
   Chile y Venezuela tienen carta, moneda y medios de pago propios.
   - tasaBs: bolívares por 1 dólar. null = se toma de la base de datos
     (tabla "paises" en Supabase), que el local actualiza cada día.
   ========================================================================== */
TAMBU.paises = {
  CL: {
    codigo: "CL", nombre: "Chile", ciudadMarca: "Talca",
    moneda: "CLP", decimales: 0, locale: "es-CL", simbolo: "$",
    telefonoEjemplo: "+56 9 1234 5678",
    pagoEnLinea: true,
    puntos: { porMonto: 1, montoBase: 1000 },      // 1 punto por cada $1.000 (pesos)
    pagos: [
      { id: "webpay", nombre: "Webpay Plus", detalle: "Tarjetas de débito, crédito y prepago" },
      { id: "local",  nombre: "Pago al retirar", detalle: "Medios a confirmar por el local" }
    ]
  },
  VE: {
    codigo: "VE", nombre: "Venezuela", ciudadMarca: "Punto Fijo",
    moneda: "USD", decimales: 2, locale: "es-VE", simbolo: "US$",
    monedaSecundaria: "VES", simboloSecundario: "Bs", tasaBs: null,
    telefonoEjemplo: "+58 414 123 4567",
    pagoEnLinea: false,
    puntos: { porMonto: 1, montoBase: 100 },       // 1 punto por cada US$ 1 (100 centavos)
    pagos: [
      { id: "pago-movil", nombre: "Pago móvil", detalle: "En bolívares, a la tasa del día" },
      { id: "zelle",      nombre: "Zelle",      detalle: "En dólares" },
      { id: "efectivo",   nombre: "Efectivo",   detalle: "Dólares o bolívares al retirar" }
    ]
  }
};

/* ==========================================================================
   3. CATEGORÍAS  ("id" se usa en la URL: carta.html#rolls-calientes)
   ========================================================================== */
TAMBU.categorias = [
  { id: "promociones",     nombre: "Promociones y combos",     corto: "Promociones",    icono: "etiqueta", descripcion: "Tablas para compartir y combos." },
  { id: "rolls-calientes", nombre: "Rolls calientes",          corto: "Calientes",      icono: "fuego",    descripcion: "Tempura, panko y fritos al momento." },
  { id: "rolls-frios",     nombre: "Rolls fríos",              corto: "Fríos",          icono: "copo",     descripcion: "Envueltos en palta, salmón o sésamo." },
  { id: "hand-rolls",      nombre: "Hand rolls y hosomaki",    corto: "Hand rolls",     icono: "cono",     descripcion: "Formatos individuales." },
  { id: "sin-arroz",       nombre: "Sin arroz y vegetarianos", corto: "Sin arroz",      icono: "hoja",     descripcion: "Envolturas de pepino, palmito o queso." },
  { id: "bebidas-salsas",  nombre: "Bebidas y salsas",         corto: "Bebidas",        icono: "vaso",     descripcion: "Para acompañar tu pedido." }
];

/* ==========================================================================
   4. ETIQUETAS  (tono: "salmon" | "wasabi" | "nori" | "neutro")
   ========================================================================== */
TAMBU.etiquetas = {
  "popular":     { texto: "Popular",     tono: "salmon" },
  "nuevo":       { texto: "Nuevo",       tono: "wasabi" },
  "mas-vendido": { texto: "Más vendido", tono: "nori" },
  "fresco":      { texto: "Fresco",      tono: "wasabi" },
  "veggie":      { texto: "Veggie",      tono: "wasabi" },
  "oferta":      { texto: "Oferta",      tono: "salmon" },
  "demo":        { texto: "Demo",        tono: "neutro" }
};

/* ==========================================================================
   5. OPCIONES DE PERSONALIZACIÓN REUTILIZABLES
   tipo: "unica" (elige una) | "multiple" (elige varias, con "max")
   extra: suplemento en pesos (0 = sin costo)
   Cada producto elige qué grupos usa: no todos tienen las mismas opciones.
   ========================================================================== */
TAMBU.grupos = {
  envolturaCaliente: {
    id: "envoltura", nombre: "Envoltura", tipo: "unica", requerido: true,
    valores: [
      { id: "panko",   nombre: "Panko",   extra: 0 },
      { id: "tempura", nombre: "Tempura", extra: 0 }
    ]
  },
  envolturaFria: {
    id: "envoltura", nombre: "Envoltura", tipo: "unica", requerido: true,
    valores: [
      { id: "palta",      nombre: "Palta",      extra: 0 },
      { id: "sesamo",     nombre: "Sésamo",     extra: 0 },
      { id: "ciboulette", nombre: "Ciboulette", extra: 0 },
      { id: "salmon",     nombre: "Salmón",     extra: 1500 }
    ]
  },
  proteina: {
    id: "proteina", nombre: "Proteína", tipo: "unica", requerido: true,
    valores: [
      { id: "salmon",  nombre: "Salmón",  extra: 0 },
      { id: "pollo",   nombre: "Pollo",   extra: 0 },
      { id: "camaron", nombre: "Camarón", extra: 800 }
    ]
  },
  extras: {
    id: "extras", nombre: "Agrega", tipo: "multiple", max: 3,
    valores: [
      { id: "queso",    nombre: "Queso crema extra", extra: 500 },
      { id: "palta",    nombre: "Palta extra",       extra: 600 },
      { id: "cebollin", nombre: "Cebollín",          extra: 300 }
    ]
  },
  salsas: {
    id: "salsas", nombre: "Salsas incluidas", tipo: "multiple", max: 2,
    valores: [
      { id: "soya",       nombre: "Soya",            extra: 0 },
      { id: "teriyaki",   nombre: "Teriyaki",        extra: 0 },
      { id: "acevichada", nombre: "Acevichada",      extra: 400 }
    ]
  },
  estiloTabla: {
    id: "estilo", nombre: "Estilo de la tabla", tipo: "unica", requerido: true,
    valores: [
      { id: "mixta",     nombre: "Mixta (frías y calientes)", extra: 0 },
      { id: "calientes", nombre: "Solo calientes",            extra: 0 },
      { id: "frias",     nombre: "Solo frías",                extra: 0 }
    ]
  },
  sabor: {
    id: "sabor", nombre: "Sabor", tipo: "unica", requerido: true,
    valores: [
      { id: "cola",     nombre: "Cola",          extra: 0 },
      { id: "zero",     nombre: "Cola sin azúcar", extra: 0 },
      { id: "naranja",  nombre: "Naranja",       extra: 0 },
      { id: "agua",     nombre: "Agua mineral",  extra: 0 }
    ]
  }
};

/* ==========================================================================
   6. PRODUCTOS DE DEMOSTRACIÓN
   - imagenes: rutas en assets/images/. Vacío = foto provisional.
   - precioAntes: opcional, precio tachado en promociones.
   - relevancia: orden "Recomendados" (mayor primero).
   ========================================================================== */
var G = TAMBU.grupos;

TAMBU.productos = [
  /* ---- Promociones y combos ---- */
  {
    id: "promo-demo-01", categoria: "promociones", demo: true, destacado: true, promo: true, relevancia: 100,
    nombre: "Tabla demo 30 piezas",
    descripcion: "Selección de demostración para compartir entre dos o tres personas.",
    descripcionLarga: "Tabla de ejemplo con rolls fríos y calientes. Producto, contenido y precio de demostración: se reemplazarán por la carta oficial de Tambú.",
    precio: 18990, precioAntes: 21990, piezas: 30,
    ingredientes: ["Salmón", "Palta", "Queso crema", "Panko", "Sésamo"],
    etiquetas: ["mas-vendido", "demo"], imagenes: [],
    opciones: [G.estiloTabla, G.salsas]
  },
  {
    id: "promo-demo-02", categoria: "promociones", demo: true, destacado: false, promo: true, relevancia: 90,
    nombre: "Tabla demo 40 piezas",
    descripcion: "Formato familiar de demostración con cuatro variedades.",
    descripcionLarga: "Tabla grande de ejemplo pensada para grupos. Contenido y precio de demostración.",
    precio: 24990, precioAntes: 28990, piezas: 40,
    ingredientes: ["Salmón", "Camarón", "Palta", "Queso crema", "Tempura"],
    etiquetas: ["oferta", "demo"], imagenes: [],
    opciones: [G.estiloTabla, G.salsas]
  },
  {
    id: "promo-demo-03", categoria: "promociones", demo: true, destacado: false, promo: true, relevancia: 80,
    nombre: "Combo demo para dos",
    descripcion: "20 piezas de demostración y dos bebidas.",
    descripcionLarga: "Combo de ejemplo con dos rolls a elección del local y dos bebidas. Precio de demostración.",
    precio: 14990, piezas: 20,
    ingredientes: ["Salmón", "Pollo", "Palta", "Queso crema"],
    etiquetas: ["nuevo", "demo"], imagenes: [],
    opciones: [G.salsas]
  },

  /* ---- Rolls calientes ---- */
  {
    id: "roll-demo-01", categoria: "rolls-calientes", demo: true, destacado: true, relevancia: 95,
    nombre: "Roll demo panko",
    descripcion: "Roll de demostración apanado, con queso crema y cebollín.",
    descripcionLarga: "Roll caliente de ejemplo. Elige envoltura, proteína y extras para ver cómo cambia el precio.",
    precio: 6990, piezas: 10,
    ingredientes: ["Queso crema", "Cebollín", "Panko", "Arroz"],
    etiquetas: ["popular", "demo"], imagenes: [],
    opciones: [G.envolturaCaliente, G.proteina, G.extras]
  },
  {
    id: "roll-demo-02", categoria: "rolls-calientes", demo: true, destacado: true, relevancia: 70,
    nombre: "Roll demo tempura",
    descripcion: "Roll de demostración en tempura con salsa teriyaki.",
    descripcionLarga: "Roll caliente de ejemplo en tempura ligera. Contenido y precio de demostración.",
    precio: 7490, piezas: 10,
    ingredientes: ["Camarón", "Palta", "Tempura", "Teriyaki"],
    etiquetas: ["nuevo", "demo"], imagenes: [],
    opciones: [G.proteina, G.extras]
  },
  {
    id: "roll-demo-03", categoria: "rolls-calientes", demo: true, relevancia: 50,
    nombre: "Roll demo pollo",
    descripcion: "Roll de demostración de pollo, apanado y con queso crema.",
    descripcionLarga: "Roll caliente de ejemplo. Contenido y precio de demostración.",
    precio: 6490, piezas: 10,
    ingredientes: ["Pollo", "Queso crema", "Panko"],
    etiquetas: ["demo"], imagenes: [],
    opciones: [G.envolturaCaliente, G.extras]
  },

  /* ---- Rolls fríos ---- */
  {
    id: "roll-demo-04", categoria: "rolls-frios", demo: true, destacado: true, relevancia: 92,
    nombre: "Roll demo envuelto",
    descripcion: "Roll frío de demostración, con envoltura a elección.",
    descripcionLarga: "Roll frío de ejemplo. La envoltura de salmón tiene un suplemento para mostrar cómo se suma al total.",
    precio: 7290, piezas: 10,
    ingredientes: ["Salmón", "Queso crema", "Palta", "Arroz"],
    etiquetas: ["fresco", "demo"], imagenes: [],
    opciones: [G.envolturaFria, G.extras]
  },
  {
    id: "roll-demo-05", categoria: "rolls-frios", demo: true, relevancia: 60,
    nombre: "Roll demo sésamo",
    descripcion: "Roll frío de demostración cubierto en sésamo tostado.",
    descripcionLarga: "Roll frío de ejemplo. Contenido y precio de demostración.",
    precio: 5990, piezas: 10,
    ingredientes: ["Salmón", "Palta", "Sésamo"],
    etiquetas: ["demo"], imagenes: [],
    opciones: [G.proteina]
  },

  /* ---- Hand rolls y hosomaki ---- */
  {
    id: "hand-demo-01", categoria: "hand-rolls", demo: true, destacado: true, relevancia: 65,
    nombre: "Hand roll demo",
    descripcion: "Cono de nori de demostración, formato individual.",
    descripcionLarga: "Hand roll de ejemplo, ideal para un antojo individual. Precio de demostración.",
    precio: 3490,
    ingredientes: ["Nori", "Arroz", "Queso crema", "Palta"],
    etiquetas: ["demo"], imagenes: [],
    opciones: [G.proteina]
  },
  {
    id: "hoso-demo-01", categoria: "hand-rolls", demo: true, relevancia: 40,
    nombre: "Hosomaki demo",
    descripcion: "Rollito fino de demostración envuelto en nori.",
    descripcionLarga: "Hosomaki de ejemplo de 8 piezas. Precio de demostración.",
    precio: 2990, piezas: 8,
    ingredientes: ["Nori", "Arroz", "Palta"],
    etiquetas: ["demo"], imagenes: [],
    opciones: []
  },

  /* ---- Sin arroz y vegetarianos ---- */
  {
    id: "veggie-demo-01", categoria: "sin-arroz", demo: true, destacado: true, relevancia: 75,
    nombre: "Roll demo en pepino",
    descripcion: "Roll sin arroz de demostración, envuelto en láminas de pepino.",
    descripcionLarga: "Opción liviana de ejemplo, sin arroz. Contenido y precio de demostración.",
    precio: 6290, piezas: 8,
    ingredientes: ["Pepino", "Palta", "Queso crema", "Palmito"],
    etiquetas: ["veggie", "demo"], imagenes: [],
    opciones: [G.extras]
  },
  {
    id: "veggie-demo-02", categoria: "sin-arroz", demo: true, relevancia: 45,
    nombre: "Roll demo veggie",
    descripcion: "Roll vegetariano de demostración con palmito y palta.",
    descripcionLarga: "Roll vegetariano de ejemplo. Contenido y precio de demostración.",
    precio: 5790, piezas: 10,
    ingredientes: ["Palmito", "Palta", "Pepino", "Arroz"],
    etiquetas: ["veggie", "demo"], imagenes: [],
    opciones: [G.envolturaFria]
  },

  /* ---- Bebidas y salsas ---- */
  {
    id: "bebida-demo-01", categoria: "bebidas-salsas", demo: true, relevancia: 30,
    nombre: "Bebida demo 350 ml",
    descripcion: "Bebida en lata de demostración.",
    descripcionLarga: "Bebida de ejemplo. Sabores y precio de demostración.",
    precio: 1490,
    ingredientes: [],
    etiquetas: ["demo"], imagenes: [],
    opciones: [G.sabor]
  },
  {
    id: "salsa-demo-01", categoria: "bebidas-salsas", demo: true, relevancia: 25,
    nombre: "Salsa teriyaki adicional",
    descripcion: "Pote extra de salsa. Precio de demostración.",
    descripcionLarga: "Salsa adicional de ejemplo.",
    precio: 600, ingredientes: [], etiquetas: ["demo"], imagenes: [], opciones: []
  },
  {
    id: "salsa-demo-02", categoria: "bebidas-salsas", demo: true, relevancia: 20,
    nombre: "Salsa acevichada adicional",
    descripcion: "Pote extra de salsa. Precio de demostración.",
    descripcionLarga: "Salsa adicional de ejemplo.",
    precio: 700, ingredientes: [], etiquetas: ["demo"], imagenes: [], opciones: []
  },
  {
    id: "salsa-demo-03", categoria: "bebidas-salsas", demo: true, relevancia: 15,
    nombre: "Jengibre y wasabi",
    descripcion: "Porción extra de acompañamientos. Precio de demostración.",
    descripcionLarga: "Acompañamiento adicional de ejemplo.",
    precio: 500, ingredientes: [], etiquetas: ["demo"], imagenes: [], opciones: []
  }
];

/* ==========================================================================
   6b. CARTA DE VENEZUELA (Punto Fijo) — DEMOSTRACIÓN, precios en dólares
   Solo se muestra cuando la sucursal activa es de Venezuela.
   ========================================================================== */
TAMBU.gruposVE = {
  envoltura: {
    id: "envoltura", nombre: "Envoltura", tipo: "unica", requerido: true,
    valores: [
      { id: "panko",   nombre: "Panko",   extra: 0 },
      { id: "tempura", nombre: "Tempura", extra: 0 },
      { id: "palta",   nombre: "Aguacate", extra: 1 }
    ]
  },
  proteina: {
    id: "proteina", nombre: "Proteína", tipo: "unica", requerido: true,
    valores: [
      { id: "salmon",  nombre: "Salmón",  extra: 0 },
      { id: "pollo",   nombre: "Pollo",   extra: 0 },
      { id: "camaron", nombre: "Camarón", extra: 1.5 }
    ]
  },
  extras: {
    id: "extras", nombre: "Agrega", tipo: "multiple", max: 3,
    valores: [
      { id: "queso",    nombre: "Queso crema extra", extra: 0.5 },
      { id: "aguacate", nombre: "Aguacate extra",    extra: 0.75 },
      { id: "platano",  nombre: "Plátano maduro",    extra: 0.5 }
    ]
  },
  salsas: {
    id: "salsas", nombre: "Salsas incluidas", tipo: "multiple", max: 2,
    valores: [
      { id: "soya",       nombre: "Soya",       extra: 0 },
      { id: "teriyaki",   nombre: "Teriyaki",   extra: 0 },
      { id: "acevichada", nombre: "Acevichada", extra: 0.5 }
    ]
  },
  bebida: {
    id: "sabor", nombre: "Sabor", tipo: "unica", requerido: true,
    valores: [
      { id: "cola",   nombre: "Cola",         extra: 0 },
      { id: "malta",  nombre: "Malta",        extra: 0 },
      { id: "agua",   nombre: "Agua mineral", extra: 0 }
    ]
  }
};
var GV = TAMBU.gruposVE;

TAMBU.productosVE = [
  {
    id: "ve-promo-01", categoria: "promociones", demo: true, destacado: true, promo: true, relevancia: 100,
    nombre: "Tabla demo Falcón 30 piezas",
    descripcion: "Tabla de demostración para compartir, con rolls fríos y calientes.",
    descripcionLarga: "Tabla de ejemplo de la sucursal Las Virtudes. Contenido y precio de demostración.",
    precio: 22, precioAntes: 25, piezas: 30,
    ingredientes: ["Salmón", "Aguacate", "Queso crema", "Panko"],
    etiquetas: ["mas-vendido", "demo"], imagenes: [], opciones: [GV.salsas]
  },
  {
    id: "ve-promo-02", categoria: "promociones", demo: true, promo: true, relevancia: 90,
    nombre: "Combo demo pareja",
    descripcion: "20 piezas de demostración y dos bebidas.",
    descripcionLarga: "Combo de ejemplo para dos personas. Precio de demostración.",
    precio: 15, piezas: 20,
    ingredientes: ["Salmón", "Pollo", "Queso crema"],
    etiquetas: ["oferta", "demo"], imagenes: [], opciones: [GV.salsas]
  },
  {
    id: "ve-roll-01", categoria: "rolls-calientes", demo: true, destacado: true, relevancia: 95,
    nombre: "Roll demo Paraguaná",
    descripcion: "Roll caliente de demostración con queso crema y plátano.",
    descripcionLarga: "Roll caliente de ejemplo con toque local. Elige envoltura, proteína y extras.",
    precio: 8, piezas: 10,
    ingredientes: ["Queso crema", "Plátano maduro", "Panko"],
    etiquetas: ["popular", "demo"], imagenes: [], opciones: [GV.envoltura, GV.proteina, GV.extras]
  },
  {
    id: "ve-roll-02", categoria: "rolls-calientes", demo: true, relevancia: 70,
    nombre: "Roll demo tempura",
    descripcion: "Roll de demostración en tempura con salsa teriyaki.",
    descripcionLarga: "Roll caliente de ejemplo. Precio de demostración.",
    precio: 8.5, piezas: 10,
    ingredientes: ["Camarón", "Aguacate", "Tempura"],
    etiquetas: ["nuevo", "demo"], imagenes: [], opciones: [GV.proteina, GV.extras]
  },
  {
    id: "ve-roll-03", categoria: "rolls-frios", demo: true, destacado: true, relevancia: 88,
    nombre: "Roll demo aguacate",
    descripcion: "Roll frío de demostración envuelto en aguacate.",
    descripcionLarga: "Roll frío de ejemplo. Contenido y precio de demostración.",
    precio: 7.5, piezas: 10,
    ingredientes: ["Salmón", "Queso crema", "Aguacate"],
    etiquetas: ["fresco", "demo"], imagenes: [], opciones: [GV.proteina, GV.extras]
  },
  {
    id: "ve-hand-01", categoria: "hand-rolls", demo: true, destacado: true, relevancia: 60,
    nombre: "Hand roll demo",
    descripcion: "Cono de nori de demostración, formato individual.",
    descripcionLarga: "Hand roll de ejemplo. Precio de demostración.",
    precio: 4,
    ingredientes: ["Nori", "Arroz", "Queso crema"],
    etiquetas: ["demo"], imagenes: [], opciones: [GV.proteina]
  },
  {
    id: "ve-veggie-01", categoria: "sin-arroz", demo: true, relevancia: 50,
    nombre: "Roll demo sin arroz",
    descripcion: "Roll de demostración envuelto en pepino.",
    descripcionLarga: "Opción liviana de ejemplo. Precio de demostración.",
    precio: 7, piezas: 8,
    ingredientes: ["Pepino", "Aguacate", "Queso crema"],
    etiquetas: ["veggie", "demo"], imagenes: [], opciones: [GV.extras]
  },
  {
    id: "ve-bebida-01", categoria: "bebidas-salsas", demo: true, relevancia: 30,
    nombre: "Bebida demo",
    descripcion: "Bebida de demostración.",
    descripcionLarga: "Bebida de ejemplo. Precio de demostración.",
    precio: 1.5, ingredientes: [], etiquetas: ["demo"], imagenes: [], opciones: [GV.bebida]
  },
  {
    id: "ve-salsa-01", categoria: "bebidas-salsas", demo: true, relevancia: 20,
    nombre: "Salsa adicional",
    descripcion: "Pote extra de salsa. Precio de demostración.",
    descripcionLarga: "Salsa adicional de ejemplo.",
    precio: 0.75, ingredientes: [], etiquetas: ["demo"], imagenes: [], opciones: []
  }
];

/* ==========================================================================
   7. CHECKOUT (demostración)
   ========================================================================== */
TAMBU.checkout = {
  costoDespacho: null,          // null = "a confirmar por el local"
  pedidoMinimo: null,           // ej: 10000. null = sin mínimo
  // Si es true, el checkout ofrece enviar el resumen al WhatsApp del local
  // (no es un pago ni un pedido confirmado: el local lo revisa y responde).
  enviarPorWhatsapp: true,
  // El "Efectivo al retirar (prueba)" se activa/desactiva en el panel del superadministrador (admin.html)
  // (superadministrador). Ya no se cambia aquí.
  // Los medios de pago de cada país están en TAMBU.paises (sección 2c)
  mediosPagoFuturos: null
};

/* ==========================================================================
   8. FIDELIZACIÓN (valores ILUSTRATIVOS, no son reglas comerciales)
   ========================================================================== */
TAMBU.fidelizacion = {
  activo: false,                 // el programa aún no existe
  puntosPorMonto: 1,             // puntos que se ganan...
  montoBase: 1000,               // ...por cada este monto gastado (ej: 1 punto por $1.000)
  saldoEjemplo: 340,             // solo para la barra de demostración
  recompensas: [
    { nombre: "Salsa adicional",      puntos: 100 },
    { nombre: "Bebida",               puntos: 200 },
    { nombre: "Hand roll",            puntos: 400 },
    { nombre: "Descuento en tabla",   puntos: 800 }
  ]
};

/* ==========================================================================
   9. CUENTA DE EJEMPLO (solo para mostrar el diseño de mi-cuenta.html)
   ========================================================================== */
TAMBU.cuentaDemo = {
  nombre: "Cliente de ejemplo",
  correo: "cliente@ejemplo.cl",
  telefono: "+56 9 0000 0000",
  puntos: 340,
  pedidos: [
    { numero: "DEMO-0003", fecha: "Pedido de ejemplo", total: 18990, estado: "Entregado" },
    { numero: "DEMO-0002", fecha: "Pedido de ejemplo", total: 9480,  estado: "Entregado" },
    { numero: "DEMO-0001", fecha: "Pedido de ejemplo", total: 6990,  estado: "Retirado" }
  ]
};

/* ==========================================================================
   10. TEXTOS DE MARCA (nosotros.html e inicio) — edítalos libremente
   ========================================================================== */
TAMBU.marca = {
  lema: "Sushi preparado al momento en Talca.",
  intro: "Ingredientes frescos, rolls preparados al instante y la comodidad de pedir en pocos clics.",
  historia: [
    "Tambú nace en Talca con una idea simple: preparar sushi con cuidado, en el momento, para que llegue a tu mesa tal como sale de la cocina.",
    "Texto provisional: aquí irá la historia real del local, quiénes lo forman y qué los hace distintos. Puedes cambiar estos párrafos en js/demo-data.js."
  ],
  cita: "Lo hacemos al momento, sin apuro y sin atajos.",
  valores: [
    { titulo: "Frescura", texto: "Preparamos cada pedido cuando lo pides." },
    { titulo: "Oficio", texto: "Cortes y armado cuidados en cada pieza." },
    { titulo: "Cercanía", texto: "Un local de Talca, para Talca." }
  ]
};

/* ==========================================================================
   11. PREGUNTAS FRECUENTES
   ========================================================================== */
TAMBU.faq = {
  contacto: [
    { p: "¿Cómo hago un pedido?", r: "Por ahora puedes armar tu pedido en la web y enviarnos el resumen por WhatsApp. El pago en línea se habilitará más adelante." },
    { p: "¿Hacen despacho a domicilio?", r: "Zonas y costo de despacho por confirmar. Escríbenos por WhatsApp y te indicamos si llegamos a tu dirección." },
    { p: "¿Puedo pedir fuera del horario?", r: "Puedes armar tu pedido cuando quieras, pero lo prepararemos dentro del horario de atención." },
    { p: "¿Tienen opciones sin arroz o vegetarianas?", r: "Sí, revisa la categoría «Sin arroz y vegetarianos» en la carta." }
  ],
  fidelizacion: [
    { p: "¿El programa ya está disponible?", r: "Todavía no. Esta página muestra cómo funcionará. Las reglas definitivas se publicarán al lanzarlo." },
    { p: "¿Cómo se sumarán los puntos?", r: "Con cada pedido pagado y confirmado desde tu cuenta. Los puntos se calcularán en nuestro sistema, no en tu navegador." },
    { p: "¿Los puntos vencen?", r: "Las condiciones de vigencia se definirán antes del lanzamiento." },
    { p: "¿Necesito una cuenta?", r: "Sí, los puntos se asociarán a tu cuenta de cliente." }
  ]
};
