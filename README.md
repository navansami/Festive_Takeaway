# Festive Takeaway - Backend API

Backend API for the Festive Takeaway Order Management System built with Node.js, Express, TypeScript, and MongoDB.

## Features

- User authentication with JWT and @fairmont.com domain restriction
- Role-based access control (Operations, Order-taker, Admin)
- Complete order management with lifecycle tracking
- Payment tracking with partial payment support
- Order status management with history and notes
- Enquiry management with conversion to orders
- Menu items management
- Analytics and reporting
- Excel export functionality
- Change logging system

## Prerequisites

- Node.js (v18 or higher)
- MongoDB Atlas account (free tier)
- npm or yarn

## Installation

1. Install dependencies:
```bash
npm install
```

2. Create a `.env` file in the root directory based on `.env.example`:
```bash
cp .env.example .env
```

3. Update the `.env` file with your MongoDB Atlas connection string and other configuration:
```
PORT=5000
MONGODB_URI=your_mongodb_atlas_connection_string
JWT_SECRET=your_super_secret_jwt_key
JWT_EXPIRES_IN=7d
NODE_ENV=development
ALLOWED_EMAIL_DOMAIN=fairmont.com
```

4. Seed the database with menu items and default admin user:
```bash
npm run seed
```

This will create:
- All menu items from the Turkey Take-Away form
- A default admin user: `admin@fairmont.com` / `admin123456`

**⚠️ IMPORTANT:** Change the default admin password immediately after first login!

## Running the Application

### Development mode (with hot reload):
```bash
npm run dev
```

### Production mode:
```bash
npm run build
npm start
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user (requires @fairmont.com email)
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user (requires authentication)

### Users (Admin only)
- `GET /api/users` - Get all users
- `GET /api/users/:id` - Get user by ID
- `PATCH /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user
- `PATCH /api/users/change-password` - Change own password

### Orders
- `GET /api/orders` - Get all orders
- `GET /api/orders/:id` - Get order by ID
- `POST /api/orders` - Create new order (Order-taker/Admin)
- `PATCH /api/orders/:id` - Update order (Order-taker/Admin)
- `PATCH /api/orders/:id/status` - Update order status
- `POST /api/orders/:id/payments` - Add payment (Order-taker/Admin)
- `PATCH /api/orders/:id/items/:itemId` - Update order item status
- `DELETE /api/orders/:id` - Soft delete order (Admin only)
- `GET /api/orders/:id/change-logs` - Get order change logs

### Enquiries
- `GET /api/enquiries` - Get all enquiries
- `GET /api/enquiries/:id` - Get enquiry by ID
- `POST /api/enquiries` - Create new enquiry
- `PATCH /api/enquiries/:id` - Update enquiry (Order-taker/Admin)
- `POST /api/enquiries/:id/convert` - Convert enquiry to order (Order-taker/Admin)
- `DELETE /api/enquiries/:id` - Delete enquiry (Admin only)

### Menu Items
- `GET /api/menu-items` - Get all menu items
- `GET /api/menu-items/:id` - Get menu item by ID
- `POST /api/menu-items` - Create menu item (Admin only)
- `PATCH /api/menu-items/:id` - Update menu item (Admin only)
- `DELETE /api/menu-items/:id` - Delete menu item (Admin only)

### Analytics
- `GET /api/analytics/daily?date=YYYY-MM-DD` - Get daily analytics
- `GET /api/analytics/range?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD` - Get date range analytics
- `GET /api/analytics/export?date=YYYY-MM-DD` - Export orders to Excel

## User Roles

### Operations
- View orders and enquiries
- Update order status
- Mark items as collected/not collected
- Create enquiries

### Order-taker
- All Operations permissions
- Create new orders
- Edit orders
- Add payments
- Convert enquiries to orders

### Admin
- All Order-taker permissions
- Manage users
- Delete orders (soft delete)
- View deleted orders
- View all change logs

## Deployment to Railway

1. Create a new project on Railway
2. Connect your GitHub repository
3. Add environment variables in Railway dashboard
4. Deploy!

Railway will automatically:
- Install dependencies
- Build the TypeScript code
- Start the server

## Project Structure

```
back/
├── src/
│   ├── config/          # Database configuration
│   ├── controllers/     # Request handlers
│   ├── middleware/      # Auth and other middleware
│   ├── models/          # MongoDB schemas
│   ├── routes/          # API routes
│   ├── types/           # TypeScript types and enums
│   ├── utils/           # Utility functions and seeders
│   ├── app.ts           # Express app setup
│   └── server.ts        # Server entry point
├── .env.example         # Environment variables template
├── .gitignore
├── nodemon.json
├── package.json
├── tsconfig.json
└── README.md
```

## Support

For issues or questions, please contact the development team.
