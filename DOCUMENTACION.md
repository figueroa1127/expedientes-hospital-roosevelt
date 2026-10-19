# Documentación técnica · Expedientes Médicos Digitales — Hospital Roosevelt

Prototipo de digitalización de registros médicos descrito en el capítulo de
arquitectura de la tesis. Este documento describe la arquitectura, el modelo
de datos, la API REST completa y el control de acceso por rol (RBAC).

El sistema incorpora, además de la gestión de expedientes, citas y
laboratorio: **acceso de pacientes con su número de DPI** (el personal de
admisión da de alta al paciente y este activa su propia contraseña), un módulo
de **signos vitales** (captura por enfermería y consulta por el paciente), la
**agenda con cupos por disponibilidad del médico** y una **interfaz con
fotografías** reales del entorno hospitalario.

---

## 1. Arquitectura general

```
┌──────────────┐   HTTPS (Vite rewrites)   ┌──────────────┐   HTTPS (DATABASE_URL)   ┌──────────────┐
│   Navegador  │ ────────────────────────▶ │   Frontend   │ ───────────────────────▶ │   Backend    │
│  (usuario)   │      /api/*               │    Vercel    │      /api/*              │   Render     │
└──────────────┘                           └──────────────┘                          └──────┬───────┘
                                                                                            │ TLS
                                                                                     ┌──────▼───────┐
                                                                                     │   PostgreSQL │
                                                                                     │    Neon      │
                                                                                     └──────────────┘
```

| Capa | Tecnología | Dónde corre | Responsabilidad |
|---|---|---|---|
| Interfaz | React 18 + Vite 5 + react-router-dom | Vercel | Pantallas, sesión (localStorage), peticiones REST |
| API | Node.js 18+ + Express 4 | Render | Lógica de negocio, JWT, RBAC, validaciones |
| Persistencia | PostgreSQL (paquete `pg`, Pool) | Neon | Tablas clínicas y transacciones |
| Autenticación | JWT (HS256) + bcryptjs | — | Sesiones con expiración y hash de contraseñas |

### Flujo de una petición

1. El navegador pide `/api/...` → Vercel lo reescribe (`frontend/vercel.json`) hacia la API de Render.
2. El frontend envía `Authorization: Bearer <token>`.
3. `middleware/auth.js` valida el token (`requireAuth`) y, si aplica, verifica el rol (`requireRole`).
4. La ruta consulta PostgreSQL con `pg` y devuelve JSON.
5. Los errores no controlados caen en el manejador central de `server.js` (HTTP 500 con `{ error }`).

---

## 2. Modelo de datos

Esquema creado automáticamente por `backend/src/db.js` (`initDb()`), ejecutado
al arrancar el servidor y por `npm run seed`.

| Tabla | Relación | Descripción |
|---|---|---|
| `usuarios` | raíz | Cuentas de acceso: nombre, correo único, hash de contraseña y rol (CHECK) |
| `pacientes` | 1—1 con `usuarios` | Ficha demográfica: DPI, registro médico, género, fecha nacimiento, teléfono, dirección, tipo de sangre y si el acceso está activo |
| `medicos` | 1—1 con `usuarios` | Colegiado y especialidad |
| `expedientes` | 1—1 con `pacientes` | Antecedentes y alergias (fechas de creación/actualización) |
| `consultas` | N por `expedientes` | Motivo, diagnóstico, notas; fecha automática |
| `recetas` | N por `consultas` | Medicamento, dosis, indicaciones |
| `ordenes_laboratorio` | N por `expedientes` | Exámenes solicitados, estado, resultado y archivo adjunto |
| `disponibilidad_medico` | N por `medicos` | Franjas horarias semanales (día, hora inicio, hora fin) del médico |
| `citas` | N por `pacientes` y `medicos` | Fecha, motivo, estado y quién la creó |
| `signos_vitales` | N por `pacientes` | Temperatura, presión, frecuencias, saturación, peso y talla; quién los registró |
| `auditoria` | N por `usuarios` | Traza de cada acción relevante (login, creación, consulta, etc.) |

