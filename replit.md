# UrbanKetl - Smart Tea Subscription & RFID System

## Overview
UrbanKetl is a B2B corporate tea dispensing system that integrates RFID technology with a web application. Its primary purpose is to enable business unit administrators to manage multiple tea machines, issue generic RFID cards to employees, and monitor dispensing activity charged to a corporate wallet. The project aims to provide a comprehensive solution for corporate tea services, streamlining management, billing, and offering detailed analytics. The vision is to become the leading provider of smart beverage solutions for corporate environments, enhancing employee amenities and simplifying administrative overhead.

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
- **RFID Integration**: Centralized RFID card management using MIFARE DESFire EV3 cards (backward compatible with EV1/EV2) with AES encryption. Platform admins can batch create and assign cards with automatic cryptographic key generation. All RFID validation is server-side via API calls from Pi machines using challenge-response authentication. Raspberry Pi machines support both ACR122U (USB/PC-SC) and MCRN2 (SPI/PN532) readers with automatic detection and DESFire APDU command handling.
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