# Documentación técnica · Expedientes Médicos Digitales — Hospital Roosevelt

Prototipo de digitalización de registros médicos descrito en el capítulo de
arquitectura de la tesis. Este documento describe la arquitectura, el modelo
de datos, la API REST completa y el control de acceso por rol (RBAC).

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
| `pacientes` | 1—1 con `usuarios` | Ficha demográfica: DPI, fecha nacimiento, teléfono, dirección, tipo de sangre |
| `medicos` | 1—1 con `usuarios` | Colegiado y especialidad |
| `expedientes` | 1—1 con `pacientes` | Antecedentes y alergias (fechas de creación/actualización) |
| `consultas` | N por `expedientes` | Motivo, diagnóstico, notas; fecha automática |
| `recetas` | N por `consultas` | Medicamento, dosis, indicaciones |
| `citas` | N por `pacientes` y `medicos` | Fecha, motivo, estado y quién la creó |
| `auditoria` | N por `usuarios` | Traza de cada acción relevante (login, creación, consulta, etc.) |

### Columnas principales

**usuarios** · `id`, `nombre`, `correo`, `password_hash`, `rol` ∈ (`paciente`,`medico`,`enfermeria`,`admision`,`administrador`), `creado_en`

**pacientes** · `id`, `usuario_id` (FK), `dpi`, `fecha_nacimiento`, `telefono`, `direccion`, `tipo_sangre`

**medicos** · `id`, `usuario_id` (FK), `colegiado`, `especialidad`

**expedientes** · `id`, `paciente_id` (FK UNIQUE), `antecedentes`, `alergias`, `creado_en`, `actualizado_en`

**consultas** · `id`, `expediente_id` (FK), `medico_id` (FK), `fecha`, `motivo`, `diagnostico`, `notas`

**recetas** · `id`, `consulta_id` (FK), `medicamento`, `dosis`, `indicaciones`

**citas** · `id`, `paciente_id` (FK), `medico_id` (FK), `fecha`, `motivo`, `estado` ∈ (`programada`,`atendida`,`cancelada`), `creado_por`

**auditoria** · `id`, `usuario_id` (FK), `accion`, `detalle`, `fecha`

### Integridad referencial

Todas las FK usan `ON DELETE CASCADE` donde aplica (un usuario eliminado
borra su ficha, su expediente y sus consultas). Las búsquedas críticas se
ejecutan dentro de transacciones (`BEGIN/COMMIT/ROLLBACK`), por ejemplo el
registro de una consulta con sus recetas en `routes/expedientes.js`.

---

## 3. Autenticación y RBAC

### JWT

- Se genera en `POST /api/auth/login` con payload `{ id, nombre, correo, rol }`.
- Algoritmo HS256, firma con la variable `JWT_SECRET`.
- Vigencia: `JWT_EXPIRES_IN` (por defecto `8h`).
- El frontend lo guarda en `localStorage` bajo la clave `hrv_token` y lo envía en `Authorization: Bearer <token>`.
- El middleware `requireAuth` lo verifica en cada petición protegida; `requireRole(...)` filtra por rol (403 si no aplica).

### Matriz de permisos (RBAC)

| Función | Paciente | Médico | Enfermería | Admisión | Administrador |
|---|:-:|:-:|:-:|:-:|:-:|
| Ver su propio expediente | ✅ | — | — | — | — |
| Registrar consulta + receta | — | ✅ | — | — | — |
| Ver/crear expediente de un paciente | — | ✅ | ✅ | — | ✅ |
| Editar antecedentes y alergias | — | ✅ | ✅ | — | ✅ |
| Listar pacientes | — | ✅ | ✅ | ✅ | ✅ |
| Editar datos demográficos (DPI, etc.) | — | — | — | ✅ | ✅ |
| Ver expediente de un paciente | — | ✅ | ✅ | — | ✅ |
| Agendar citas | ✅ (las suyas) | — | — | ✅ | ✅ |
| Cambiar estado de citas | — | ✅ | ✅ | ✅ | ✅ |
| Ver agenda completa de citas | — | — | ✅ | ✅ | ✅ |
| Crear usuarios | — | — | — | — | ✅ |

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

| Método | Raza | Acceso | Descripción |
|---|---|---|---|
| POST | `/api/auth/login` | Público | Inicia sesión y devuelve JWT |
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

### 4.3 Usuarios

| Método | Ruta | Acceso | Descripción |
|---|---|---|---|
| GET | `/api/usuarios` | 🔒 administrador | Listado de cuentas |
| POST | `/api/usuarios` | 🔒 administrador | Crea cuenta (y ficha de paciente/médico si aplica) |