### Columnas principales

**usuarios** · `id`, `nombre`, `correo`, `password_hash`, `rol` ∈ (`paciente`,`medico`,`enfermeria`,`admision`,`administrador`,`laboratorio`), `creado_en`

**pacientes** · `id`, `usuario_id` (FK), `dpi`, `registro_medico`, `genero`, `fecha_nacimiento`, `telefono`, `direccion`, `tipo_sangre`, `acceso_activo` (bool)

**medicos** · `id`, `usuario_id` (FK), `colegiado`, `especialidad`

**expedientes** · `id`, `paciente_id` (FK UNIQUE), `antecedentes`, `alergias`, `creado_en`, `actualizado_en`

**consultas** · `id`, `expediente_id` (FK), `medico_id` (FK), `fecha`, `motivo`, `diagnostico`, `notas`

**recetas** · `id`, `consulta_id` (FK), `medicamento`, `dosis`, `indicaciones`

**ordenes_laboratorio** · `id`, `expediente_id` (FK), `medico_id` (FK), `examen`, `indicaciones`, `estado` ∈ (`solicitada`,`en_proceso`,`completada`), `resultado`, `archivo_nombre`, `archivo_tipo`, `archivo_datos`, `fecha_solicitud`, `fecha_resultado`

**disponibilidad_medico** · `id`, `medico_id` (FK), `dia_semana` (0–6), `hora_inicio`, `hora_fin`

**citas** · `id`, `paciente_id` (FK), `medico_id` (FK), `fecha`, `motivo`, `estado` ∈ (`programada`,`atendida`,`cancelada`), `creado_por`

**signos_vitales** · `id`, `paciente_id` (FK), `registrado_por` (FK `usuarios`), `fecha`, `temperatura`, `presion_sistolica`, `presion_diastolica`, `frecuencia_cardiaca`, `frecuencia_respiratoria`, `saturacion_oxigeno`, `peso`, `talla`, `notas`

**auditoria** · `id`, `usuario_id` (FK), `accion`, `detalle`, `fecha`

### Integridad referencial

Todas las FK usan `ON DELETE CASCADE` donde aplica (un usuario eliminado
borra su ficha, su expediente y sus consultas). Las búsquedas críticas se
ejecutan dentro de transacciones (`BEGIN/COMMIT/ROLLBACK`), por ejemplo el
registro de una consulta con sus recetas en `routes/expedientes.js` o el alta
de un paciente con su expediente en `routes/pacientes.js`.

---

## 3. Autenticación y RBAC

### JWT

- Se genera en `POST /api/auth/login` con payload `{ id, nombre, correo, rol }`.
- También se emite en `POST /api/auth/paciente/acceso` cuando el paciente
  ingresa o activa su cuenta con DPI, mediante el mismo helper `firmarToken`.
- Algoritmo HS256, firma con la variable `JWT_SECRET`.
- Vigencia: `JWT_EXPIRES_IN` (por defecto `8h`).
- El frontend lo guarda en `localStorage` bajo la clave `hrv_token` y lo envía en `Authorization: Bearer <token>`.
- El middleware `requireAuth` lo verifica en cada petición protegida; `requireRole(...)` filtra por rol (403 si no aplica).

### Formas de acceso

1. **Personal del hospital** (`medico`, `enfermeria`, `admision`,
   `administrador`, `laboratorio`): inicia sesión con **correo institucional y
   contraseña**.
2. **Pacientes**: inician sesión con **número de DPI y contraseña**. La primera
   vez usan la opción **Crear acceso** (el personal de admisión ya dio de alta
   la ficha, pero sin contraseña; la `acceso_activo` pasa a `false` hasta que el
   paciente la activa). El servidor responde:
   - DPI inexistente → `404` «No encontramos ese DPI. Por favor solicítelo en admisión.»
   - DPI ya activo al intentar crearlo → `409` «El usuario es existente.»
   - DPI sin acceso activo al ingresar → `400` «Tu acceso aún no está activo…»
   - Contraseña incorrecta → `401` «DPI o contraseña incorrectos.»

