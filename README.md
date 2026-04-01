
# DevShowcase Platform - Backend

## Tech Stack

- **Runtime:** Node.js
- **Framework:** Express.js
- **Database:** PostgreSQL
- **ORM:** Prisma (v5.22.0)
- **File Storage:** Cloudinary
- **Authentication:** JWT

## Features Implemented

- User authentication (register, login, JWT)
- Profile management with avatar upload
- Project CRUD with thumbnail and gallery upload
- Project assets upload (code, docs, videos)
- Build timeline with stages, milestones, and time tracking
- Milestone media upload
- Collaboration system (invites, join requests, role management)
- Admin dashboard with user/project management
- Platform analytics


## postgresql database
Go to .env.example and replace
postgre password with ur actual postgre db password

||DB_PASSWORD = postgre password||

## For prisma
Go to .env.example and replace 
your_password_here with ur actual postgre db password

DATABASE_URL="postgresql://postgres:your_password_here@localhost:5432/devshowcase"


## Troubleshooting
Database connection issues
-Ensure PostgreSQL is running: |psql -U postgres|
-Check credentials in .env

Prisma errors
-|Run npx prisma generate| after schema changes
-|Run npx prisma db push| to sync database

Cloudinary uploads fail
-Verify Cloudinary credentials in .env
-Check that Cloudinary account is active