**POST `/api/usuarios`**
```json
// Petición
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
| PUT | `/api/pacientes/:id` | 🔒 admision, administrador | Actualiza datos demográficos |

**PUT `/api/pacientes/:id`**
```json
// Petición (cualquier campo puede omitirse)
{ "dpi": "1234567890101", "fecha_nacimiento": "1990-05-14",
  "telefono": "5555-1234", "direccion": "Zona 1, Guatemala", "tipo_sangre": "O+" }

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

**PUT `/api/expedientes/:expedienteId`**
```json
// Petición
{ "antecedentes": "Hipertensión controlada.", "alergias": "Penicilina" }

// Respuesta 200
{ "mensaje": "Expediente actualizado." }
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
  ] }
```

### 4.6 Citas

| Método | Ruta | Acceso | Descripción |
|---|---|---|---|
| GET | `/api/citas` | 🔒 | Agenda filtrada por rol (paciente: las suyas; médico: las suyas; resto: todas) |
| GET | `/api/citas/medicos` | 🔒 | Médicos disponibles para agendar |
| POST | `/api/citas` | 🔒 admision, administrador, paciente | Agenda una cita |
| PUT | `/api/citas/:id/estado` | 🔒 medico, enfermeria, admision, administrador | Cambia el estado |

**POST `/api/citas`**
```json
// Petición (admision/administrador indican paciente_id; el paciente no, se usa el suyo)
{ "paciente_id": 1, "medico_id": 4, "fecha": "2026-09-20T10:00:00.000Z",
  "motivo": "Control de gastritis" }

// Respuesta 201
{ "id": 3, "mensaje": "Cita agendada correctamente." }
// Errores: 400 faltan datos · 404 sin ficha de paciente
```

**PUT `/api/citas/:id/estado`**
```json
// Petición
{ "estado": "atendida" }   // "programada" | "atendida" | "cancelada"
// Respuesta 200: { "mensaje": "Estado de la cita actualizado." }
// Error 400: estado inválido
```

---

## 5. Estructura del código

```
expedientes-hospital-roosevelt/
├── backend/                     API REST
│   ├── .env / .env.example      Configuración (PG*, JWT_SECRET, PORT)
│   ├── package.json             scripts: dev, start, seed
│   └── src/
│       ├── db.js                Pool de pg + esquema (initDb) + filas()/fila()
│       ├── server.js            Express, rutas, manejo de errores, arranque
│       ├── seed.js              Datos de prueba (5 roles), idempotente
│       ├── asyncHandler.js      Captura errores de controladores async
│       ├── middleware/auth.js   requireAuth (JWT) y requireRole (RBAC)
│       └── routes/              auth, usuarios, pacientes, expedientes, citas
└── frontend/                    Interfaz React
    ├── vercel.json              Rewrites /api → API de Render
    ├── vite.config.js           Puerto 5173, host, allowedHosts, proxy → 4000
    └── src/
        ├── api.js               Cliente REST (fetch + token)
        ├── App.jsx              Rutas y protecciones por rol
        ├── context/AuthContext  Sesión: token, usuario, login/logout
        ├── components/          Layout, RutaProtegida, VistaExpediente
        ├── pages/               Login, Resumen, Pacientes, ExpedienteDetalle,
        │                        MiExpediente, Citas, Usuarios
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
- **Auditoría** de logins, creación de usuarios, vistas y modificaciones de expedientes y citas.
- El archivo `.env` está en `.gitignore`; los secretos no se suben a GitHub.
- Restricción de host en Vite (`allowedHosts`) para servir detrás de dominio público.
- SSL obligatorio en la conexión a PostgreSQL en la nube (`sslmode=require`).

---

## 9. Pruebas ejecutadas

Verificación del flujo completo contra PostgreSQL local y, después, contra la
nube (Neon + Render + Vercel):

1. `npm install` → dependencias resueltas sin módulos nativos.
2. `npm run seed` → 8 tablas creadas y 5 usuarios de prueba insertados.
3. `GET /api/salud` → `estado: ok`.
4. `POST /api/auth/login` con los 5 roles → token emitido correctamente.
5. `GET /api/pacientes`, `GET /api/expedientes/paciente/:id`, `GET /api/citas` → datos coherentes (expediente con consultas y recetas).
6. Despliegue: login y listados funcionando a través de `vercel.app → onrender.com → Neon`.
