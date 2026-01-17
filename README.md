# WoW Upload – Upload Service

Webanwendung zum **Hochladen, Verwalten und Herunterladen von Dateien**  
mit **GitHub OAuth Login**, **Upload-Queue**, **Progressbars** und **Duplicate-Erkennung (SHA-256)**.

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
│   ├── db/
│   └── uploads/
├── docker-compose.yml
├── .env.example
└── README.md
```

---

## GitHub OAuth Setup

### GitHub OAuth App anlegen

GitHub → Settings → Developer settings → OAuth Apps  
New OAuth App

**Application name**
WoW Upload

**Homepage URL**
http://<SERVER-IP-ODER-DOMAIN>

**Authorization callback URL**
http://<SERVER-IP-ODER-DOMAIN>:3000/auth/github/callback

Client ID und Client Secret kopieren.

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

### Environment Datei anlegen
```bash
cp .env.example .env
```

### .env ausfüllen
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

---

### Container starten
```bash
docker compose up --build -d
```

---

## Erreichbarkeit

Frontend: http://localhost:4200  
Backend: http://localhost:3000  

---

## Daten & Uploads

Uploads:
./data/uploads/

Datenbank:
./data/db/dev.db

---

## Upload-Workflow (Duplicate-Erkennung)

1. Datei im Browser auswählen  
2. SHA-256 Hash clientseitig berechnen  
3. Backend prüft Hash  
4. Upload wird gespeichert inkl. Metadaten  

---

##  Nutzer-Verhalten

### Nicht eingeloggt
- Upload möglich
- Keine Upload-Liste
- Kein Download

### Eingeloggt
- Upload-Liste sichtbar
- Downloads erlaubt

---

## Healthcheck
GET /health
