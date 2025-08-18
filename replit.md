# UrbanKetl - Smart Tea Subscription & RFID System

## Overview
UrbanKetl is a B2B corporate tea dispensing system integrating RFID technology with a web application. It enables business unit administrators to manage multiple tea machines, issue generic RFID cards to employees, and monitor dispensing activity charged to a corporate wallet. The project aims to provide a comprehensive solution for corporate tea services, streamlining management and billing.

## Recent Changes (August 18, 2025)
- **Major Admin Interface Refactoring Completed** - Successfully split 5,379-line monolithic admin.tsx into focused, reusable components and custom hooks for improved maintainability and development workflow
- **Completed Phase 3: Machine Auto-Sync System** - Implemented automated synchronization scheduling with cron-based background service running every 30 minutes during business hours (6 AM - 10 PM IST)
- **Completed Phase 4: Challenge-Response Authentication** - Full MIFARE DESFire EV1 cryptographic authentication system with AES challenge-response protocol and automatic key rotation
- **Updated RFID Card System to DESFire EV1 Only** - Removed basic RFID card option, standardized on MIFARE DESFire EV1 cards with AES encryption for all new card creation
- **New Modular Admin Architecture**: Created focused components (UserManagement, RFIDCardManager, BusinessUnitAdmin, SystemSettings) with dedicated custom hooks (useAdminUsers, useRFIDCards, useBusinessUnits)
- **Improved Developer Experience**: Replaced monolithic 5,379-line admin.tsx with maintainable, focused components following React best practices
- **Enhanced Code Reusability**: Extracted common admin operations into custom hooks with built-in pagination, filtering, sorting, and state management
- Added comprehensive auto-sync service with retry mechanisms, manual triggers, bulk operations, and detailed performance statistics
- Implemented secure challenge-response authentication for DESFire cards with 30-second challenge timeout and audit logging
- Created new API endpoints for machine authentication (challenge generation, response validation, dispensing authorization)
- Added admin controls for auto-sync management, key rotation, and authentication monitoring
- Enhanced security with encrypted AES key storage, automatic key versioning, and comprehensive audit trails
- Integrated both systems with existing Machine Sync Dashboard for unified management interface
- Enhanced RFID card creation UI with DESFire-specific fields (Hardware UID, AES key management)
- Previous Phase 2 completion: Machine Sync Dashboard with real-time monitoring and security key management

## User Preferences
Preferred communication style: Simple, everyday language.
UI/UX preferences: Clean, simplified interfaces without unnecessary elements like export buttons or column headers in data tables. Pagination controls should be positioned at the top of listings.

## System Architecture

### UI/UX Decisions
- **Frontend Framework**: React 18 with TypeScript, utilizing Radix UI components and Tailwind CSS for a modern and responsive design.
- **Mobile**: React Native with Expo for a companion mobile application.
- **Design Principles**: Brand-aligned login page redesign with a centered layout, professional branding, and optimized for viewport height. Consistent application of brand colors (Pantone Gold Fusion) to key interactive elements.
- **Navigation**: Streamlined navigation with simplified role-based access. Corporate page serves as main landing page with integrated welcome banner. Dashboard and wallet pages removed for cleaner user experience.
- **Landing Page Architecture**: Corporate page (/) is the primary entry point featuring color-coded business unit cards, personalized welcome banner, and comprehensive business unit management tools.

### Technical Implementations
- **Backend**: Node.js with Express.js, written in TypeScript, providing RESTful APIs.
- **Authentication**: Custom email/password authentication system replacing Replit Auth, featuring admin-controlled user creation and secure session management with PostgreSQL persistence. Role-based access control with two user types: Platform Admin (full system access) and Business Unit Admin (analytics access).
- **Session Management**: Server-side sessions persisted in PostgreSQL.
- **RFID Integration**: Centralized RFID card management system using MIFARE DESFire EV1 cards exclusively with AES encryption. Platform admins can batch create and assign cards to business units with automatic cryptographic key generation. Machine-facing API endpoints validate cards using challenge-response authentication and process transactions with automatic wallet deduction.
- **Payment Processing**: Razorpay integration for digital wallet recharges, supporting recharge, deduction, and refund operations. Includes payment verification and webhook handling.
- **Tea Pricing**: Simplified to a single "Regular Tea" variety with machine-specific pricing configurable by admins.
- **Reporting & Analytics**: Comprehensive administrative dashboards for user management, revenue tracking, usage patterns, and machine monitoring. Features include custom date range selection for reports, Excel/PDF export functionality, and graphical business insights for cross-business unit comparisons.
- **Admin Features**: Admin-only user creation, secure business unit ownership transfer with audit logging, support ticket management, and FAQ system.
- **Machine Management**: Platform admins can create, edit, assign, and control tea machines, enforcing mandatory business unit assignment for all machines and transactions.
- **Wallet System**: Business unit-specific digital wallets with recharge capabilities, designed to handle multiple business units per user.
- **Auto-Sync System (Phase 3)**: Automated RFID card synchronization across all tea machines with cron scheduling, retry mechanisms, manual triggers, and comprehensive monitoring.
- **Challenge-Response Authentication (Phase 4)**: MIFARE DESFire EV1 cryptographic authentication with AES encryption, automatic key rotation, and secure dispensing authorization.

### System Design Choices
- **Data Model**: B2B corporate model where each user is a business unit administrator. Generic RFID cards are linked to business units, not individual employees, with all usage charged to the corporate wallet.
- **Security**: CSRF protection, secure cookies, session validation, and strict control over account creation (no public registration).
- **Scalability**: PostgreSQL with Neon serverless for the primary database, Drizzle ORM for schema management. Database performance indexes implemented for high transaction volumes (100,000+ daily transactions).
- **Error Handling**: Centralized error handling with structured logging.

## External Dependencies

- **Payment Services**:
    - **Razorpay**: Primary payment gateway for the Indian market, used for order creation, payment verification, and webhook handling.
- **Database**:
    - **Neon PostgreSQL**: Serverless PostgreSQL database for primary data storage and session management.
- **Development & Deployment**:
    - **Replit Platform**: Used as the development environment and for production deployment.
    - **Vite**: Frontend build tool and development server.