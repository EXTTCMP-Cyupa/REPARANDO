# REPARANDO

Plataforma de servicios para el hogar con arquitectura hexagonal, backend reactivo y frontend React.

## Stack
- Backend: Java 17, Spring Boot 3, WebFlux, R2DBC PostgreSQL, Spring Security JWT.
- Frontend: React 18, Vite, Tailwind CSS, Lucide Icons.
- Base de datos: PostgreSQL dockerizado.

## Prerrequisitos
- Docker Desktop
- Java 17+
- Maven 3.9+
- Node.js 20+ (incluye npm)

## 1) Ejecutar PostgreSQL local
```bash
docker compose up -d postgres
```

## 2) Ejecutar backend local
```bash
cd backend
mvn spring-boot:run
```

Backend por defecto en: http://localhost:8080

## 3) Ejecutar frontend local
```bash
cd frontend
npm install
npm run dev
```

Frontend por defecto en: http://localhost:5173

## Credenciales demo de login
- admin@reparando.app / 123456
- worker@reparando.app / 123456
- client@reparando.app / 123456

## Endpoints iniciales implementados
- POST /api/v1/auth/login
- GET /api/v1/marketplace/professionals
- POST /api/v1/bidding/needs
- POST /api/v1/bidding/bids
- GET /api/v1/bidding/needs/{needId}/bids
- POST /api/v1/bidding/needs/{needId}/select
- POST /api/v1/finance/lead/charge
- POST /api/v1/finance/deposit
- POST /api/v1/finance/deposit/{depositId}/approve
- POST /api/v1/finance/deposit/{depositId}/reject
- GET /api/v1/finance/deposit/pending
- GET /api/v1/finance/workers/{workerId}/account
- GET /api/v1/finance/workers/{workerId}/ledger
- POST /api/v1/finance/ledger/adjustments
- POST /api/v1/finance/ledger/{entryId}/refund
- POST /api/v1/finance/deposit/upload
- POST /api/v1/workflow/{workOrderId}/status
- GET /api/v1/admin/settings/business-policy
- PUT /api/v1/admin/settings/business-policy

## Nota de estado actual
- La base hexagonal y reglas financieras criticas ya estan activas.
- Marketplace y Licitacion persisten en PostgreSQL via R2DBC.
- El workflow de estados esta implementado con validacion de transiciones.
- Estados operativos soportados: DIAGNOSTICO, COTIZADO, EN_PROCESO, PAUSADO, EN_DISPUTA, FINALIZADO, CANCELADO.
- Los endpoints criticos validan identidad del token (ownership) para evitar suplantacion por IDs en body.
- Licitacion valida ofertas duplicadas por trabajador y vencimiento de necesidades (7 dias).

## Nota de entorno en Windows
- En esta maquina Java y Node estaban instalados pero fuera de PATH.
- Se actualizo PATH de usuario para nuevas terminales con Java y Node.
- Maven no se detecto instalado; instalar con:
```powershell
winget install Apache.Maven
```
