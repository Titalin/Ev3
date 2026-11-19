# Integración de Microservicios con OAuth2 — Ev3

Sistema académico con microservicios Spring Boot protegidos por **OAuth2**:
un **Authorization Server** real (Spring Authorization Server), un **API
Gateway** que también actúa como Resource Server, dos microservicios de
dominio (MS-A: divisiones, MS-B: programas educativos) como Resource Servers,
y un frontend **Angular** que usa **Authorization Code + PKCE**.

```
┌────────────┐   Authorization Code + PKCE    ┌──────────────────┐
│  Angular   │ ─────────────────────────────▶ │  auth-server     │
│  :4200     │ ◀───────────────────────────── │  :9000 (OIDC)    │
└─────┬──────┘                                └──────────────────┘
      │ Bearer JWT (access token)
      ▼
┌────────────┐      lb://            ┌──────────┐      Feign + JWT      ┌──────────┐
│  rate      │ ───────────────────▶ │   MS-A   │ ◀───────────────────▶ │   MS-B   │
│ Gateway    │   /api/entity-a/**   │ :8081    │   (usa-division)      │ :8082    │
│ :8080      │                      │ H2 mem   │                       │ H2 mem   │
└────────────┘                      └──────────┘                       └──────────┘
                                          │
                                    ┌─────▼─────┐
                                    │  Eureka   │
                                    │  :8761    │
                                    └───────────┘
```

## Requisitos

- **JDK 21** (obligatorio; `start-all.ps1` lo verifica y aborta si no es 21)
- **Node.js >= 20.19** y npm (para el frontend)
- Maven no es necesario en el PATH: cada módulo incluye su wrapper `mvnw`
- Eureka Server en `Eurekeando/eureka`

## Puertos

| Servicio        | Puerto | Descripción                                        |
|-----------------|--------|----------------------------------------------------|
| Eureka          | 8761   | Service discovery                                  |
| auth-server     | 9000   | Spring Authorization Server (OIDC)                 |
| MS-A            | 8081   | Divisiones (Resource Server)                       |
| MS-B            | 8082   | Programas educativos (Resource Server)             |
| rate            | 8080   | Gateway + Resource Server (único punto de entrada) |
| frontend        | 4200   | Angular SPA                                        |

## Arranque rápido

```powershell
.\build-all.ps1     # compila los 5 módulos Maven + npm build del frontend
.\start-all.ps1     # levanta todo en ventanas separadas (verifica JDK 21)
```

`start-all.ps1` abre una ventana de PowerShell por servicio en este orden:
**Eureka → auth-server → MS-A → MS-B → rate → frontend**.

También puedes levantar cada servicio a mano con `mvnw spring-boot:run`
dentro de su carpeta (en Windows: `.\mvnw.cmd spring-boot:run`).

### Variables de entorno (.env)

Copia `.env.example` a `.env` para personalizar. Los valores por defecto ya
son los de desarrollo, así que el sistema funciona sin crear `.env`.

| Variable             | Default                  | Uso                                              |
|----------------------|--------------------------|--------------------------------------------------|
| `AUTH_PORT`          | 9000                     | Puerto del auth-server                           |
| `AUTH_ISSUER`        | http://localhost:9000    | Issuer OIDC (debe coincidir con `AUTH_SERVER_URL`)|
| `AUTH_SERVER_URL`    | http://localhost:9000    | issuer-uri que validan MS-A, MS-B y rate         |
| `FRONTEND_ORIGIN`    | http://localhost:4200    | Origen CORS/redirect URIs de los clientes        |
| `ADMIN_USER`         | admin                    | Usuario admin en memoria del auth-server         |
| `ADMIN_PASSWORD`     | admin123                 | Contraseña del admin (cambiar en producción)     |
| `POSTMAN_CLIENT_SECRET` | postman-secret        | Secreto de `postman-client`                      |
| `EUREKA_URL`         | http://localhost:8761/eureka/ | Eureka                              |
| `RATE_PORT`/`MSA_PORT`/`MSB_PORT` | 8080/8081/8082 | Puertos de los servicios            |
| `SHOW_SQL`           | false                    | SQL de Hibernate en consola (MS-A/MS-B)          |

## Datos

MS-A y MS-B usan **H2 en memoria** (`jdbc:h2:mem`, `ddl-auto=create-drop`).
Al arrancar se siembran datos automáticamente (`DataInitializer`):

- **5 divisiones** (ids 1–5)
- **6 programas educativos** con relaciones N:M a divisiones

Los datos se pierden al reiniciar — es intencional para la demo.

## Seguridad OAuth2

### Flujo del frontend (Authorization Code + PKCE)

1. Angular llama `initCodeFlow()` de `angular-oauth2-oidc` → redirige a
   `http://localhost:9000/oauth2/authorize` con `code_challenge` (S256).
2. El auth-server muestra su formulario de login (`admin` / `admin123`).
3. Vuelve a `http://localhost:4200/` con `?code=...` → la librería lo
   canjea en `/oauth2/token` con `code_verifier`.
4. Las llamadas a `http://localhost:8080/api/**` llevan
   `Authorization: Bearer <access_token>` (interceptor de Angular).
5. El Gateway valida el JWT contra el issuer y enruta a MS-A/MS-B, que lo
   vuelven a validar y aplican las reglas por scope/rol.
6. Feign propaga el mismo Bearer entre MS-A y MS-B.
7. Logout: `POST /connect/logout` del auth-server (RP-Initiated Logout).

### Clientes registrados

