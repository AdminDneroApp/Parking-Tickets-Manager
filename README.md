# DNERO Parking Tickets Manager

Registro de tickets de parqueo de colaboradores DNERO ($1.50 por hora o fracción, IVA incluido).

- `/` — formulario público: correo @dneroapp.com, ID de ticket, fecha, entrada/salida,
  horas (calculadas, editables) y foto del ticket.
- `/dashboard` — totales por mes, por día y por colaborador. Solo cuentas en `DASHBOARD_ADMINS`.

Los datos se guardan en un Google Sheet y las fotos en una carpeta de una Unidad Compartida.

## Puesta en marcha

1. Configura Google (Sheet, Shared Drive, OAuth client): ver [docs/INFRASTRUCTURE.md](docs/INFRASTRUCTURE.md).
2. `cp .env.example .env.local` y completa los valores.
3. `npm install && npm run dev` → http://localhost:3000

## Deploy

Vercel → https://parking.dneroapp.com. Importa el repo y define las variables de entorno (ver `.env.example`).
