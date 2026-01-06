# WoW Upload – Upload Service

![Node](https://img.shields.io/badge/node-%3E%3D18-green)
![Angular](https://img.shields.io/badge/angular-standalone-red)
![Auth](https://img.shields.io/badge/auth-GitHub%20OAuth-black)

Webanwendung zum **Hochladen, Verwalten und Herunterladen von Dateien**  
mit **GitHub OAuth Login**, **Upload-Queue** und **Progressbars**.

---

## Features

- Upload von Dateien:
  - `.pkt`
  - `.zip`
  - `.7z`
  - `.rar`
  - `.tar.gz`
- **Upload Queue** mit Fortschrittsanzeige
- **Anonymer Upload erlaubt**
- **GitHub Login (OAuth)**
- Uploads werden (falls eingeloggt) **Usern zugeordnet**
- **Nur eingeloggte User**:
  - sehen Uploads
  - können Dateien herunterladen
- Dateien werden **lokal auf dem Server gespeichert**

---

## Tech-Stack

### Frontend
- Angular (Standalone Components)
- Signals
- HttpClient
- Standardmäßig erreichbar unter  

http://localhost:4200


### Backend
- NestJS
- Prisma + SQLite
- Passport GitHub OAuth
- JWT Authentication
- Standardmäßig erreichbar unter  

http://localhost:3000


---

## Projektstruktur

```text
sniff-repo/
├── apps/
│   ├── backend/
│   │   ├── prisma/
│   │   │   ├── schema.prisma
│   │   │   └── migrations/
│   │   ├── src/
│   │   │   ├── auth/
│   │   │   ├── uploads/
│   │   │   └── main.ts
│   │   ├── uploads/          # gespeicherte Dateien (lokal)
│   │   └── dev.db            
│   └── frontend/
│       ├── src/
│       │   ├── app/
│       │   └── main.ts
│       └── angular.json
└── README.md

```

## Authentifizierung (GitHub OAuth)
### GitHub OAuth App anlegen

- GitHub → Settings → Developer settings → OAuth Apps
- New OAuth App
- Einstellungen:


Application name:
```text
WoW Upload

```

Homepage URL:
```text
http://<SERVER-IP-ODER-DOMAIN>

```

Authorization callback URL:
```text
http://<SERVER-IP-ODER-DOMAIN>:3000/auth/github/callback

```

- Client ID und Client Secret kopieren

## Backend Setup (Server)
### Voraussetzungen

- Node.js ≥ 18
- npm
- Git

## Repository klonen
```text
git clone https://github.com/FSchroeder88/wow-upload.git
cd wow-upload/apps/backend
```
### Environment Variablen

In apps/backend/.env:
```text
GITHUB_CLIENT_ID=xxx
GITHUB_CLIENT_SECRET=xxx

JWT_SECRET=super-secret-key
JWT_EXPIRES_IN=7d

FRONTEND_URL=http://<SERVER-IP-ODER-DOMAIN>:4200
```

Hinweis: .env ist nicht im Git und muss manuell erstellt werden.

### Abhängigkeiten installieren
```text
npm install
```
### Datenbank initialisieren
```text
npx prisma migrate deploy

```
Erstellt automatisch die Datei dev.db

### Backend starten
```text
npm run start
```

Backend läuft unter:
```text
http://localhost:3000
```

Healthcheck:
```text
GET /health
```
## Frontend Setup
```text
cd ../frontend
npm install
npm run start
```

### Frontend läuft unter:
```text
http://localhost:4200
```
## Ablauf für User
### Nicht eingeloggt
- Upload möglich
- Keine Upload-Liste sichtbar
- Kein Download möglich

### GitHub Login
- Uploads sichtbar
- Downloads erlaubt
- Uploads werden dem User zugeordnet

