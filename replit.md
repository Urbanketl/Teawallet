# UrbanKetl - Smart Tea Subscription & RFID System

## Overview
UrbanKetl is a B2B corporate tea dispensing system that integrates RFID technology with a web application. Its primary purpose is to enable business unit administrators to manage multiple tea machines, issue generic RFID cards to employees, and monitor dispensing activity charged to a corporate wallet. The project aims to provide a comprehensive solution for corporate tea services, streamlining management, billing, and offering detailed analytics. The vision is to become the leading provider of smart beverage solutions for corporate environments, enhancing employee amenities and simplifying administrative overhead.

## Recent Changes (January 31, 2025)
- **DESFire AES Mutual Authentication Implemented** - Built complete server-side DESFire EV2/EV3 AES mutual authentication system following NXP specifications. Implementation includes:
  - Crypto service with AES-128 encryption/decryption (CBC mode, IV=0), byte rotation, and session key derivation
  - Session manager with 30-second timeout and automatic cleanup
  - Three-step authentication service (start, process, verify) matching NXP protocol
  - Three API endpoints for Raspberry Pi integration: `/api/rfid/auth/start`, `/api/rfid/auth/step2`, `/api/rfid/auth/verify`
  - Comprehensive API documentation in `docs/DESFIRE_AUTH_API.md` with Python integration examples
  - All cryptographic operations performed server-side for security

## Previous Changes (October 31, 2025)
- **Mobile App Created** - Built complete React Native mobile app using Expo in `/mobile` directory. Features include session-based authentication, wallet management, transaction history, profile settings, and push notifications. Mobile app connects to the same Express backend and PostgreSQL database as the web app. Comprehensive setup documentation in `mobile/README.md` includes instructions for iOS/Android testing, session cookie handling, and production builds.
- **QR Scanner Removed** - Removed QR scanner feature from mobile app as it was not needed for initial release. Can be re-added in future if specific QR code functionality is required.

## Previous Changes (October 23, 2025)
- **Session Save on Login Fix** - Fixed critical bug where first payment after login would fail and log user out. The login endpoint was not explicitly saving the session for regular logins (only for password resets), causing the session to not persist before payment redirect. Now all logins call `req.session.save()` before responding, ensuring session is persisted to database before any redirects occur. This fixes the "payment successful but user logged out" issue on first payment after login.
- **UPI Sync Job Extracted for Scheduled Deployment** - Created standalone UPI sync job at `server/jobs/upi-sync.ts` that can run independently as a Replit Scheduled Deployment. Main application now skips UPI sync scheduler in production (runs only in development for testing). This prepares the system for Autoscale Deployment where background cron jobs are not suitable. UPI sync runs daily at 8 PM IST as a separate scheduled job project.
- **Business Unit Count Fix** - Fixed Overview dashboard bug where "Total Business Units" card was displaying user count (20) instead of actual business unit count (7). Updated backend `getDailyStats()` to query both totalUsers and totalBusinessUnits separately.

## User Preferences
Preferred communication style: Simple, everyday language.
UI/UX preferences: Clean, simplified interfaces without unnecessary elements like export buttons or column headers in data tables. Pagination controls should be positioned at the top of listings.

## System Architecture

### UI/UX Decisions
- **Frontend Framework**: React 18 with TypeScript, utilizing Radix UI components and Tailwind CSS for a modern, responsive design.
- **Mobile**: React Native with Expo for a companion mobile application.
- **Design Principles**: Brand-aligned login page redesign with a centered layout, professional branding, and optimized for viewport height. Consistent application of brand colors (Pantone Gold Fusion) to key interactive elements.
- **Navigation**: Streamlined navigation with simplified role-based access. Corporate page serves as the main landing page with an integrated welcome banner, business unit cards, and management tools.

### Technical Implementations
- **Backend**: Node.js with Express.js, written in TypeScript, providing RESTful APIs.
- **Authentication**: Custom email/password authentication system with admin-controlled user creation and secure session management persisted in PostgreSQL. Role-based access control includes Platform Admin (full system access) and Business Unit Admin (analytics access).
- **RFID Integration**: Centralized RFID card management using MIFARE DESFire EV3 cards (backward compatible with EV1/EV2) with AES encryption. Platform admins can batch create and assign cards with automatic cryptographic key generation. All RFID validation is server-side via API calls from Pi machines using DESFire AES mutual authentication (NXP standard). Raspberry Pi machines support both ACR122U (USB/PC-SC) and MCRN2 (SPI/PN532) readers. Three-step authentication protocol: start authentication, process card response (Enc(RndB)), verify final response (Enc(Rot(RndA))) with server-side cryptographic operations and session key derivation.
- **Payment Processing**: Razorpay integration for digital wallet recharges, including recharge, deduction, refund, payment verification, and webhook handling.
- **Tea Pricing**: Simplified to a single "Regular Tea" variety with machine-specific pricing configurable by admins.
- **Reporting & Analytics**: Comprehensive administrative dashboards for user management, revenue tracking, usage patterns, and machine monitoring. Features include custom date range selection, Excel/PDF export, and graphical business insights.
- **Admin Features**: Admin-only user creation, secure business unit ownership transfer with audit logging, support ticket management, and an FAQ system.
- **Machine Management**: Platform admins can create, edit, assign, and control tea machines, enforcing mandatory business unit assignment for all machines and transactions.
- **Wallet System**: Business unit-specific digital wallets with recharge capabilities, designed to handle multiple business units per user.
- **UPI Sync System**: Automated daily synchronization of UPI payment transactions from the Kulhad API.
- **Timeout Management**: Multi-layered timeout strategy with route-specific (RFID 5s, Analytics 60s, Exports 120s), external API (30s), server-level (request 40s, socket 30s), and database (10s execution) timeouts.

### System Design Choices
- **Data Model**: B2B corporate model where each user is a business unit administrator. Generic RFID cards are linked to business units, with all usage charged to the corporate wallet.
- **Security**: CSRF protection, secure cookies, session validation, and strict control over account creation (no public registration). AES keys for DESFire cards are stored encrypted in the database.
- **Scalability**: PostgreSQL with Neon serverless for the primary database, Drizzle ORM for schema management. Database performance indexes implemented for high transaction volumes.
- **Error Handling**: Centralized error handling with structured logging.

## External Dependencies

- **Payment Services**:
    - **Razorpay**: Primary payment gateway for the Indian market, used for order creation, payment verification, and webhook handling.
- **Database**:
    - **Neon PostgreSQL**: Serverless PostgreSQL database for primary data storage and session management.
- **Development & Deployment**:
    - **Replit Platform**: Used as the development environment and for production deployment.
    - **Vite**: Frontend build tool and development server.