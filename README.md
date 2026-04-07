
# DevShowcase Platform - Backend

## Tech Stack

- **Runtime:** Node.js
- **Framework:** Express.js
- **Database:** PostgreSQL
- **ORM:** Prisma (v5.22.0)
- **File Storage:** Cloudinary
- **Authentication:** JWT
- **Real-time:** Socket.io

## modules and features


Auth - Register, login, logout, JWT token, email verification, password reset, refresh token

Users - Profile management, avatar upload/delete, role switching, public profiles, user projects

Projects - CRUD operations, technology tags, industry tags, visibility controls, thumbnail upload, gallery upload, asset management

Timeline - Stages (idea/planning/development/testing/deployment), milestones, time logging, milestone media upload

Collaboration - Invite collaborators, join requests, role management, remove collaborators

Admin - List users, suspend users, change user roles, list projects, feature projects, delete projects, platform analytics

Search & Discovery - Search by technology/industry/problem, filter options, trending projects, personalized recommendations, categories, trending tags

Marketplace - Set pricing, browse listings, purchase projects/templates, purchase history, sales analytics

Notifications - Real-time WebSocket notifications, mark as read, delete notifications, notification preferences

Funding & Investment - Create funding requests, make investments, sponsor projects, backers list, investment portfolio, funding opportunities

Reputation & Endorsements - Endorse users for skills, reputation score, endorsement list, build verification, activity history

Analytics Dashboard - View analytics, demo interactions, engagement metrics, timeline insights, CSV/PDF export

Learning Mode - Convert projects to tutorials, build replay, fork projects, list forked projects



AI Features - Collaborator recommendations, investor suggestions, project recommendations, improvement suggestions, generate summary, generate pitch draft, generate description, skill match

Licensing & Ownership - License templates (MIT/GPL/Apache/Commercial), apply license, ownership verification, blockchain proof, download license




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