> El antiguo **autoregistro público** se eliminó: las cuentas de paciente solo
> se crean desde el módulo de **Admisión** (que da el alta de la ficha) y el
> paciente activa su contraseña con su DPI.

### Matriz de permisos (RBAC)

Roles según el código de cada ruta del servidor.

| Función | Paciente | Médico | Enfermería | Laboratorio | Admisión | Administrador |
|---|:-:|:-:|:-:|:-:|:-:|:-:|
| Ver su propio expediente y signos | ✅ | — | — | — | — | — |
| Ver sus propias citas | ✅ | — | — | — | — | — |
| Registrar consulta + receta | — | ✅ | — | — | — | — |
| Solicitar examen de laboratorio | — | ✅ | — | — | — | — |
| Ver/crear expediente de un paciente | — | ✅ | ✅ | — | — | ✅ |
| Editar antecedentes y alergias | — | ✅ | ✅ | — | — | ✅ |
| Listar pacientes / buscar por DPI | — | ✅ | ✅ | — | ✅ | ✅ |
| Registrar paciente (alta de ficha) | — | — | — | — | ✅ | ✅ |
| Editar datos demográficos (DPI, etc.) | — | — | — | — | ✅ | ✅ |
| Agendar cita | — | ✅ (propia agenda) | — | — | ✅ | ✅ |
| Reagendar cita | — | — | — | — | ✅ | ✅ |
| Cambiar estado de cita | — | ✅ | ✅ | — | ✅ | ✅ |
| Ver agenda completa de citas | — | — | ✅ | — | ✅ | ✅ |
| Definir su horario de atención (cupos) | — | ✅ | — | — | — | ✅ |
| Ver panel de control (indicadores) | — | — | — | — | ✅ | ✅ |
| Ver bandeja de laboratorio | — | ✅ | — | ✅ | — | ✅ |
| Registrar resultado/archivo de laboratorio | — | ✅ | — | ✅ | — | ✅ |
| Registrar signos vitales | — | ✅ | ✅ | — | — | — |
| Ver signos vitales de un paciente | — | ✅ | ✅ | — | — | ✅ |
| Crear usuarios | — | — | — | — | — | ✅ |

> La interfaz oculta los módulos que no corresponden al rol: por ejemplo, el
> **Panel de control** solo lo muestran admisión y administrador, y el módulo
> **Signos vitales** solo aparece para enfermería y administrador.

---

## 4. API REST

Base URL de producción: `https://expedientes-hospital-api.onrender.com`
Base URL local: `http://localhost:4000`
Todas las respuestas son JSON. Las rutas con 🔒 requieren `Authorization: Bearer <token>`.

### 4.1 Salud del servicio

| Método | Ruta | Acceso | Descripción |
|---|---|---|---|
| GET | `/api/salud` | Público | Comprobación de que la API está viva |

**Respuesta 200**
```json
{ "estado": "ok", "servicio": "Expedientes Médicos Digitales - Hospital Roosevelt" }
```

### 4.2 Autenticación

| Método | Ruta | Acceso | Descripción |
|---|---|---|---|
| POST | `/api/auth/login` | Público | Inicia sesión del personal y devuelve JWT (correo sin distinguir mayúsculas) |
| POST | `/api/auth/paciente/acceso` | Público | Ingreso o creación de acceso del paciente con DPI |
| GET | `/api/auth/perfil` | 🔒 | Devuelve el usuario del token (valida la sesión) |

**POST `/api/auth/login`**
```json
// Petición
{ "correo": "admin@hospitalroosevelt.gt", "password": "Admin123!" }

// Respuesta 200
{ "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "usuario": { "id": 1, "nombre": "Ana Administradora",
               "correo": "admin@hospitalroosevelt.gt", "rol": "administrador" } }

// Errores: 400 campos obligatorios · 401 credenciales incorrectas
```

