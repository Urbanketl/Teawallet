# UrbanKetl - Smart Tea Subscription & RFID System

## Overview
UrbanKetl is a comprehensive B2B corporate tea dispensing system that combines RFID card technology with a modern web application for business unit management. Each user account represents a business unit administrator who manages multiple tea machines, issues generic RFID cards to employees, and monitors all dispensing activity charged to their corporate wallet.

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
- **Authorization**: Role-based access control (business unit admin/super admin roles)
- **Security**: CSRF protection, secure cookies, and session validation

### B2B Corporate Model
- **Business Unit Admins**: Each user manages multiple machines and RFID cards
- **Generic RFID Cards**: Shared cards issued to business units, not individual employees
- **Machine Ownership**: Each tea machine belongs to a specific business unit admin
- **Corporate Billing**: All usage charged to business unit admin's wallet regardless of which employee uses the card

### RFID Integration
- **Card Management**: Business unit admins issue generic RFID cards for employee use
- **Validation System**: Machine-facing API endpoints for card validation
- **Transaction Processing**: Automatic wallet deduction from business unit admin on card usage
- **History Tracking**: Complete audit trail of RFID transactions with business unit context

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
- July 24, 2025: COMPLETED - Fixed dropdown selection issues by replacing Radix UI Select with native HTML select elements and correcting user filtering logic
- July 24, 2025: Added test business unit administrators to demonstrate machine assignment functionality
- July 24, 2025: COMPLETED - Fixed machine creation API error by implementing missing POST endpoint and correcting apiRequest parameter order
- July 24, 2025: Added complete backend API endpoints for machine administration: create, edit, assign, and status control
- July 24, 2025: Implemented storage methods for machine updates and business unit assignments
- July 24, 2025: Restructured machine management with clear separation of permissions between platform admins and business unit admins
- July 24, 2025: Removed machine creation/control from business unit dashboard - now view-only for their assigned machines  
- July 24, 2025: Added comprehensive Machine Management tab to platform admin with 4 sub-tabs: Create, Edit, Assign, Control
- July 24, 2025: Implemented machine assignment system allowing platform admins to assign machines to specific business unit administrators
- July 24, 2025: Added machine editing capabilities for platform admins to update names, locations, and active status
- July 24, 2025: Enhanced both admin and corporate dashboards with consistent machine status monitoring using isActive + lastPing logic
- July 24, 2025: Applied 3-tier status system across all interfaces: Online (active + recent ping), Offline (active + old ping), Disabled (inactive)
- July 24, 2025: Added status summary badges showing real-time counts of Online/Offline/Disabled machines for quick monitoring overview
- July 24, 2025: COMPLETED - Implemented dynamic tea pricing control system with machine-specific pricing configuration for single "Regular Tea" variety
- July 24, 2025: Simplified tea offerings from multiple varieties (Earl Grey, Green Tea, etc.) to single "Regular Tea" as requested by user
- July 24, 2025: Added admin interface under "Machines" tab for real-time tea pricing control with validation and admin-only access
- July 24, 2025: Fixed admin machine list to show ALL machines (active and inactive) instead of only active ones for comprehensive pricing management
- July 24, 2025: Updated getAllTeaMachines() to return all machines regardless of status - platform admins need full visibility
- July 24, 2025: COMPLETED - Fixed support ticket creation button that was blocked by accessibility focus conflicts in Radix Dialog component
- July 24, 2025: Replaced problematic Radix Dialog with custom modal to resolve aria-hidden focus management issues
- July 24, 2025: COMPLETED - Fixed category and priority dropdown selection issues by replacing Radix Select with native HTML select elements
- July 24, 2025: Enhanced authentication logging and confirmed real user (44064328) can successfully create support tickets
- July 8, 2025: COMPLETED - Fixed FAQ cache invalidation issue preventing new FAQs from appearing immediately on Support page
- July 8, 2025: Enhanced React Query cache management to properly invalidate all FAQ-related queries when FAQs are created, updated, or deleted in admin panel
- July 8, 2025: COMPLETED - Fixed corporate routes authentication to show proper business management data
- July 8, 2025: Updated all corporate API routes (/api/corporate/*) to use consistent authentication pattern
- July 8, 2025: Added comprehensive dummy data: 87 dispensing logs, 6 RFID cards, 2 active machines, support tickets, transactions
- July 8, 2025: Fixed SQL syntax error in user behavior analytics and ensured all analytics show realistic patterns
- July 8, 2025: COMPLETED - Analytics permissions and access control implemented per business unit requirements
- July 8, 2025: Analytics page accessible to all admins but shows filtered data - regular admins see only their business unit data, super admins see all data
- July 8, 2025: Admin Dashboard restricted to super admins only (platform-wide management)
- July 8, 2025: Updated navigation to reflect proper permissions - Analytics for all admins, Platform Admin for super admins only
- July 8, 2025: Enhanced all analytics API routes to filter data by business unit admin ID for data isolation
- July 8, 2025: MAJOR ARCHITECTURAL CHANGE - Updated database schema to support B2B corporate business model where each user is a business unit administrator managing multiple machines and employee RFID cards
- July 8, 2025: Schema changes include: business unit info in users table, linking machines to admins, employee details in RFID cards, and proper corporate dispensing workflow
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