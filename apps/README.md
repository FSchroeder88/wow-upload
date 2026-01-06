
WoW Upload Upload Service

Webanwendung zum hochladen, verwalten und herunterladen von Upload-Dateien
mit GitHub OAuth Login, Upload-Queue und Progressbars.

Features

Upload von Dateien: .pkt .zip .7z .rar .tar .gz

Upload Queue mit Fortschrittsanzeige

Anonymer Upload erlaubt

GitHub Login (OAuth)

Uploads werden (falls eingeloggt) Usern zugeordnet

Nur eingeloggte User:

sehen Uploads

können Dateien herunterladen

Backend speichert Dateien lokal auf dem Server

🧱 Tech-Stack
Frontend

Angular (Standalone Components)

Signals

Fetch / HttpClient

läuft standardmäßig auf http://localhost:4200

Backend

NestJS

Prisma + SQLite

Passport GitHub OAuth

JWT Auth

läuft standardmäßig auf http://localhost:3000

📁 Projektstruktur
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
│   │   └── dev.db            # SQLite DB
│   └── frontend/
│       ├── src/
│       │   ├── app/
│       │   └── main.ts
│       └── angular.json
└── README.md

🔐 Authentifizierung (GitHub OAuth)
GitHub App anlegen

GitHub → Settings → Developer settings → OAuth Apps

New OAuth App

Einstellungen:

Application name: WoW Upload

Homepage URL:

http://<SERVER-IP-ODER-DOMAIN>


Authorization callback URL:

http://<SERVER-IP-ODER-DOMAIN>:3000/auth/github/callback


Client ID und Client Secret kopieren

⚙️ Backend Setup (Server)
Voraussetzungen

Node.js ≥ 18

npm

Git

1️⃣ Repository klonen
git clone https://github.com/FSchroeder88/wow-upload.git
cd wow-upload/apps/backend

2️⃣ Environment Variablen

In apps/backend/.env:

GITHUB_CLIENT_ID=xxx
GITHUB_CLIENT_SECRET=xxx

JWT_SECRET=super-secret-key
JWT_EXPIRES_IN=7d

FRONTEND_URL=http://<SERVER-IP-ODER-DOMAIN>:4200


⚠️ .env ist nicht im Git, muss manuell erstellt werden.

3️⃣ Abhängigkeiten installieren
npm install

4️⃣ Datenbank initialisieren
npx prisma migrate deploy


Erstellt automatisch dev.db

5️⃣ Backend starten
npm run start


Backend läuft jetzt auf:

http://localhost:3000


Healthcheck:

GET /health

🖥️ Frontend Setup
cd ../frontend
npm install
npm run start


Frontend läuft auf:

http://localhost:4200

🔄 Ablauf für User

Nicht eingeloggt

Upload möglich

Keine Upload-Liste sichtbar

Kein Download möglich

GitHub Login

Uploads sichtbar

Downloads erlaubt

Uploads werden User zugeordnet

📦 Speicherort der Dateien

Uploads werden lokal auf dem Server gespeichert:

apps/backend/uploads/


Dateiname = UUID

Originalname in der Datenbank gespeichert