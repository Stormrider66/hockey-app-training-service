# Training Service - Hockey App

Tjänst för träningshantering i Hockey App-systemet. Hanterar övningar, tester, testresultat och träningsprogram.

## Funktionalitet

- **Övningshantering**: Skapa, uppdatera, hämta och ta bort övningsdefinitioner
- **Testhantering**: Definiera och hantera olika typer av tester (styrka, hastighet, uthållighet, etc.)
- **Testresultat**: Registrera, spåra och analysera testresultat för spelare
- **Träningsprogram**: Skapa och tilldela träningsprogram till spelare eller lag

## Teknisk översikt

- **Node.js**: JavaScript runtime
- **Express**: Webbramverk
- **PostgreSQL**: Databas
- **JWT**: Autentisering

## Installation och körning

### Förutsättningar

- Node.js (v14+)
- PostgreSQL (v12+)
- npm eller yarn

### Installation

1. Klona repositoryt
2. Installera beroenden: `npm install`
3. Skapa en `.env`-fil baserat på `.env.example`
4. Skapa databas och kör migrations: `npm run db:migrate`
5. Kör tjänsten: `npm start`

### Med Docker

```bash
docker build -t hockey-app-training-service .
docker run -p 3004:3004 --env-file .env hockey-app-training-service
```

## API-dokumentation

### Övningar

- `GET /api/exercises` - Hämta alla övningar
- `GET /api/exercises/:id` - Hämta en specifik övning
- `POST /api/exercises` - Skapa en ny övning (Admin/Team Admin)
- `PUT /api/exercises/:id` - Uppdatera en övning (Admin/Team Admin)
- `DELETE /api/exercises/:id` - Ta bort en övning (Admin)

### Tester

- `GET /api/tests` - Hämta alla tester
- `GET /api/tests/:id` - Hämta ett specifikt test
- `POST /api/tests` - Skapa ett nytt test (Admin/Team Admin)
- `PUT /api/tests/:id` - Uppdatera ett test (Admin/Team Admin)
- `DELETE /api/tests/:id` - Ta bort ett test (Admin)

### Testresultat

- `GET /api/test-results` - Hämta testresultat (filtrerbara)
- `GET /api/test-results/:id` - Hämta ett specifikt testresultat
- `POST /api/test-results` - Skapa ett nytt testresultat
- `PUT /api/test-results/:id` - Uppdatera ett testresultat
- `DELETE /api/test-results/:id` - Ta bort ett testresultat
- `GET /api/test-results/user/:userId/test/:testId` - Hämta testhistorik för en användare
- `GET /api/test-results/team/:teamId/test/:testId` - Hämta teststatistik för ett lag

### Träningsprogram

- `GET /api/programs` - Hämta alla träningsprogram
- `GET /api/programs/:id` - Hämta ett specifikt träningsprogram
- `POST /api/programs` - Skapa ett nytt träningsprogram (Team Staff)
- `PUT /api/programs/:id` - Uppdatera ett träningsprogram (Team Staff)
- `DELETE /api/programs/:id` - Ta bort ett träningsprogram (Admin/Team Admin)
- `GET /api/programs/team/:teamId` - Hämta program för ett lag

## Behörighetsroller

- **Admin**: Fullständig åtkomst till alla funktioner
- **Team Admin**: Hantera övningar, tester och träningsprogram för sitt lag
- **Coach**: Hantera testresultat och träningsprogram för sitt lag
- **Player**: Se egna resultat och tilldela träningsprogram

## Integration med andra tjänster

- **User Service**: Verifierar användarbehörigheter och lagmedlemskap
- **Calendar Service**: Synkroniserar träningspass med kalender