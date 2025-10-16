# UrbanKetl - Smart Tea Subscription & RFID System

## Overview
UrbanKetl is a B2B corporate tea dispensing system integrating RFID technology with a web application. It enables business unit administrators to manage multiple tea machines, issue generic RFID cards to employees, and monitor dispensing activity charged to a corporate wallet. The project aims to provide a comprehensive solution for corporate tea services, streamlining management and billing.

## Recent Changes (October 16, 2025)
- **Razorpay Preview URL Integration** - Simplified payment flow by using Razorpay's preview URL (`/v1/checkout/preview`) with query parameters instead of POST form approach. This directly redirects users to Razorpay checkout with order_id, key_id, and callback URLs, avoiding routing issues.
- **Razorpay Callback Flow Fixed** - Resolved payment callback error by implementing proper POST callback handler. Razorpay hosted checkout sends payment data via POST to backend (`/api/wallet/payment-callback`), which then redirects to frontend with query parameters.
- **Backend Callback Handler** - Created `/api/wallet/payment-callback` POST endpoint that receives payment data from Razorpay and redirects to frontend payment-callback page with `razorpay_payment_id`, `razorpay_order_id`, and `razorpay_signature` as query parameters.
- **Database Migration System Fixed** - Resolved publishing failure by implementing proper Drizzle migrations. Generated migration files from schema and created automatic migration runner that executes on production startup. This fixes the "failed to validate database migrations" error during publishing.
- **Migration Runner Implementation** - Created `server/migrate.ts` that automatically applies pending database migrations when the app starts in production mode, ensuring schema changes are properly deployed.
- **Razorpay Redirect Flow Implementation** - Switched from modal-based checkout to redirect-based hosted checkout due to production CORS header restrictions (`x-rtb-fingerprint-id` blocked by edge layer). Modal container rendered but content failed to load due to Razorpay's fraud detection being blocked.
- **Payment Callback Handler** - Created `/wallet/payment-callback` page to process payment responses from Razorpay's hosted checkout. Handles payment verification, wallet updates, and user feedback.
- **Enhanced Payment Flow** - Updated `useRazorpay` hook to create hidden form that POSTs to Razorpay's standard checkout URL with callback URLs for success/cancel scenarios.
- **Production-Ready Payment Integration** - Resolves modal rendering issues on www.ukteawallet.com by using Razorpay's recommended redirect approach for environments with restrictive security policies.

## Previous Changes (October 15, 2025)
- **MCRN2 Reader Compatibility** - Created proper implementation for MCRN2 (PN532-based) RFID readers with Adafruit CircuitPython PN532 library. Previous code incorrectly used MFRC522 library which is incompatible with MCRN2 hardware.
- **DESFire EV3 APDU Support** - Implemented correct APDU command handling for DESFire EV3 authentication via PN532's InDataExchange, properly handling status byte prepending.
- **New Machine Files**: Created `urbanketl_machine_mcrn2.py`, `install_mcrn2.sh`, and `README_MCRN2.md` for MCRN2-specific deployment.
- **Simplified GPIO Configuration** - Updated machine code to use only GPIO 18 (tea dispenser) as required pin. LEDs (GPIO 16, 20) and buzzer (GPIO 21) are now optional and can be added via config without code changes.

## Previous Changes (October 11, 2025)
- **Completed Phase 5: Comprehensive Timeout Strategy** - Implemented multi-layered timeout system with route-specific timeouts, external API timeouts, and timeout monitoring
- **Route-Specific Timeouts**: RFID validation (5s), Machine authentication (5s), Analytics (60s), File exports (120s)
- **External API Timeouts**: WhatsApp/MyOperator (30s), Email/Nodemailer (30s), Razorpay (30s)
- **Timeout Monitoring**: Real-time tracking of timeout events with statistics and admin dashboard endpoint (/api/admin/timeout-stats)
- **Server-Level Timeouts**: Request (40s), Headers (35s), Socket (30s), Keep-alive (65s)
- **Database Timeouts**: Connection (30s), Query execution (10s), Idle (10s)

## Previous Changes (August 17, 2025)
- **Completed Phase 3: Machine Auto-Sync System** - Implemented automated synchronization scheduling with cron-based background service running every 30 minutes during business hours (6 AM - 10 PM IST)
- **Completed Phase 4: Challenge-Response Authentication** - Full MIFARE DESFire EV1 cryptographic authentication system with AES challenge-response protocol
- **Updated RFID Card System to DESFire EV1 Only** - Removed basic RFID card option, standardized on MIFARE DESFire EV1 cards with AES encryption for all new card creation
- **System Stability Confirmed** - Current architecture stable and performant with no refactoring needs identified. 5,379-line admin interface working efficiently for single-developer workflow
- **Removed Key Rotation Feature (October 14, 2025)** - Removed automatic key rotation as it's incompatible with physical MIFARE DESFire EV1 hardware cards. Keys are programmed once at card issuance and cannot be remotely changed.
- Added comprehensive auto-sync service with retry mechanisms, manual triggers, bulk operations, and detailed performance statistics
- Implemented secure challenge-response authentication for DESFire cards with 30-second challenge timeout and audit logging
- Created new API endpoints for machine authentication (challenge generation, response validation, dispensing authorization)
- Added admin controls for auto-sync management and authentication monitoring
- Enhanced security with encrypted AES key storage and comprehensive audit trails
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
- **RFID Integration**: Centralized RFID card management system using MIFARE DESFire EV3 cards (backward compatible with EV1/EV2) with AES encryption. Platform admins can batch create and assign cards to business units with automatic cryptographic key generation. Plain AES keys are shown once during creation and must be saved for physical card programming. Machine-facing API endpoints validate cards using challenge-response authentication and process transactions with automatic wallet deduction. Raspberry Pi tea machines support MCRN2 (PN532-based) RFID readers with proper DESFire APDU command handling.
- **Payment Processing**: Razorpay integration for digital wallet recharges, supporting recharge, deduction, and refund operations. Includes payment verification and webhook handling.
- **Tea Pricing**: Simplified to a single "Regular Tea" variety with machine-specific pricing configurable by admins.
- **Reporting & Analytics**: Comprehensive administrative dashboards for user management, revenue tracking, usage patterns, and machine monitoring. Features include custom date range selection for reports, Excel/PDF export functionality, and graphical business insights for cross-business unit comparisons.
- **Admin Features**: Admin-only user creation, secure business unit ownership transfer with audit logging, support ticket management, and FAQ system.
- **Machine Management**: Platform admins can create, edit, assign, and control tea machines, enforcing mandatory business unit assignment for all machines and transactions.
- **Wallet System**: Business unit-specific digital wallets with recharge capabilities, designed to handle multiple business units per user.
- **Auto-Sync System (Phase 3)**: Automated RFID card synchronization across all tea machines with cron scheduling, retry mechanisms, manual triggers, and comprehensive monitoring.
- **Challenge-Response Authentication (Phase 4)**: MIFARE DESFire EV1 cryptographic authentication with AES encryption and secure dispensing authorization. AES keys are programmed once at card issuance and stored encrypted in the database using a master key.
- **Timeout Management (Phase 5)**: Multi-layered timeout strategy protecting against hung connections and slow operations. Route-specific timeouts (RFID 5s, Analytics 60s, Exports 120s), external API timeouts (WhatsApp, Email, Razorpay 30s), server-level timeouts (request 40s, socket 30s), and database query timeouts (10s execution). Includes comprehensive monitoring service tracking timeout events with admin dashboard.

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