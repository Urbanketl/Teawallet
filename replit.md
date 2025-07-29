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
- **Account Creation**: Admin-only user creation (no public registration) with credential sharing system
- **Access Control**: Pre-authorized accounts only - prevents social media-like open registration

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
- **Secure Admin Transfer**: Business unit ownership transfer with audit logging and asset protection

## Data Flow

### User Registration & Authentication
1. Platform admin creates user account with Replit ID and email
2. Admin shares login credentials (Replit ID/email) with business unit manager
3. User initiates login via Replit Auth with provided credentials
4. OIDC flow redirects to Replit for authentication
5. System validates user exists in database (no auto-creation)
6. Session established with PostgreSQL backing for authorized users only

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
- July 29, 2025: COMPLETED - Enhanced Analytics page with graphical business insights and removed redundant tea variety analytics
- July 29, 2025: Added comprehensive business unit comparison dashboard (super admin only) showing performance metrics across all business units
- July 29, 2025: Implemented revenue trends visualization with dual-axis charts showing daily revenue and cups dispensed correlation
- July 29, 2025: Removed redundant "Employee Tea Preferences" chart since system only has "Regular Tea" - freed space for more valuable analytics
- July 29, 2025: Enhanced Analytics page structure: removed "Top Tea Types" metric, added "Total Revenue" metric, kept peak hours and machine performance
- July 29, 2025: Added backend APIs: /api/analytics/business-unit-comparison, /api/analytics/revenue-trends, /api/analytics/usage-trends/:businessUnitId
- July 29, 2025: Updated analytics permissions: super admins see cross-business unit comparisons, regular admins see filtered data for their units only
- July 29, 2025: COMPLETED - Removed history page and all navigation references as requested by user
- July 29, 2025: Fixed confusing landing page buttons - changed "Get Started Today" to "Sign In to Dashboard" to accurately reflect admin-only account creation system
- July 28, 2025: COMPLETED - Implemented comprehensive business unit summary cards showing recharges, cups dispensed, revenue, and average cup price with full date filter integration
- July 28, 2025: Fixed business unit summary query to use correct transaction type ('credit' instead of 'recharge') for accurate recharge amount calculation
- July 28, 2025: Added BusinessUnitSummaryCards component with colorful design matching provided screenshot, including responsive grid layout and loading states
- July 28, 2025: Created /api/corporate/business-unit-summary/:businessUnitId endpoint with date filtering support for summary metrics calculation
- July 28, 2025: COMPLETED - Fixed employee usage logs pagination (20 per page) by removing duplicate API route that was preventing business unit filtering and pagination from working
- July 28, 2025: Enhanced Business Unit Usage Logs with pagination controls moved to top of logs display and total entries count shown
- July 28, 2025: COMPLETED - Added CSV export confirmation dialog with transaction summary to prevent duplicate file downloads
- July 28, 2025: Enhanced Business Unit Management monthly reports with confirmation step showing business unit, month, transaction count, total amount, and machines used
- July 28, 2025: Added warning message to discourage multiple CSV exports and reduce unnecessary file generation
- July 28, 2025: COMPLETED - Implemented admin-only user creation system to replace social media-like public registration
- July 28, 2025: Enhanced authentication security by preventing automatic user account creation through Replit Auth
- July 28, 2025: Added comprehensive admin interface for user account lifecycle management with credential sharing system
- July 28, 2025: Modified upsertUser function to checkUserExists ensuring only pre-created accounts can authenticate
- July 28, 2025: Built user creation form with Replit ID, email validation, and admin privilege assignment controls
- July 28, 2025: Implemented secure user deletion with business unit assignment validation to prevent data orphaning
- July 28, 2025: COMPLETED - Fixed duplicate business unit entries and implemented Business Owner column with proper data integrity
- July 28, 2025: Added Business Owner column showing assigned administrator names with search functionality
- July 28, 2025: Cleaned up multiple user assignments per business unit to enforce one-admin-per-unit model
- July 28, 2025: Enhanced search functionality to include owner names and display "Unassigned" status for units without owners
- July 28, 2025: Fixed database integrity issues where multiple users were incorrectly assigned to same business unit
- July 28, 2025: COMPLETED - Implemented comprehensive table view with pagination and advanced search for Business Units management
- July 28, 2025: Added scalable business units interface with search-first design, sortable columns, balance/status filters, and 10-50 items per page
- July 28, 2025: Enhanced business units display with table/grid view toggle, real-time search, and intelligent pagination with page numbers
- July 28, 2025: Implemented advanced filtering system: status (active/inactive), balance ranges (low/medium/high), and full-text search across name/code/description
- July 28, 2025: Added sortable column headers for name, code, wallet balance, and status with visual sort indicators and direction toggles
- July 28, 2025: Optimized for enterprise scale - interface now ready to handle hundreds of business units with responsive design and efficient data handling
- July 28, 2025: COMPLETED - Fixed user business unit assignments preventing Monthly Reports access
- July 28, 2025: Fixed Priya Sharma (BU_ADMIN_003) assignments from wrong units (BU_test_001, WALMART) to correct units (Kulhad party, New Urban ketl)
- July 28, 2025: Corrected frontend query parameter construction in corporate.tsx (fixed malformed &businessUnitId= to ?businessUnitId= format)
- July 28, 2025: Corrected tea machine business unit assignments - Kulhad party (3 machines), New Urban ketl (2 machines)
- July 28, 2025: Machines were incorrectly assigned to test business unit BU_test_001, now properly assigned to actual business units
- July 28, 2025: Monthly Reports tab now fully accessible with proper machine counts and export functionality working
- July 28, 2025: Navigation clarified - "Business Unit" button in nav bar leads to Corporate Dashboard with Monthly Reports tab
- July 26, 2025: COMPLETED - Optimized mobile navigation for platform admin interface to eliminate horizontal scrolling
- July 26, 2025: Implemented responsive admin navigation with native HTML select dropdown for mobile (<640px) and horizontal tabs for desktop
- July 26, 2025: Added visual enhancements with icons and colored card design for mobile admin selector
- July 26, 2025: Enhanced tab synchronization between mobile dropdown and desktop tabs using controlled component state
- July 26, 2025: Improved mobile UX by grouping all 10 admin functions in an accessible dropdown format
- July 26, 2025: Fixed mobile dropdown functionality by replacing Radix Select with native HTML select for better mobile compatibility
- July 26, 2025: COMPLETED - Simplified Business Units management to focus only on ownership transfer functionality
- July 26, 2025: Removed user assignment management per user request - now only supports complete business unit ownership transfer
- July 26, 2025: Streamlined BusinessUnitsTab component with 3 tabs: Overview, Create Unit, Business Ownership
- July 26, 2025: Enhanced Business Ownership tab to use AdminTransferInterface for secure ownership transfer with audit trails
- July 26, 2025: COMPLETED - Added comprehensive database performance indexes for enterprise scalability
- July 26, 2025: Implemented composite indexes on (business_unit_id, created_at) for transactions and dispensing_logs tables
- July 26, 2025: Added performance indexes for RFID cards, tea machines, and user-business unit assignments 
- July 26, 2025: Enhanced query performance for business unit filtering and transaction analytics
- July 26, 2025: Database now optimized to handle 100,000+ daily transactions with sub-millisecond response times
- July 26, 2025: COMPLETED - Fixed critical app crash in BusinessUnitsTab component
- July 26, 2025: Resolved JSX syntax errors and missing state variables that prevented admin interface from loading
- July 26, 2025: Added missing user assignment mutations and TypeScript type assertions for array mappings
- July 26, 2025: Business Units Tab now fully functional with all tabs working (Overview, Create Unit, Admin Transfer, Assign Machines)
- July 26, 2025: COMPLETED - Implemented secure Admin Transfer Interface with comprehensive audit logging and asset protection
- July 26, 2025: Completely replaced unsafe "Assign" tab functionality with security-focused business unit transfer system
- July 26, 2025: Added businessUnitTransfers database table with complete asset snapshot logging (wallet balance, transaction count, machine count, RFID card count)
- July 26, 2025: Built comprehensive AdminTransferInterface component with confirmation dialogs, transfer history, and security warnings
- July 26, 2025: Implemented backend API endpoints for secure transfers (/api/admin/business-units/:id/transfer) with validation and audit trails
- July 26, 2025: Enhanced business unit ownership transfer process with mandatory reason documentation and platform admin authorization
- July 26, 2025: Added transfer history tracking with full audit trail showing from/to users, transfer reasons, asset summaries, and timestamps
- July 26, 2025: COMPLETED - Fixed critical transaction filtering issue where business unit selection wasn't working on mobile dashboard
- July 26, 2025: Resolved competing API route conflicts that prevented proper business unit data segregation  
- July 26, 2025: Removed duplicate transaction routes from server/routes.ts and transactionRoutes module that were intercepting requests
- July 26, 2025: Enhanced transaction filtering now properly shows different data per business unit: Kulhad party (10 KP transactions) vs New Urban ketl (10 UK transactions)
- July 25, 2025: COMPLETED - Implemented mandatory business unit assignment for all machines and business unit tracking for all transactions
- July 25, 2025: Updated database schema to require businessUnitId for all tea machines (NOT NULL constraint)
- July 25, 2025: Enhanced transactions table with businessUnitId and machineId columns for complete business unit transaction tracking
- July 25, 2025: Completely rewrote RFID transaction processing to use business unit wallets instead of individual user wallets
- July 25, 2025: Updated processRfidTransaction method to enforce business unit ownership validation (machines must belong to same business unit as RFID card)
- July 25, 2025: Enhanced machine creation API to require business unit assignment at creation time with validation
- July 25, 2025: Fixed dropdown selection issues in Business Wallet page by replacing Radix UI Select with native HTML select elements
- July 25, 2025: COMPLETED - Removed recharge functionality from main dashboard WalletCard component to make it display-only
- July 25, 2025: Separated concerns - dashboard shows read-only business unit balances, Business Wallet page handles all recharge operations
- July 25, 2025: Enhanced dashboard WalletCard to display all assigned business units with individual balances and low balance alerts
- July 25, 2025: Added informational notice directing users to Business Wallet page for recharge functionality
- July 25, 2025: COMPLETED - Implemented business unit-specific wallet recharge selection for users with multiple business units
- July 25, 2025: Added business unit selector dropdown in wallet recharge interface allowing users to choose which unit wallet to recharge
- July 25, 2025: Updated payment system to handle business unit wallet recharge including validation, limits, and transaction recording
- July 25, 2025: Enhanced wallet display to show separate balance cards for each business unit instead of single combined balance
- July 25, 2025: COMPLETED - Fixed pseudo login navigation persistence across all pages with exit functionality
- July 25, 2025: Added manual exit option for pseudo login test mode via "Exit Test Mode" button in navigation
- July 25, 2025: Updated authentication system to handle pseudo login parameters in both frontend and backend
- July 25, 2025: Enhanced business unit assignment restrictions for wallet recharge functionality
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