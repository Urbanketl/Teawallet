# UrbanKetl - Smart Tea Subscription & RFID System

## Overview
UrbanKetl is a B2B corporate tea dispensing system integrating RFID technology with a web application. It enables business unit administrators to manage multiple tea machines, issue generic RFID cards to employees, and monitor dispensing activity charged to a corporate wallet. The project aims to provide a comprehensive solution for corporate tea services, streamlining management and billing.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### UI/UX Decisions
- **Frontend Framework**: React 18 with TypeScript, utilizing Radix UI components and Tailwind CSS for a modern and responsive design.
- **Mobile**: React Native with Expo for a companion mobile application.
- **Design Principles**: Brand-aligned login page redesign with a centered layout, professional branding, and optimized for viewport height. Consistent application of brand colors (Pantone Gold Fusion) to key interactive elements.
- **Navigation**: Streamlined navigation with simplified role-based access. Corporate page serves as main landing page with integrated welcome banner. Dashboard and wallet pages removed for cleaner user experience.
- **Landing Page Architecture**: Corporate page (/) is the primary entry point featuring color-coded business unit cards, personalized welcome banner, and comprehensive business unit management tools.

### Technical Implementations
- **Backend**: Node.js with Express.js, written in TypeScript, providing RESTful APIs.
- **Authentication**: Custom email/password authentication system replacing Replit Auth, featuring admin-controlled user creation and secure session management with PostgreSQL persistence. Role-based access control (Business Unit Admin, Platform Admin, Viewer).
- **Session Management**: Server-side sessions persisted in PostgreSQL.
- **RFID Integration**: Centralized RFID card management system allowing platform admins to batch create and assign cards to business units. Machine-facing API endpoints validate cards and process transactions with automatic wallet deduction.
- **Payment Processing**: Razorpay integration for digital wallet recharges, supporting recharge, deduction, and refund operations. Includes payment verification and webhook handling.
- **Tea Pricing**: Simplified to a single "Regular Tea" variety with machine-specific pricing configurable by admins.
- **Reporting & Analytics**: Comprehensive administrative dashboards for user management, revenue tracking, usage patterns, and machine monitoring. Features include custom date range selection for reports, Excel/PDF export functionality, and graphical business insights for cross-business unit comparisons.
- **Admin Features**: Admin-only user creation, secure business unit ownership transfer with audit logging, support ticket management, and FAQ system.
- **Machine Management**: Platform admins can create, edit, assign, and control tea machines, enforcing mandatory business unit assignment for all machines and transactions.
- **Wallet System**: Business unit-specific digital wallets with recharge capabilities, designed to handle multiple business units per user.

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