**POST `/api/auth/paciente/acceso`**
```json
// Ingresar (crear=false u omitido)
{ "dpi": "1234567890101", "password": "Paciente123!" }

// Crear/activar acceso (primera vez)
{ "dpi": "2345678900102", "password": "MiClave123", "crear": true }

// Respuesta 200
{ "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "usuario": { "id": 9, "nombre": "José Pérez",
               "correo": "paciente@hospitalroosevelt.gt", "rol": "paciente" } }

// Errores: 400 DPI/contraseña faltantes o corta · 404 DPI no encontrado (solicítelo en admisión)
//          409 al crear si el DPI ya tenía acceso · 401 contraseña incorrecta
```

### 4.3 Usuarios

| Método | Ruta | Acceso | Descripción |
|---|---|---|---|
| GET | `/api/usuarios` | 🔒 administrador | Listado de cuentas |
| POST | `/api/usuarios` | 🔒 administrador | Crea cuenta (y ficha de paciente/médico si aplica) |

**POST `/api/usuarios`**
```json
// Petición (rol ∈ paciente | medico | enfermeria | admision | administrador | laboratorio)
{ "nombre": "María López", "correo": "maria@correo.com",
  "password": "Clave123!", "rol": "paciente" }

// Respuesta 201
{ "id": 7, "nombre": "María López", "correo": "maria@correo.com", "rol": "paciente" }

// Errores: 400 campos/rol inválidos · 409 correo ya registrado · 403 sin permisos
```

### 4.4 Pacientes

| Método | Ruta | Acceso | Descripción |
|---|---|---|---|
| GET | `/api/pacientes` | 🔒 medico, enfermeria, admision, administrador | Listado con búsqueda por nombre |
| GET | `/api/pacientes/dpi/:dpi` | 🔒 medico, enfermeria, admision, administrador | Busca la ficha del paciente por DPI |
| POST | `/api/pacientes` | 🔒 admision, administrador | Da de alta un paciente (crea usuario, ficha y expediente) |
| PUT | `/api/pacientes/:id` | 🔒 admision, administrador | Actualiza datos demográficos |

**POST `/api/pacientes`**

```json
// Petición (la contraseña es opcional: sin ella, el paciente activa su acceso después)
{ "nombre": "Consuelo Juárez", "correo": "consuelo@correo.com",
  "dpi": "2345678900102", "registro_medico": "EXP-1042",
  "genero": "Femenino", "fecha_nacimiento": "1990-05-14",
  "telefono": "5555-1234", "direccion": "Zona 1, Guatemala", "tipo_sangre": "O+" }

// Respuesta 201
{ "id": 44, "mensaje": "Paciente registrado correctamente." }
// Errores: 400 nombre/correo faltantes · 409 correo ya registrado
// Nota: si se envía "password" queda con acceso activo; si no, acceso_activo=false.
```

**GET `/api/pacientes/dpi/:dpi`** → `200` con la ficha del paciente o `404`
`{ "error": "No se encontró un paciente con ese DPI." }`.

**PUT `/api/pacientes/:id`**
```json
// Petición (cualquier campo puede omitirse)
{ "dpi": "1234567890101", "registro_medico": "EXP-1001", "genero": "Masculino",
  "fecha_nacimiento": "1990-05-14", "telefono": "5555-1234",
  "direccion": "Zona 1, Guatemala", "tipo_sangre": "O+" }

// Respuesta 200
{ "mensaje": "Datos del paciente actualizados." }
// Errores: 404 paciente no encontrado · 403 sin permisos
```

### 4.5 Expedientes

