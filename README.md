# Pokemon SysBot Backend

Backend API para Pokemon SysBot Automation SaaS.

## Stack Tecnológico

- Node.js + Express
- TypeScript
- Supabase (Auth & Database)
- JWT para autenticación

## Instalación

```bash
npm install
```

## Configuración

1. Copia `.env.example` a `.env`:
   ```bash
   cp .env.example .env
   ```

2. Llena las variables de entorno:
   - `SUPABASE_URL`: Tu URL de Supabase
   - `SUPABASE_ANON_KEY`: Anon key de Supabase
   - `JWT_SECRET`: Secret para firmar tokens
   - `ALLOWED_ORIGINS`: Origins permitidos para CORS (default: http://localhost:3000)

## Desarrollo

```bash
npm run dev
```

El servidor correrá en `http://localhost:4000`

## Endpoints Disponibles

### Health Check
```
GET /health
```

### Validación de Pokémon
```
POST /api/validate
Content-Type: application/json

{
  "species": "Pikachu",
  "level": 50,
  "stats": {
    "hp": { "iv": 31, "ev": 252 },
    "attack": { "iv": 31, "ev": 0 },
    "defense": { "iv": 31, "ev": 4 },
    "sp_attack": { "iv": 31, "ev": 252 },
    "sp_defense": { "iv": 31, "ev": 0 },
    "speed": { "iv": 31, "ev": 0 }
  },
  "moves": ["Thunder", "Quick Attack", "Iron Tail", "Thunderbolt"],
  "ability": "Static",
  "nature": "Timid",
  "isShiny": false
}
```

Respuesta:
```json
{
  "valid": true,
  "errors": []
}
```

## Tests

```bash
npm test
```

## Build

```bash
npm run build
npm start
```
