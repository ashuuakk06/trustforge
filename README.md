# TrustForge

**TrustForge** is a hackathon judging platform that I developed as part of my third-year BTech project.

The idea came from the different tasks involved in organising a hackathon. Participants need a place to submit their projects, organisers need to manage judges and assignments, and judges need a proper way to evaluate each submission. Managing all of this separately can become difficult, especially when there are multiple projects and judges involved.

So, I built TrustForge to bring these activities together in one place.

With this platform, participants can submit their projects, organisers can assign judges, and judges can evaluate projects using a shared scoring rubric. Organisers can also check the judging records and activity history before publishing the final results.

I have also added features like project verification, community voting, certificate lookup, and score management to make the platform more useful.

## What can you do with TrustForge?

- **Different user roles:** Users can log in as organizers, judges, participants, or admins. Each role has access to its own features.
- **Judge assignment:** Organizers can assign judges to projects. The system also checks for possible conflicts of interest and helps balance the workload.
- **Project evaluation:** Judges can review projects and give scores using a common rubric.
- **Score calculation:** Scores are calculated using different rubric weights. The platform also supports per-judge score normalization and review flags.
- **Project verification:** Each project gets a SHA-256 fingerprint that can be used to check whether its contents have changed.
- **Activity tracking:** Important actions are recorded in an audit history, which uses hash chaining to help detect changes to recorded entries.
- **Project gallery:** Users can browse submitted projects and vote for their favourites. Each account gets one vote.
- **Results:** Organizers can publish the final results as snapshots.
- **Certificate verification:** Users can check certificates using their certificate ID.
- **Submission updates:** Participants can follow their submission status as it changes.
- **Responsive design:** The frontend works across different screen sizes and includes animations and charts.

## Technologies I used

Here are the technologies used to build the project:

| Part | Technologies |
|---|---|
| Programming languages | Java 21, TypeScript, JavaScript |
| Backend | Spring Boot, Spring Security, Spring Data JPA |
| Authentication | JWT |
| Database | PostgreSQL |
| Database migrations | Flyway |
| Frontend | React, Vite, CSS |
| Animations | Framer Motion |
| Charts | Recharts |
| Build tools | Maven, npm |
| Containerization | Docker, Docker Compose |

## Getting Started

There are two ways to run TrustForge locally. If you just want to try the application, Docker Compose is the easiest option.

### Requirements

Before running the project, make sure you have:

- Docker Desktop installed and running.
- Git installed (if cloning the repository).
- IntelliJ IDEA or another code editor (useful if you want to explore the code).

### Run using Docker Compose

First, open the project folder in your terminal.

Run this command:

```powershell
docker compose up --build
```

The first build may take a little time because Docker needs to download the required images and build the application.

Once the containers are running, open the following links:

| Service | URL |
|---|---|
| Frontend | http://localhost:5174 |
| Backend API | http://localhost:8081/api/v1 |
| Backend Health Check | http://localhost:8081/actuator/health |

Docker Compose starts all three main services:

- PostgreSQL for storing application data.
- Spring Boot for handling backend operations.
- React for displaying the application interface.

Flyway runs the database migrations before the sample data is loaded.

**Resetting the demo database**

If you want to start again with a fresh demo database, stop the containers and remove the project's Docker volumes:

```powershell
docker compose down -v
```

After that, run the Docker Compose command again.

Keep in mind that this removes the stored database data, so don't use it if you want to keep your existing demo records.

The default database password and JWT secret are only meant for local development and testing. They should be changed before exposing the application to a network.

## Demo Accounts

I have included sample accounts for testing the different user roles.

All accounts use the same password:

```text
trustforge
```

| Role | Email |
|---|---|
| Organizer | `organizer@trustforge.local` |
| Judge | `judge1@trustforge.local` |
| Participant | `participant1@trustforge.local` |
| Admin | `admin@trustforge.local` |

You can use these accounts to explore the application without creating new users.

## A quick look at the application

If you are opening TrustForge for the first time, here is the order I recommend following:

1. Start by logging in with the organizer account and exploring the dashboard.
2. Go to the **Judging** section and check how judges are assigned to projects.
3. Log out and sign in using the judge account.
4. Open a project and submit an evaluation using the scoring rubric.
5. Return to the organizer account and check the **Normalization** and **Integrity** sections.
6. Open the **Audit Explorer** to see the recorded activity history.
7. Publish the results and visit the public project gallery.
8. Try the certificate lookup using this sample ID: `TF-2026-001`.
9. Finally, log in as a participant and submit a project to see how its status gets updated.

This walkthrough covers the main parts of the application.

## Running the Backend and Frontend Separately

If you prefer running the services individually instead of starting everything through Docker Compose, follow these steps.

### Step 1: Start PostgreSQL

From the main project folder, run:

```powershell
docker compose up -d postgres
```

### Step 2: Run the backend

Open a terminal inside the `backend` folder.

Set the database environment variables:

```powershell
$env:DB_HOST='localhost'; $env:DB_PORT='5433'; $env:DB_NAME='trustforge'
$env:DB_USER='trustforge'; $env:DB_PASSWORD='trustforge-local'
```

Now start the Spring Boot application:

```powershell
mvn spring-boot:run
```

The backend runs on port `8080`.

### Step 3: Run the frontend

Open another terminal inside the `frontend` folder.

Install the dependencies:

```powershell
npm ci
```

Start the development server:

```powershell
npm run dev
```

The frontend will be available at:

http://localhost:5173

Vite forwards API requests to the Spring Boot backend running on port `8080`.

## Running Tests and Checking the Build

I have included backend tests and a frontend build check.

To run the backend tests, open a terminal inside the `backend` folder:

```powershell
mvn test
```

To check the frontend and create its production build, run these commands inside the `frontend` folder:

```powershell
npm ci
npm run build
```

The frontend build also checks TypeScript during the build process.

## How the Data Is Stored

TrustForge uses PostgreSQL as its main database.

It stores information related to:

- User accounts and roles.
- Hackathon events and projects.
- Project submissions.
- Submission processing events.
- Judge assignments and evaluations.
- Published results.
- Audit history.

I used Flyway to manage database changes. Its migration files are available here:

```text
backend/src/main/resources/db/migration
```

The dashboard reads its data from PostgreSQL.

For submission updates, the frontend periodically checks the backend for new events. It only requests events after the last sequence number it received, rather than fetching the entire history every time.

## Project Documentation

I have kept some additional documents in the repository for anyone who wants to understand the implementation in more detail.

- [Architecture](ARCHITECTURE.md) – How the different parts of the application are organised.
- [API Routes](API.md) – Available backend API endpoints.
- [Data Model](DATA-MODEL.md) – Database structure and relationships.
- [Judging Calculations](JUDGING.md) – How project scores are calculated.
- [Deployment Notes](DEPLOYMENT.md) – Additional information about running and deploying the application.

## Final Note

TrustForge is a project I built to get practical experience with Java full-stack development. While working on it, I explored backend development with Spring Boot, frontend development with React, database management with PostgreSQL, authentication using JWT, and running applications with Docker.

There is still room to improve the project, especially in testing and adding more functionality. However, building it helped me understand how different technologies work together in a real application.

**Thanks for checking out TrustForge!**