| Método | Ruta | Acceso | Descripción |
|---|---|---|---|
| GET | `/api/expedientes/mio` | 🔒 paciente | Expediente propio con historial completo |
| GET | `/api/expedientes/paciente/:pacienteId` | 🔒 medico, enfermeria, administrador | Expediente del paciente (lo crea si no existe) |
| POST | `/api/expedientes/:expedienteId/consultas` | 🔒 medico | Nueva consulta con recetas (transacción) |
| POST | `/api/expedientes/:expedienteId/ordenes` | 🔒 medico | Solicita un examen de laboratorio |
| PUT | `/api/expedientes/:expedienteId` | 🔒 medico, enfermeria, administrador | Actualiza antecedentes y alergias |

**POST `/api/expedientes/:expedienteId/consultas`**
```json
// Petición
{ "motivo": "Dolor abdominal", "diagnostico": "Gastritis leve",
  "notas": "Dieta blanda, control en 15 días.",
  "recetas": [ { "medicamento": "Omeprazol 20mg", "dosis": "1 cápsula cada 24h",
                 "indicaciones": "En ayunas" } ] }

// Respuesta 201
{ "mensaje": "Consulta registrada correctamente.", "consultaId": 1 }
// Errores: 404 sin ficha médica · 403 si el rol no es médico
```

**POST `/api/expedientes/:expedienteId/ordenes`**
```json
// Petición
{ "examen": "Hemograma completo", "indicaciones": "Ayuno de 8 horas" }
// Respuesta 201: { "id": 1, "mensaje": "Orden de laboratorio creada." }
```

**Estructura de la respuesta del expediente** (GET):
```json
{ "id": 1, "paciente_id": 1, "antecedentes": "…", "alergias": "…",
  "creado_en": "2026-09-11 06:16:33", "actualizado_en": "…",
  "consultas": [
    { "id": 1, "motivo": "…", "diagnostico": "…", "notas": "…",
      "fecha": "…", "medico_nombre": "Dr. Mario Solís",
      "especialidad": "Medicina Interna",
      "recetas": [ { "medicamento": "Omeprazol 20mg", "dosis": "…" } ] }
  ],
  "ordenes": [ { "id": 1, "examen": "Hemograma completo", "estado": "completada", "…": "…" } ] }
```

### 4.6 Citas y disponibilidad

| Método | Ruta | Acceso | Descripción |
|---|---|---|---|
| GET | `/api/citas` | 🔒 | Agenda filtrada por rol (paciente: las suyas; médico: las suyas; resto: todas) |
| GET | `/api/citas/medicos` | 🔒 | Médicos disponibles para agendar |
| GET | `/api/citas/mi-horario` | 🔒 | Horario semanal del médico |
| PUT | `/api/citas/mi-horario` | 🔒 medico, administrador | Reemplaza el horario semanal (franjas) |
| GET | `/api/citas/disponibilidad/:medicoId?fecha=AAAA-MM-DD` | 🔒 | Cupos de 30 min del día, con marca de ocupados |
| POST | `/api/citas` | 🔒 admision, administrador, medico | Agenda una cita (valida cupo libre) |
| PUT | `/api/citas/:id` | 🔒 admision, administrador | Reagenda una cita |
| PUT | `/api/citas/:id/estado` | 🔒 medico, enfermeria, admision, administrador | Cambia el estado |

**GET `/api/citas/disponibilidad/:medicoId`**
```json
// Respuesta 200 para 2026-10-26 (lunes)
{ "fecha": "2026-10-26", "dia": "lunes",
  "cupos": ["08:30", "09:00", "09:30", "..."],          // solo los libres
  "detalle": [ { "hora": "08:00", "disponible": false }, // ya hay una cita
               { "hora": "08:30", "disponible": true } ] }
```
El backend genera cupos cada 30 minutos entre `hora_inicio` y `hora_fin` de
`disponibilidad_medico` para el día de la semana de la fecha, descarta los
pasados si es hoy y marca como no disponibles los que ya tienen una cita
(estado distinto de `cancelada`). El parámetro `excluir` (id de cita) permite
reagendar sin que la propia cita bloquee su horario.

