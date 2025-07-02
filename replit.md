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

## Recent Changes
- July 2, 2025: COMPLETED - Support ticket pagination system fully implemented and tested with 103 tickets across 6 pages (20 per page)
- July 2, 2025: Fixed React Query implementation to properly format pagination URLs with query parameters (paginated=true&page=X&limit=Y)
- July 2, 2025: Enhanced admin dashboard support tickets section with working pagination controls and proper ticket count display
- July 1, 2025: Enhanced mobile navigation with dedicated admin page access - admin users can now access admin dashboard directly from mobile navigation bar
- July 1, 2025: Improved mobile UI with vertical icon/label layout for better touch interaction on smaller screens
- July 1, 2025: Implemented complete pagination system for admin dashboard with 50 users per page and 20 support tickets per page
- July 1, 2025: Added user search functionality and support ticket filtering by status for improved scalability
- July 1, 2025: Created reusable Pagination component with proper navigation controls
- July 1, 2025: COMPLETED - Configurable maximum wallet balance system fully functional and tested
- July 1, 2025: Fixed Settings modal to properly connect to database instead of using hardcoded values
- July 1, 2025: Enhanced Save Changes functionality with proper database updates and cache invalidation
- July 1, 2025: Confirmed real-time payment validation using dynamic wallet limits from database
- July 1, 2025: System successfully tested with ₹3000 → ₹7000 → ₹9000 limit changes, all working perfectly
- July 1, 2025: Fixed UI duplication issue by restructuring router logic - eliminated Switch component conflicts causing double rendering
- July 1, 2025: Enhanced DOM mounting safeguards to prevent component duplication across browser refreshes
- July 1, 2025: Fixed critical payment system issues - resolved "Processing..." stuck state and Razorpay 429 rate limiting errors
- July 1, 2025: Implemented comprehensive popup blocker detection with automatic fallback to new tab payment method
- July 1, 2025: Added 2-second debouncing and request limiting to prevent rapid-fire payment attempts
- July 1, 2025: Enhanced error handling for payment flows with specific user guidance for common browser issues
- July 1, 2025: Replaced problematic Radix Dialog components with custom modals across wallet and admin interfaces
- June 27, 2025: Added comprehensive FAQ management system - admins can now create, edit, and delete FAQ questions and answers
- June 27, 2025: Enhanced admin interface with FAQ Management tab including category support and view tracking
- June 27, 2025: Fixed admin support tickets display - added missing API route and proper data handling
- June 27, 2025: Added admin RFID card deletion functionality with confirmation dialog
- June 27, 2025: Fixed RFID card number auto-generation in admin interface - now properly suggests card numbers
- June 27, 2025: Added admin RFID card creation with company/user naming convention (e.g., UKTP0001)
- June 27, 2025: Simplified tea flavors to only "Regular tea" - removed all multiple tea types from system
- June 27, 2025: Fixed support ticket creation functionality with proper database schema
- June 25, 2025: Added 4 additional RFID cards to Thirtha Prasad (total: 6 cards)
- June 25, 2025: Standardized all RFID card formats to RFID_USERID_XXX pattern
- June 25, 2025: Implemented working card deactivation and tabbed management interface
- June 25, 2025: Fixed payment processing and multi-card display functionality

## Changelog
- June 25, 2025. Initial setup

## User Preferences
Preferred communication style: Simple, everyday language.