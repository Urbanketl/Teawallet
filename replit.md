# UrbanKetl - Smart Tea Subscription & RFID System

## Overview
UrbanKetl is a comprehensive digital tea dispensing system that combines RFID card technology with a modern web application for seamless tea purchasing. The system enables users to manage digital wallets, use RFID cards for contactless tea dispensing, and provides administrative tools for business management.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **UI Library**: Radix UI components with Tailwind CSS
- **State Management**: TanStack Query for server state management
- **Routing**: Wouter for client-side routing
- **Build Tool**: Vite for development and production builds
- **Mobile**: React Native with Expo for mobile companion app

### Backend Architecture
- **Runtime**: Node.js with Express.js server
- **Language**: TypeScript
- **Authentication**: Replit Auth with OpenID Connect
- **Session Management**: Express sessions with PostgreSQL storage
- **API Design**: RESTful APIs with structured error handling

### Data Storage Solutions
- **Primary Database**: PostgreSQL (Neon serverless)
- **ORM**: Drizzle ORM with TypeScript-first schema
- **Session Store**: PostgreSQL-backed session storage
- **File Storage**: Static assets served via Express

## Key Components

### Authentication System
- **Provider**: Replit Auth with OpenID Connect integration
- **Session Management**: Server-side sessions with PostgreSQL persistence
- **Authorization**: Role-based access control (admin/user roles)
- **Security**: CSRF protection, secure cookies, and session validation

### RFID Integration
- **Card Management**: User-assignable RFID cards with unique identifiers
- **Validation System**: Machine-facing API endpoints for card validation
- **Transaction Processing**: Automatic wallet deduction on card usage
- **History Tracking**: Complete audit trail of RFID transactions

### Payment Processing
- **Provider**: Razorpay integration for Indian market
- **Wallet System**: Digital wallet with recharge capabilities
- **Transaction Types**: Recharge, deduction, and refund operations
- **Security**: Payment verification and webhook handling

### Administrative Dashboard
- **User Management**: Complete user lifecycle management
- **Analytics**: Revenue tracking, usage patterns, and machine performance
- **Support System**: Ticket management and FAQ system
- **Machine Monitoring**: Real-time machine status and maintenance alerts

## Data Flow

### User Registration & Authentication
1. User initiates login via Replit Auth
2. OIDC flow redirects to Replit for authentication
3. User data synchronized with local database
4. Session established with PostgreSQL backing

### RFID Transaction Flow
1. User taps RFID card on tea machine
2. Machine sends validation request to API
3. System validates card and checks wallet balance
4. Transaction processed and logged
5. Tea dispensed if successful

### Wallet Recharge Flow
1. User initiates recharge request
2. Razorpay order created with payment details
3. User completes payment via Razorpay gateway
4. Payment verification and wallet update
5. Transaction recorded in system

## External Dependencies

### Payment Services
- **Razorpay**: Primary payment gateway for Indian market
- **Integration**: Order creation, payment verification, webhook handling

### Authentication
- **Replit Auth**: OpenID Connect provider
- **Configuration**: OIDC discovery and token validation

### Database
- **Neon PostgreSQL**: Serverless PostgreSQL database
- **Connection**: WebSocket-based connection pooling

### Development Tools
- **Replit Platform**: Development environment and deployment
- **Vite**: Frontend build tooling and development server

## Deployment Strategy

### Environment Configuration
- **Development**: Local development with hot reload
- **Production**: Autoscale deployment on Replit platform
- **Environment Variables**: Database URLs, payment keys, session secrets

### Build Process
1. Frontend built with Vite to static assets
2. Backend compiled with esbuild for production
3. Static assets served from Express server
4. Database schema applied via Drizzle migrations

### Monitoring & Logging
- **Request Logging**: Structured logging for API requests
- **Error Handling**: Centralized error handling with proper status codes
- **Performance**: Query optimization and connection pooling

## Changelog
- June 25, 2025. Initial setup

## User Preferences
Preferred communication style: Simple, everyday language.