**POST `/api/citas`**
```json
// Petición (admision/administrador indican paciente_id; el médico agenda en su propia agenda)
{ "paciente_id": 1, "medico_id": 4, "fecha": "2026-10-26T10:00",
  "motivo": "Control de gastritis" }

// Respuesta 201
{ "id": 3, "mensaje": "Cita agendada correctamente." }
// Errores: 400 faltan datos · 409 horario ocupado o fuera de disponibilidad
//          ("Ese horario ya está ocupado. Elige otra hora u otra fecha.")
```

**GET/PUT `/api/citas/mi-horario`**
```json
// PUT — Petición: { "franjas": [ { "dia_semana": 1, "hora_inicio": "08:00", "hora_fin": "12:00" } ] }
// Respuesta 200: { "mensaje": "Horario guardado correctamente." }
```

**PUT `/api/citas/:id` (reagendar)** → `200` `{ "mensaje": "Cita reagendada correctamente." }`;
valida el nuevo cupo (409 si está ocupado).

### 4.7 Órdenes de laboratorio

| Método | Ruta | Acceso | Descripción |
|---|---|---|---|
| GET | `/api/laboratorio` | 🔒 medico, administrador, laboratorio | Bandeja con todas las órdenes |
| PUT | `/api/laboratorio/:id` | 🔒 medico, administrador, laboratorio | Registra resultado, adjunta archivo y/o cambia estado |
| GET | `/api/laboratorio/:id/archivo` | 🔒 medico, administrador, laboratorio | Descarga el archivo adjunto |

**PUT `/api/laboratorio/:id`**
```json
// Petición (si se envía resultado o archivo, la orden pasa a "completada" automáticamente)
{ "resultado": "Hb 14.2 g/dL, Leucocitos 6800, Plaquetas 245000",
  "archivo": { "nombre": "resultado.pdf", "tipo": "application/pdf", "datos": "<base64>" } }

// Respuesta 200
{ "mensaje": "Orden de laboratorio actualizada.", "estado": "completada" }
// Errores: 400 estado/formato inválidos o archivo > 5 MB · 404 orden no encontrada
```
Archivos permitidos: PDF, PNG y JPG (guardados en la base de datos, máx. ~5 MB).

### 4.8 Reportes (panel de control)

| Método | Ruta | Acceso | Descripción |
|---|---|---|---|
| GET | `/api/reportes/resumen` | 🔒 medico, enfermeria, admision, administrador | Indicadores y estadísticas del panel |

**Respuesta 200 (resumen)**
```json
{
  "totales": { "pacientes": 50, "consultas": 62, "citas": 55,
                "citasProgramadas": 24, "ordenesPendientes": 6 },
  "citasPorEstado": [ { "etiqueta": "programada", "valor": 24 }, "…" ],
  "consultasPorMes": [ { "etiqueta": "may 26", "valor": 3 }, "…" ],
  "diagnosticosFrecuentes": [ { "etiqueta": "Gastritis leve", "valor": 4 }, "…" ],
  "tiposSangre": [ { "etiqueta": "O+", "valor": 6 }, "…" ],
  "gruposEdad": [ { "etiqueta": "Adultez joven (30-44)", "valor": 5 }, "…" ]
}
```
En la interfaz, el panel se muestra únicamente a **admisión** y **administrador**.

### 4.9 Signos vitales

| Método | Ruta | Acceso | Descripción |
|---|---|---|---|
| GET | `/api/signos` | 🔒 medico, enfermeria, administrador | Registros más recientes de todos los pacientes (incluye el DPI) |
| GET | `/api/signos/mio` | 🔒 paciente | Los signos vitales del propio paciente |
| GET | `/api/signos/paciente/:pacienteId` | 🔒 medico, enfermeria, administrador | Historial de signos de un paciente |
| POST | `/api/signos` | 🔒 medico, enfermeria | Registra una toma de signos vitales |

