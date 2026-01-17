WoW Upload – Upload Service








Webanwendung zum Hochladen, Verwalten und Herunterladen von Dateien
mit GitHub OAuth Login, Upload-Queue, Progressbars und Duplicate-Erkennung (SHA-256).

Features

Upload unterstützter Dateitypen:

.pkt

.zip

.7z

.rar

.tar.gz

Upload Queue mit Fortschrittsanzeige

SHA-256 Hash-Prüfung (verhindert doppelte Uploads)

Anonymer Upload erlaubt

GitHub Login (OAuth)

Uploads werden (falls eingeloggt) GitHub-Usern zugeordnet

Nur eingeloggte User

sehen Uploads

können Dateien herunterladen

Dateien werden lokal auf dem Server gespeichert

Docker-basiertes Deployment (empfohlen)

Tech-Stack
Frontend

Angular (Standalone Components)

Signals

HttpClient

SHA-256 Hashing im Browser

Läuft standardmäßig unter
http://localhost:4200

Backend

NestJS

Prisma

SQLite (lokal / Docker Volume)

Passport GitHub OAuth

JWT Authentication

Läuft standardmäßig unter
http://localhost:3000

Projektstruktur
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

GitHub OAuth Setup
GitHub OAuth App anlegen

GitHub → Settings → Developer settings → OAuth Apps

New OAuth App

Einstellungen:

Application name

WoW Upload


Homepage URL

http://<SERVER-IP-ODER-DOMAIN>


Authorization callback URL

http://<SERVER-IP-ODER-DOMAIN>:3000/auth/github/callback


Danach Client ID und Client Secret kopieren.

Installation (Docker – empfohlen)
Voraussetzungen

Docker

Docker Compose

Git

Repository klonen
git clone https://github.com/FSchroeder88/wow-upload.git
cd wow-upload

Environment Datei anlegen
cp .env.example .env


.env ausfüllen:

# GitHub OAuth
GITHUB_CLIENT_ID=xxx
GITHUB_CLIENT_SECRET=yyy

# Auth
JWT_SECRET=super-secret-key
JWT_EXPIRES_IN=7d

# URLs
FRONTEND_URL=http://localhost:4200


.env ist nicht im Git und muss manuell erstellt werden.

Container starten
docker compose up --build -d


Danach erreichbar unter:

Frontend → http://localhost:4200

Backend → http://localhost:3000

Daten & Uploads

Uploads werden gespeichert unter:

./data/uploads/


Datenbank (SQLite):

./data/db/dev.db


Beides bleibt auch nach Container-Neustarts erhalten.

Upload-Workflow (Dedup)

Datei wird im Browser ausgewählt

SHA-256 Hash wird clientseitig berechnet

Backend prüft:

Hash existiert → Upload wird abgebrochen

Hash neu → Upload startet

Server berechnet Hash erneut und speichert:

Dateiname

Größe

Hash

Timestamp

optional GitHub-User

Nutzer-Verhalten
Nicht eingeloggt

Upload möglich

Keine Upload-Liste sichtbar

Kein Download möglich

Eingeloggt (GitHub)

Eigene Uploads sichtbar

Downloads erlaubt

Uploads werden dem GitHub-Account zugeordnet

Healthcheck
GET /health

Lokale Entwicklung (ohne Docker, optional)
<details> <summary>Click to expand</summary>
cd apps/backend
npm install
npx prisma migrate dev
npm run start

cd apps/frontend
npm install
npm run start

</details>
