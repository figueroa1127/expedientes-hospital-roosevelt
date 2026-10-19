# Sistema de Expedientes Médicos · Hospital Roosevelt
## Guía sencilla del proyecto

Esta guía explica en palabras simples qué es el sistema, cómo funciona y qué
información guarda.

---

## 1. ¿Qué es este sistema?

Es una **página web** que reemplaza el expediente de papel de un hospital. En
él se registran los pacientes, sus antecedentes médicos, las consultas que
tienen con los doctores, las medicinas que les recetan, sus citas, los
exámenes de laboratorio y sus **signos vitales** (temperatura, presión,
frecuencia cardíaca, etc.).

Toda la información queda guardada en una base de datos en la nube (internet),
así que varios empleados del hospital pueden consultarla desde distintas
computadoras al mismo tiempo.

---

## 2. ¿Dónde se usa?

Solo necesitas un navegador de internet (Chrome, Edge, etc.):

**Dirección de la página:** <https://expedientes-hospital-roosevelt.vercel.app>

No hay que instalar nada. Funciona desde una computadora, una tablet o un
celular.

---

## 3. ¿Quién lo puede usar?

Para entrar hay que tener una cuenta. El sistema le muestra a cada persona
**solo lo que le corresponde** a su tipo de trabajo:

| Tipo de usuario | Cómo entra | Puede hacer |
|---|---|---|
| **Paciente** | Con su **DPI y contraseña** | Ver su propio expediente, sus signos vitales y sus citas |
| **Doctor** | Con su correo | Ver pacientes, abrir su expediente, registrar consultas, recetas, solicitar exámenes y ver su agenda |
| **Enfermería** | Con su correo | Consultar expedientes, la bandeja de laboratorio, la agenda y registrar/ver signos vitales |
| **Laboratorio** | Con su correo | Ver la bandeja de exámenes y registrar resultados (o adjuntar el archivo del resultado) |
| **Admisión** | Con su correo | Registrar/actualizar pacientes, agendar y reagendar citas, y ver el panel con gráficas |
| **Administrador** | Con su correo | Hacer todo lo anterior y además crear cuentas de usuario |

Esta separación se llama **control de acceso por roles**: el sistema decide qué
puede ver cada persona según su trabajo, por seguridad.

---

## 4. Cómo usarlo paso a paso

### 4.1 Entrar (personal del hospital)

1. Abre la dirección de la página.
2. En la pestaña **Personal**, escribe tu correo y tu contraseña.
3. Presiona **Ingresar**.

En la pantalla de entrada hay botones de "cuentas de demostración" que rellenan
los datos solos para que puedas probarlo sin crear cuentas.

### 4.2 Entrar como paciente (con el DPI)

1. En la pantalla de entrada, elige la pestaña **Paciente**.
2. Escribe tu **número de DPI** y tu contraseña y presiona **Ingresar**.
3. **Primera vez:** usa la opción **Crear acceso**, elige tu contraseña y
   presiona **Crear mi acceso**. A partir de ahí ya podrás ingresar con tu DPI.

> El paciente **no** crea su cuenta solo: es **Admisión** quien lo da de alta en
> el hospital con sus datos. Si escribes un DPI que no está registrado, el
> sistema te avisa: *"Por favor solicítelo en admisión."*

### 4.3 Registrar un paciente nuevo (lo hace Admisión o Administrador)

1. Entra como **Admisión** o **Administrador**.
2. Ve al menú **Pacientes** → **+ Registrar paciente**.
3. Escribe el nombre, el correo y los datos personales (DPI, teléfono, fecha de
   nacimiento, tipo de sangre, dirección, etc.).
4. Presiona **Registrar paciente**. Se crea su ficha y su expediente.
5. El paciente pondrá su propia contraseña cuando entre con su DPI (paso 4.2).

### 4.4 Actualizar los datos de un paciente