**POST `/api/signos`**
```json
// Petición (cualquier signo puede omitirse, pero debe haber al menos uno)
{ "paciente_id": 1, "temperatura": 36.8, "presion_sistolica": 120,
  "presion_diastolica": 80, "frecuencia_cardiaca": 78,
  "frecuencia_respiratoria": 16, "saturacion_oxigeno": 98,
  "peso": 72.5, "talla": 1.70, "notas": "Paciente en reposo." }

// Respuesta 201
{ "id": 19, "mensaje": "Signos vitales registrados correctamente." }
// Errores: 400 sin paciente o sin ningún signo · 404 paciente no encontrado
//          403 si el rol es paciente/admisión/laboratorio
```

**Respuesta de un listado (GET)**
```json
[ { "id": 19, "paciente_id": 1, "paciente_nombre": "José Pérez",
    "paciente_dpi": "1234567890101",
    "fecha": "2026-10-15 09:30:00", "temperatura": "37.0",
    "presion_sistolica": 120, "presion_diastolica": 80,
    "frecuencia_cardiaca": 76, "frecuencia_respiratoria": 18,
    "saturacion_oxigeno": 98, "peso": "72.50", "talla": "1.70",
    "notas": "…", "registrado_por_nombre": "Lucía Enfermera" } ]
```

Los signos de un paciente también se muestran dentro de la tarjeta
**Signos vitales** del expediente (`VistaExpediente.jsx`). En la pantalla
**Signos vitales** (`SignosVitales.jsx`) el personal localiza al paciente por su
**DPI** (búsqueda) y puede filtrar los registros recientes por nombre o por DPI.
Cada registro queda anotado en `auditoria` (`registrar_signos_vitales`).

---

## 5. Estructura del código

```
expedientes-hospital-roosevelt/
├── backend/                     API REST
│   ├── .env / .env.example      Configuración (PG*, JWT_SECRET, PORT)
│   ├── package.json             scripts: dev, start, seed
│   └── src/
│       ├── db.js                Pool de pg + esquema (initDb) + disponibilidad por defecto
│       ├── server.js            Express, rutas, manejo de errores, arranque
│       ├── seed.js              Datos de prueba (6 roles + pacientes demo), idempotente
│       ├── asyncHandler.js      Captura errores de controladores async
│       ├── middleware/auth.js   requireAuth (JWT) y requireRole (RBAC)
│       └── routes/              auth, usuarios, pacientes, expedientes,
│                                citas, laboratorio, signos, reportes
└── frontend/                    Interfaz React
    ├── vercel.json              Rewrites /api → API de Render
    ├── vite.config.js           Puerto 5173, host, allowedHosts, proxy → 4000
    ├── public/fotos/            Fotografías reales del sistema (login, panel)
    └── src/
        ├── api.js               Cliente REST (fetch + token)
        ├── App.jsx              Rutas y protecciones por rol
        ├── context/AuthContext  Sesión: token, usuario, login/acceso paciente/logout
        ├── components/          Layout, RutaProtegida, VistaExpediente, Graficas
        ├── pages/               Login, Resumen, Dashboard, Pacientes,
        │                        ExpedienteDetalle, MiExpediente, Citas,
        │                        Laboratorio, SignosVitales, Usuarios
        └── styles/theme.css     Sistema de diseño (colores clínicos)
```

---

## 6. Variables de entorno

| Variable | Uso | Local | Render |
|---|---|---|---|
| `PORT` | Puerto de la API | `4000` | asignada por Render |
| `JWT_SECRET` | Firma de los tokens | en `.env` | en Environment |
| `JWT_EXPIRES_IN` | Vigencia del token | `8h` | `8h` |
| `PGHOST/PGPORT/PGUSER/PGPASSWORD/PGDATABASE` | Conexión PostgreSQL local | en `.env` | — |
| `DATABASE_URL` | Conexión a PostgreSQL en la nube (Neon). Tiene prioridad si existe | opcional | en Environment |

