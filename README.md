# Expedientes Médicos Digitales · Hospital Roosevelt

Prototipo funcional del sistema de digitalización y automatización de registros
médicos descrito en el capítulo de arquitectura de la tesis: frontend en React,
backend en Node.js/Express, base de datos relacional, autenticación con JWT y
control de acceso por rol (RBAC) para los 5 actores definidos en el diagrama de
casos de uso: **médico, enfermería, paciente, admisión y administrador**.

> Nota sobre la base de datos: el prototipo usa **PostgreSQL**, el motor
> definido en el capítulo de arquitectura. El esquema de tablas se crea
> automáticamente al arrancar (o al ejecutar el seed). Para conectarse solo
> ajusta las variables `PG*` del archivo `backend/.env`; si un día despliegas
> en la nube basta con definir `DATABASE_URL`.

## Estructura del proyecto

```
expedientes-hospital-roosevelt/
├── backend/          API REST (Node.js + Express + SQLite + JWT)
│   ├── src/
│   │   ├── db.js            esquema de la base de datos
│   │   ├── seed.js          crea usuarios de prueba (uno por rol)
│   │   ├── middleware/auth.js
│   │   ├── routes/           auth, usuarios, pacientes, expedientes, citas
│   │   └── server.js
│   └── .env.example
└── frontend/         Interfaz web (React + Vite)
    └── src/
        ├── pages/            Login, Resumen, Pacientes, Expediente, Citas, Usuarios
        ├── components/       Layout, VistaExpediente, RutaProtegida
        └── context/AuthContext.jsx
```

## 1. Requisitos

- [Node.js](https://nodejs.org) versión 18 o superior (incluye `npm`)
- [PostgreSQL](https://www.postgresql.org/download/) versión 15 o superior, corriendo en tu máquina
- [Visual Studio Code](https://code.visualstudio.com)
- (Opcional) [Git](https://git-scm.com) y una cuenta de GitHub, para subirlo

## 2. Abrir el proyecto en VS Code

1. Descomprime el archivo `.zip` que te compartí en una carpeta de tu
   computadora, por ejemplo `Documentos/tesis-hospital`.
2. Abre VS Code.
3. Ve a **Archivo → Abrir carpeta…** y selecciona la carpeta
   `expedientes-hospital-roosevelt`.
4. Abre una terminal integrada con **Terminal → Nueva terminal** (o
   `` Ctrl+ñ `` / `` Ctrl+` ``). Todos los comandos de abajo se ejecutan ahí.

## 3. Poner a correr el backend (la API)

```bash
cd backend
npm install
cp .env.example .env    # luego edita .env y pon tu contraseña de PostgreSQL
npm run seed      # crea las tablas y usuarios de prueba en PostgreSQL
npm run dev        # arranca la API en http://localhost:4000
```

Deja esa terminal abierta (el servidor debe seguir corriendo). Verás en
consola: `API de expedientes médicos escuchando en http://localhost:4000`.

## 4. Poner a correr el frontend (la web)

Abre una **segunda terminal** en VS Code (ícono `+` en el panel de terminal)
y ejecuta:

```bash
cd frontend
npm install
npm run dev
```

Abre en tu navegador la dirección que te indique la terminal, normalmente:
**http://localhost:5173**

## 5. Iniciar sesión

En la pantalla de login puedes hacer clic en cualquiera de los botones de
"cuentas de demostración" para autocompletar los datos, o usar directamente:

| Rol            | Correo                             | Contraseña       |
|----------------|-------------------------------------|-------------------|
| Administrador  | admin@hospitalroosevelt.gt         | Admin123!         |
| Admisión       | admision@hospitalroosevelt.gt      | Admision123!      |
| Enfermería     | enfermeria@hospitalroosevelt.gt    | Enfermeria123!    |
| Médico         | medico@hospitalroosevelt.gt        | Medico123!        |
| Paciente       | paciente@hospitalroosevelt.gt      | Paciente123!      |

Cada rol ve un menú y unos permisos distintos, siguiendo el control de acceso
basado en roles (RBAC) descrito en la arquitectura:

- **Paciente**: ve su propio expediente y sus citas.
- **Médico**: ve la lista de pacientes, abre su expediente y registra nuevas
  consultas y recetas; ve su agenda de citas.
- **Enfermería**: consulta expedientes y la agenda de citas.
- **Admisión**: registra/actualiza datos de pacientes y agenda citas.
- **Administrador**: acceso completo, incluida la creación de usuarios.

## 6. Cómo subirlo a GitHub

1. Crea una cuenta en [github.com](https://github.com) si no tienes una, y
   crea un repositorio nuevo (botón verde **New**), por ejemplo llamado
   `expedientes-hospital-roosevelt`. No marques la opción de agregar README
   (ya tenemos uno).
2. En la terminal de VS Code, dentro de la carpeta del proyecto:

```bash
git init
git add .
git commit -m "Prototipo inicial: expedientes médicos digitales"
git branch -M main
git remote add origin https://github.com/TU-USUARIO/expedientes-hospital-roosevelt.git
git push -u origin main
```

(Sustituye `TU-USUARIO` por tu usuario de GitHub; VS Code te pedirá iniciar
sesión la primera vez). El archivo `.gitignore` ya está configurado para no
subir `node_modules`, la base de datos ni el archivo `.env` con secretos.

## 7. Versión publicada en la nube

El sistema está desplegado y accesible desde cualquier dispositivo:

- **Interfaz web (frontend):** https://expedientes-hospital-roosevelt.vercel.app
- **API (backend):** https://expedientes-hospital-api.onrender.com
- **Base de datos:** PostgreSQL en la nube (Neon), conectada mediante la
  variable `DATABASE_URL` en Render.

> Nota: en el plan gratuito de Render la API se "duerme" tras unos minutos
> de inactividad; la primera petición tras un rato puede tardar ~30 s.

## 8. Siguientes pasos sugeridos para la tesis

- Añadir el motor de interoperabilidad HL7/FHIR como una capa adicional
  sobre las rutas de `expedientes`.
- Contenerizar cada carpeta (`backend`, `frontend`) con Docker, tal como se
  describe en la sección de escalabilidad.
- Sustituir la autenticación propia por Azure Active Directory si se decide
  avanzar con el despliegue híbrido en Azure.
- Desplegar PostgreSQL en la nube (p. ej. Azure Database for PostgreSQL)
  y conectar la API usando la variable `DATABASE_URL` en lugar de las `PG*`.
