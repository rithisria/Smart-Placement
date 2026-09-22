# Smart Placement Platform

A full-stack MERN Placement Management System designed to simplify the student placement process.

## Features

- Student registration and login
- Student profile management
- Skills management
- Resume upload and management
- Job opportunity browsing
- Rule-based skill matching
- Search and deadline filtering
- Job application submission
- Application tracking across placement stages

## Tech Stack

### Frontend
- React.js
- Vite
- CSS

### Backend
- Node.js
- Express.js

### Database
- MongoDB
- Mongoose

### Other Technologies
- bcrypt
- JWT
- Multer
- REST APIs

## How It Works

1. Students create an account and log in.
2. Students create their profile and add their skills.
3. Available job opportunities are displayed.
4. The platform compares student skills with job requirements.
5. A matching percentage is generated.
6. Students can apply for suitable roles.
7. Applications can be tracked through different placement stages.

## Project Structure

```text
Smart-Placement/
│
├── backend/
│   ├── models/
│   ├── routes/
│   ├── middleware/
│   └── server.js
│
├── frontend/
│   └── src/
│
└── .gitignore