---

## 7. Despliegue

| Componente | Servicio | Configuración clave |
|---|---|---|
| Frontend | Vercel | Root directory `frontend`, framework Vite; `vercel.json` reescribe `/api/*` a Render |
| Backend | Render | Root directory `backend`, build `npm install`, start `npm run seed && npm start`; variables `DATABASE_URL` y `JWT_SECRET` |
| Base de datos | Neon (PostgreSQL) | Proyecto `expedientes-hospital`; esquema creado por `initDb()` y datos por `seed` |
| Código | GitHub | `figueroa1127/expedientes-hospital-roosevelt` (sin `.env` ni bases de datos) |

---

## 8. Seguridad

- Contraseñas guardadas con **bcryptjs** (coste 10); nunca se exponen en la API.
- Tokens **JWT firmados** con expiración; se envían por header `Authorization`.
- **RBAC** verificado en el servidor (no confía en el frontend).
- **Alta de pacientes controlada**: solo admisión/administrador crean cuentas de
  paciente; el paciente activa su contraseña con su DPI. El servidor valida el
  formato de correo y la longitud mínima de la contraseña.
- **Auditoría** de logins, activaciones de acceso, altas de pacientes,
  creación de usuarios, vistas y modificaciones de expedientes, citas y signos vitales.
- El archivo `.env` está en `.gitignore`; los secretos no se suben a GitHub.
- Restricción de host en Vite (`allowedHosts`) para servir detrás de dominio público.
- SSL obligatorio en la conexión a PostgreSQL en la nube (`sslmode=require`).

---

## 9. Pruebas ejecutadas

Verificación del flujo completo contra PostgreSQL local y, después, contra la
nube (Neon + Render + Vercel):

1. `npm install` → dependencias resueltas sin módulos nativos.
2. `npm run seed` → 11 tablas creadas y usuarios de prueba insertados (6 roles + pacientes de demostración).
3. `GET /api/salud` → `estado: ok`.
4. `POST /api/auth/login` con los 6 roles → token emitido correctamente.
5. `GET /api/pacientes`, `GET /api/expedientes/paciente/:id`, `GET /api/citas` → datos coherentes (expediente con consultas y recetas).
6. `GET /api/reportes/resumen` → totales y series (consultas por mes, citas por estado, diagnósticos, tipo de sangre, grupo de edad).
7. Flujo de laboratorio: `POST /api/expedientes/1/ordenes` (médico) → `GET /api/laboratorio` (laboratorio) → `PUT /api/laboratorio/:id` con resultado y archivo → orden completada.
8. Acceso de pacientes: `POST /api/auth/paciente/acceso` con DPI inexistente → 404 («solicítelo en admisión»); paciente sin acceso → «crear acceso» activa y permite ingresar; DPI ya activo → 409 («el usuario es existente»); contraseña incorrecta → 401.
9. Alta de paciente sin contraseña (`POST /api/pacientes` como admisión) → ficha creada con `acceso_activo=false`; el paciente la activa con su DPI.
10. Citas: `PUT /api/citas/mi-horario` (médico) guarda franjas; `GET /api/citas/disponibilidad/:medicoId` devuelve cupos y marca los ocupados; `POST /api/citas` en un horario ocupado → 409 («Ese horario ya está ocupado…»).
11. Signos vitales: `POST /api/signos` (enfermería) → 201; sin ningún signo → 400; paciente con rol `paciente` → 403; rol `enfermeria` ya no accede a `/api/laboratorio` → 403; `GET /api/signos` y `GET /api/signos/paciente/:id` devuelven el registro con `registrado_por_nombre` y `paciente_dpi`.
12. `npm run build` del frontend → compilación sin errores.
13. Despliegue: login por rol, acceso de pacientes por DPI, agenda con cupos y búsqueda de citas por fecha funcionando a través de `vercel.app → onrender.com → Neon`.