| client_id        | Tipo         | Grants                        | Scopes                                                    |
|------------------|--------------|-------------------------------|-----------------------------------------------------------|
| `frontend-client`| Público      | authorization_code (PKCE obligatorio) | openid, profile, entity-a.read/write, entity-b.read/write |
| `postman-client` | Confidencial | client_credentials (+ auth code)| **solo lectura**: entity-a.read, entity-b.read          |

`postman-client` tiene solo scopes de lectura a propósito: sirve para
demostrar un **403** al intentar escribir/borrar sin permisos.

### Reglas de autorización

| Endpoint                          | Requisito              |
|-----------------------------------|------------------------|
| `GET /api/entity-a/**` (incluye `/by-ids`) | scope `entity-a.read` |
| `POST /api/entity-a`              | scope `entity-a.write` |
| `PUT /api/entity-a/**`            | scope `entity-a.write` |
| `DELETE /api/entity-a/**`         | rol `ADMIN`            |
| `GET /api/entity-b/**`            | scope `entity-b.read`  |
| `POST /api/entity-b`              | scope `entity-b.write` |
| `PUT /api/entity-b/**`            | scope `entity-b.write` |
| `DELETE /api/entity-b/**`         | rol `ADMIN`            |

- Sin token → **401**
- Token válido sin el scope/rol → **403**
- Token válido con permiso → **200/201/204**

El access token incluye el claim `roles` (vía `OAuth2TokenCustomizer`) y
los scopes; los Resource Servers convierten scopes a `SCOPE_*` y roles a
`ROLE_*`.

## Probar con curl / Postman

### 1) Token de solo lectura (postman-client)

```bash
curl -X POST http://localhost:9000/oauth2/token \
  -u postman-client:postman-secret \
  -d "grant_type=client_credentials&scope=entity-a.read entity-b.read"
# -> {"access_token":"...","scope":"entity-b.read entity-a.read",...}
```

En Postman: Authorization → OAuth 2.0 → Grant Type *Client Credentials*,
Token URL `http://localhost:9000/oauth2/token`, Client ID `postman-client`,
Client Secret `postman-secret`, Scope `entity-a.read entity-b.read`.

### 2) Pruebas de seguridad (a través del Gateway :8080)

```bash
TOKEN=<access_token>

# Sin token -> 401
curl -i http://localhost:8080/api/entity-a

# GET con token de lectura -> 200
curl -i -H "Authorization: Bearer $TOKEN" http://localhost:8080/api/entity-a
curl -i -H "Authorization: Bearer $TOKEN" http://localhost:8080/api/entity-b

# POST con token de solo lectura -> 403
curl -i -X POST -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" -d '{"nombreA":"Prueba"}' \
  http://localhost:8080/api/entity-a

# DELETE con token de solo lectura -> 403
curl -i -X DELETE -H "Authorization: Bearer $TOKEN" \
  http://localhost:8080/api/entity-a/1
```

### 3) Escritura (requiere token de usuario con scopes write + rol ADMIN)

El flujo completo de Authorization Code + PKCE desde navegador es el del
frontend. Para curl puro hay que simular login + PKCE (ver ejemplo en el
historial del proyecto); lo más sencillo es usar el frontend en
`http://localhost:4200` o una herramienta como Postman con PKCE.

Con un token de usuario válido:

```bash
# Crear división -> 201
curl -X POST -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" -d '{"nombreA":"Nueva división"}' \
  http://localhost:8080/api/entity-a

# Crear programa (dispara Feign MS-B -> MS-A por /by-ids) -> 201
curl -X POST -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"nombreB":"Nueva carrera","entityAIds":[1,2]}' \
  http://localhost:8080/api/entity-b
```

### 4) OIDC / descubrimiento

- Metadata: `http://localhost:9000/.well-known/openid-configuration`
- JWKS (firma RSA): `http://localhost:9000/oauth2/jwks`
- Login del auth-server: `http://localhost:9000/login`
- Logout: `http://localhost:9000/connect/logout?...`

## Frontend (Angular)

- Login con **Authorization Code + PKCE** (`angular-oauth2-oidc`),
  `frontend-client`, redirect `http://localhost:4200/`.
- Guard de rutas por access token válido; interceptor que añade
  `Authorization: Bearer` solo a llamadas del Gateway.
- 401 → limpia sesión y vuelve a login; 403 → mensaje en pantalla.
- URLs centralizadas en `src/environments/environment.ts`.
- CRUD completo de divisiones y programas educativos (ver, agregar,
  editar, eliminar) a través del Gateway.

## Estructura

```
Ev3/
├── Eurekeando/eureka/   # Eureka Server (:8761)
├── auth-server/         # Spring Authorization Server (:9000)
├── MS-A/                # Divisiones (:8081)
├── MS-B/                # Programas educativos (:8082)
├── rate/                # Gateway + Resource Server (:8080)
├── frontend/            # Angular 20 (:4200)
├── build-all.ps1
├── start-all.ps1
├── .env.example
└── README-INTEGRACION.md
```

## Notas

- La llave RSA del auth-server se genera en cada arranque (JWKSource en
  memoria): tras reiniciar auth-server hay que volver a iniciar sesión.
- Usuarios y clientes viven en memoria; no hay persistencia.
- Credenciales `admin`/`admin123` son **solo para desarrollo local**.
- `postman-client` existe para pruebas; en producción registrar clientes
  reales con secretos fuera del repo.
- Las llamadas directas a MS-A/MS-B (:8081/:8082) también exigen JWT
  válido; en producción conviene restringir el acceso por red para que
  todo pase por el Gateway.
- `npm audit` reporta vulnerabilidades en dependencias de desarrollo del
  frontend; revisar antes de producción.
