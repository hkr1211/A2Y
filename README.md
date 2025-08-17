# Trade Inquiry Order System

A B/S architecture system designed for trade inquiry and order management between Arroz (Japan) and Yunjie (China) companies.

## Project Structure

```
├── frontend/          # Vue.js 3 + TypeScript frontend
├── backend/           # Node.js + Express.js + TypeScript backend
└── README.md
```

## Features

- User management with role-based access control
- Inquiry management system
- Quotation reply functionality
- Order creation and tracking
- Real-time chat communication
- File attachment management
- Multi-language support (Chinese/Japanese)
- Real-time notifications

## Tech Stack

### Frontend
- Vue.js 3
- TypeScript
- Element Plus UI
- Pinia (State Management)
- Vue Router
- Vue I18n
- Socket.IO Client

### Backend
- Node.js
- Express.js
- TypeScript
- PostgreSQL
- Redis
- Socket.IO
- JWT Authentication
- Multer (File Upload)

## Getting Started

### Prerequisites
- Node.js 18+
- PostgreSQL 13+
- Redis 6+

### Installation

1. Clone the repository
2. Install backend dependencies:
   ```bash
   cd backend
   npm install
   ```

3. Install frontend dependencies:
   ```bash
   cd frontend
   npm install
   ```

4. Set up environment variables:
   ```bash
   cd backend
   cp .env.example .env
   # Edit .env with your configuration
   ```

5. Start the development servers:
   ```bash
   # Backend (in backend directory)
   npm run dev

   # Frontend (in frontend directory)
   npm run dev
   ```

## Development

### Backend Development
- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm run test` - Run tests
- `npm run lint` - Run ESLint
- `npm run format` - Format code with Prettier

### Frontend Development
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint
- `npm run format` - Format code with Prettier

## API Documentation

The API follows RESTful conventions and returns JSON responses in the following format:

```json
{
  "success": true,
  "data": {},
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

Error responses:
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Error message",
    "details": {}
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## License

This project is proprietary software developed for Arroz and Yunjie companies.