1. Entra como **Admisión** o **Administrador**.
2. Ve al menú **Pacientes**.
3. En la fila del paciente, haz clic en **Editar**.
4. Cambia el DPI, la fecha de nacimiento, el teléfono, la dirección o el tipo
   de sangre.
5. Presiona **Guardar**.

### 4.5 Editar antecedentes y alergias

1. Entra como **Doctor** o **Enfermería**.
2. Abre el expediente del paciente (menú **Pacientes** → **Ver**).
3. Haz clic en **Editar antecedentes y alergias**.
4. Escribe el texto y guarda.

### 4.6 Registrar una consulta y recetas (lo hace el Doctor)

1. Entra como **Doctor**.
2. Abre el expediente del paciente.
3. Presiona **+ Nueva consulta**.
4. Llena el motivo, el diagnóstico y las notas.
5. Agrega uno o más medicamentos (medicamento, dosis e indicaciones).
6. Guarda. La consulta y sus recetas quedan en el historial.

### 4.7 Solicitar un examen de laboratorio

1. **El Doctor** abre el expediente del paciente y solicita el examen.
2. **Laboratorio** (o Enfermería) ve la orden en el menú **Laboratorio**.
3. Ahí escribe el resultado o adjunta el archivo (PDF o foto) y la orden queda
   como **completada**.

### 4.8 Registrar signos vitales (lo hace Enfermería)

1. Entra como **Enfermería**.
2. Puedes hacerlo de dos maneras:
   - Menú **Signos vitales** → **+ Registrar signos** (eliges al paciente), o
   - Abre el expediente de un paciente y usa la tarjeta **Signos vitales**.
3. Llena al menos un dato: temperatura, presión (sistólica/diastólica),
   frecuencia cardíaca, frecuencia respiratoria, saturación de oxígeno, peso o
   talla. También puedes agregar una nota.
4. Guarda. El registro aparece con la fecha y **quién lo capturó**, y el
   paciente puede ver sus propios signos en su expediente.

### 4.9 Agendar una cita (lo hace Admisión, Administrador o el Doctor)

1. Entra como **Admisión**, **Administrador** o **Doctor**.
2. Ve al menú **Citas** y presiona **+ Agendar cita**.
3. Admisión y Administrador escriben el **DPI del paciente** (y pueden buscarlo);
   el Doctor agenda en su propia agenda.
4. Elige el **médico**, la **fecha** y el **motivo**.
5. El sistema muestra los **horarios disponibles** de ese médico (cupos de 30
   minutos según su horario de atención). Si un horario ya tiene una cita,
   aparece **tachado y no se puede elegir**, con el aviso *"Elige otra hora u
   otra fecha."*
6. Guarda. La cita queda como **programada**.

> **Doctor:** en **Mi agenda** puedes definir tu **horario de atención** (días y
> horas) para habilitar tus cupos.

### 4.10 Buscar citas por fecha (lo hace Admisión)

1. Entra como **Admisión** (o Administrador) y ve al menú **Citas**.
2. Usa el campo **Buscar por fecha** y elige un día.
3. La tabla muestra solo las citas de ese día. Presiona **Limpiar** para ver
   todas de nuevo.

### 4.11 Cambiar el estado de una cita

1. Entra como **Doctor**, **Enfermería**, **Admisión** o **Administrador**.
2. Ve al menú **Citas**.
3. En la cita, cambia el estado a **atendida** o **cancelada**.

---

## 5. ¿Dónde se guarda la información?

La información vive en una base de datos **PostgreSQL** en internet (el
servicio se llama Neon). No está guardada en la computadora de nadie, así que
no se pierde si se apaga un equipo.

Cada tipo de dato tiene su propia tabla:

| Tabla | Qué guarda |
|---|---|
| Usuarios | Quiénes tienen cuenta y con qué rol |
| Pacientes | Los datos personales (DPI, registro médico, género, teléfono, dirección, tipo de sangre) y si su acceso está activo |
| Médicos | El número de colegiado y la especialidad de cada doctor |
| Expedientes | Los antecedentes y las alergias de cada paciente |
| Consultas | Cada visita al doctor: motivo, diagnóstico y notas |
| Recetas | Las medicinas recetadas en cada consulta |
| Órdenes de laboratorio | Los exámenes solicitados, su estado, su resultado y el archivo adjunto |
| Disponibilidad médica | Los días y horas en que cada doctor atiende (para generar los cupos de citas) |
| Citas | La agenda de citas con su fecha y estado |
| Signos vitales | Temperatura, presión, frecuencias, saturación, peso y talla de cada toma |
| Auditoría | Un registro automático de quién hizo qué y cuándo |

**Cuando registras algo, se guarda en ese mismo instante** en la base de datos:
no hay que presionar nada más ni esperar a que se "guarde".

---

## 6. ¿Cómo está hecho por dentro?

Se compone de tres partes que trabajan juntas:

1. **La página web** (el rostro del sistema): es la que ves en el navegador.
   Está hecha con React y se aloja gratis en Vercel.
2. **El servidor** (el cerebro): recibe los pedidos de la página, valida quién
   es el usuario y responde con la información. Está hecho con Node.js y corre
   en un servicio llamado Render.
3. **La base de datos** (la memoria): guarda todo de forma permanente. Está en
   Neon.

Cuando haces clic en "pacientes", la página le pide la lista al servidor, el
servidor consulta la base de datos y te la devuelve. Todo esto ocurre en menos
de un segundo.

Para proteger las contraseñas, el sistema no guarda la contraseña tal cual:
guarda su **cifrado** (una transformación ilegible). Y para saber quién eres
después de iniciar sesión, te entrega un **boleto de acceso firmado** (técnico:
un token JWT) que acompaña todas las peticiones; ese boleto expira a las 8 horas
y hay que volver a entrar.

---

## 7. ¿Quién registró cada dato?

El sistema lleva una **bitácora automática** (la tabla de auditoría). Cada vez
que alguien inicia sesión, activa su acceso, registra un paciente, registra
signos vitales, consulta un expediente o agenda una cita, se anota: quién, qué
hizo y a qué hora. Esto ayuda a dar seguimiento y es una buena práctica para
hospitales.

---

## 8. Datos de prueba para probar

| Tipo de usuario | Correo | Contraseña |
|---|---|---|
| Administrador | admin@hospitalroosevelt.gt | Admin123! |
| Admisión | admision@hospitalroosevelt.gt | Admision123! |
| Enfermería | enfermeria@hospitalroosevelt.gt | Enfermeria123! |
| Laboratorio | laboratorio@hospitalroosevelt.gt | Laboratorio123! |
| Doctor | medico@hospitalroosevelt.gt | Medico123! |
| Paciente | DPI 1234567890101 | Paciente123! |

> Además de estas cuentas, el sistema viene con decenas de **pacientes de
> demostración** (con expedientes, citas y signos vitales) para que las listas y
> las gráficas se vean con datos reales. En la pantalla de acceso hay botones de
> **cuentas de demostración** que rellenan los datos solos.

---

## 9. Ventajas del sistema

- **No se pierde la información**: está en la nube, no en papeles ni en una sola computadora.
- **Cada persona ve solo lo suyo**: un paciente nunca puede ver el expediente de otro.
- **Los pacientes entran solos con su DPI**, pero su cuenta la habilita el hospital (admisión), por seguridad.
- **Agenda ordenada**: cada médico define su horario y el sistema no permite dos citas en el mismo cupo.
- **Todo queda registrado**: quién vio qué, quién agregó qué y cuándo.
- **Fácil de usar**: no necesita capacitación larga; las pantallas son claras.
- **Escalable**: se puede ampliar (más hospitales, más funciones) sin empezar de cero.
