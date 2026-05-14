# Blackbridge

Blackbridge is an end-to-end encrypted (E2EE) file transfer and request platform designed for securely sharing files with anyone. Built with privacy in mind, it ensures that your files are encrypted on the client side before they are ever uploaded to the server.

## Features

- **End-to-End Encryption:** Files are encrypted and decrypted directly in the browser using OpenPGP, ensuring that the server never has access to the raw files.
- **Secure File Transfers:** Send large files securely to intended recipients.
- **File Requests:** Request files securely from clients or partners.
- **Secure Authentication:** Utilizes Secure Remote Password (SRP) protocol for zero-knowledge proof authentication.
- **Custom Branding:** Customize your transfer and request pages with your own branding.
- **Large File Support:** Employs `streamsaver` and web workers (`comlink`) to handle massive file sizes seamlessly without crashing the browser.
- **Analytics & Dashboard:** Keep track of your active transfers, downloaded files, and storage usage.

## Tech Stack

**Frontend**
- **Framework:** React 19, Vite
- **Styling:** Tailwind CSS, Radix UI Primitives, Material UI (MUI), Framer Motion
- **State Management:** Zustand, React Query (@tanstack/react-query)
- **Forms & Validation:** React Hook Form, Zod
- **Cryptography & File Processing:** OpenPGP, fast-srp-hap, @zip.js/zip.js, Comlink (Web Workers), StreamSaver

**Backend**
- **Framework:** Node.js, Express 5
- **Database & ORM:** PostgreSQL, Prisma
- **Caching & Rate Limiting:** Redis
- **Storage:** AWS S3, CloudFront (Signed URLs)
- **Email:** Resend, React Email
- **Cryptography:** bcrypt, fast-srp-hap, OpenPGP

**Infrastructure**
- **IaC:** Terraform

## Project Structure

- `/frontend` - The React Vite application. Contains views, components, and client-side encryption logic.
- `/backend` - The Node.js Express API. Handles authentication, database interactions, and AWS storage coordination.
- `/terraform` - Infrastructure as Code (IaC) configuration for deploying to AWS.

## Getting Started

### Prerequisites

- Node.js (v20+)
- PostgreSQL
- Redis
- AWS Account (for S3 and CloudFront)

### Installation

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd blackbridge-app
   ```

2. **Backend Setup:**
   ```bash
   cd backend
   npm install
   # Copy the example env file and update variables
   cp .env.example .env
   # Run database migrations
   npm run db:migrate
   # Start the backend development server
   npm run dev
   ```

3. **Frontend Setup:**
   ```bash
   cd ../frontend
   npm install
   # Start the frontend development server
   npm run dev
   ```

## Development Commands

- **Frontend:**
  - `npm run dev`: Starts the Vite dev server.
  - `npm run build`: Builds the app for production.
- **Backend:**
  - `npm run dev`: Starts the Express server with nodemon.
  - `npm run db:push`: Pushes schema changes to the database.
  - `npm run prisma:generate`: Generates Prisma client.

## License

ISC License
