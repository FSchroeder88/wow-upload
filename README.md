# WoW Upload – Upload Service

Webanwendung zum **Hochladen, Verwalten und Herunterladen von Dateien**  
mit **GitHub OAuth Login**, **Upload-Queue**, **Progressbars** und **Duplicate-Erkennung (SHA-256)**.

> **Wichtig:**  
> Dieses Projekt benötigt Environment-Variablen.  
> Eine vollständige Vorlage findest du in der Datei **`.env.example`**.

---

## Features

- Upload unterstützter Dateitypen:
  - `.pkt`
  - `.zip`
  - `.7z`
  - `.rar`
  - `.tar.gz`
- **Upload-Queue** mit Fortschrittsanzeige
- **SHA-256 Hash-Prüfung** (verhindert doppelte Uploads)
- **Anonymer Upload erlaubt**
- **GitHub Login (OAuth)**
- Uploads werden (falls eingeloggt) **GitHub-Usern zugeordnet**
- **Nur eingeloggte User**
  - sehen Uploads
  - können Dateien herunterladen
- Dateien werden **lokal auf dem Server gespeichert**
- **Docker-basiertes Deployment (empfohlen)**

---

## Tech-Stack

### Frontend
- Angular (Standalone Components)
- Signals
- HttpClient
- SHA-256 Hashing im Browser  
- Standardmäßig erreichbar unter:  
    http://localhost:4200

### Backend
- NestJS
- Prisma
- SQLite (lokal / Docker Volume)
- Passport GitHub OAuth
- JWT Authentication  
- Standardmäßig erreichbar unter:  
    http://localhost:3000

---

## Projektstruktur

```text
wow-upload/
├── apps/
│   ├── backend/
│   │   ├── prisma/
│   │   │   ├── schema.prisma
│   │   │   └── migrations/
│   │   ├── src/
│   │   │   ├── auth/
│   │   │   ├── uploads/
│   │   │   └── main.ts
│   │   └── Dockerfile
│   └── frontend/
│       ├── src/
│       │   ├── app/
│       │   └── main.ts
│       └── Dockerfile
├── data/
│   ├── db/         # SQLite DB (Docker Volume / Bind)
│   └── uploads/    # Hochgeladene Dateien
├── docker-compose.yml
├── .env.example
└── README.md
```

---

## GitHub OAuth Setup

### GitHub OAuth App anlegen

1. GitHub → **Settings** → **Developer settings** → **OAuth Apps**
2. **New OAuth App**
3. Einstellungen:

**Application name**
```text
WoW Upload
```

**Homepage URL**
```text
http://<SERVER-IP-ODER-DOMAIN>
```

**Authorization callback URL**
```text
http://<SERVER-IP-ODER-DOMAIN>:3000/auth/github/callback
```

Danach **Client ID** und **Client Secret** kopieren. Erläuterung in der .env.example.

---

## Installation (Docker – empfohlen)

### Voraussetzungen
- Docker
- Docker Compose
- Git

### Repository klonen
```bash
git clone https://github.com/FSchroeder88/wow-upload.git
cd wow-upload
```

---

## Environment Variablen

Alle benötigten Environment-Variablen sind in der Datei **`.env.example`** dokumentiert.

### Environment-Datei anlegen
```bash
cp .env.example .env
```

### `.env` ausfüllen

Öffne anschließend die `.env` Datei und trage deine Werte ein.

```env
# GitHub OAuth
GITHUB_CLIENT_ID=xxx
GITHUB_CLIENT_SECRET=yyy

# Auth
JWT_SECRET=super-secret-key
JWT_EXPIRES_IN=7d

# URLs
FRONTEND_URL=http://localhost:4200
```

> Hinweis:
> - `.env.example` dient **nur als Vorlage**
> - `.env` ist **nicht im Git enthalten** und muss lokal erstellt werden

---

## Container starten

```bash
docker compose up --build -d
```

Danach erreichbar unter:

- Frontend → http://localhost:4200
- Backend → http://localhost:3000

---

## Daten & Uploads

**Uploads:**
```text
./data/uploads/
```

**Datenbank (SQLite):**
```text
./data/db/dev.db
```

Beides bleibt auch nach Container-Neustarts erhalten.

---

## Upload-Workflow (Dedup)

1. Datei wird im Browser ausgewählt
2. SHA-256 Hash wird **clientseitig** berechnet
3. Backend prüft:
   - Hash existiert → Upload wird abgebrochen
   - Hash neu → Upload startet
4. Server berechnet Hash erneut und speichert:
   - Dateiname
   - Größe
   - Hash
   - Timestamp
   - optional GitHub-User

---

## Nutzer-Verhalten

### Nicht eingeloggt
- Upload möglich
- Keine Upload-Liste sichtbar
- Kein Download möglich

### Eingeloggt (GitHub)
- Eigene Uploads sichtbar
- Downloads erlaubt
- Uploads werden dem GitHub-Account zugeordnet

---

## Healthcheck

```http
GET /health
```

---

## Lokale Entwicklung (ohne Docker, optional)

<details>
<summary>Click to expand</summary>

```bash
cd apps/backend
npm install
npx prisma migrate dev
npm run start

cd ../frontend
npm install
npm run start
```
</details>
