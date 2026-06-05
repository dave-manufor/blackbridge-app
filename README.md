<div align="center">
  <img src="docs/assets/blackbridge-logo.svg" alt="Blackbridge Logo" width="120" height="120" />
  <h1>Blackbridge</h1>
  <p><b>A Zero-Knowledge, End-to-End Encrypted File Transfer Platform.</b></p>
  
  [![Live Demo](https://img.shields.io/badge/Live_Demo-Available-success?style=for-the-badge)](https://blackbridge-demo.davman.dev)
  [![Security](https://img.shields.io/badge/Security-Zero_Knowledge-blue?style=for-the-badge)](#architecture--zero-knowledge-flow)
  [![Testing](https://img.shields.io/badge/Testing-Playwright_E2E-orange?style=for-the-badge)](#testing-methodology)
</div>

<br/>

![Blackbridge Dashboard](docs/assets/dashboard.png)

Blackbridge is an enterprise-grade file transfer platform designed with a strict zero-knowledge architecture. Unlike traditional cloud storage that encrypts your data "at rest" (where the server holds the decryption keys), Blackbridge ensures that your files are **encrypted directly in your browser** before they ever leave your device. The server only handles ciphertext, meaning even in the event of a total database breach, your files remain mathematically secure.

---

## 🔒 Architecture & Zero-Knowledge Flow

Building a true zero-knowledge application requires overcoming two major hurdles: authenticating users without knowing their passwords, and encrypting massive files without crashing the browser.

### 1. Secure Remote Password (SRP) Protocol
Blackbridge utilizes the SRP protocol (`fast-srp-hap`) for authentication. When a user logs in:
- The plaintext password **never** leaves the browser.
- The client and server exchange cryptographic proofs to generate a shared session key.
- The server verifies the user's identity without ever storing or hashing the password.

```mermaid
sequenceDiagram
    participant C as Client (Browser)
    participant S as Server
    
    Note over C: User enters Email & Password
    C->>C: Generate public ephemeral key (A)
    C->>S: Send Email + A
    S->>S: Lookup user salt & verifier (v)
    S->>S: Generate public ephemeral key (B)
    S-->>C: Return salt + B
    C->>C: Calculate Session Key (K) & Client Proof (M1)
    C->>S: Send Client Proof (M1)
    S->>S: Calculate Server Session Key (K) & Verify M1
    S->>S: Generate Server Proof (M2)
    S-->>C: Return Server Proof (M2) + Session Token
    Note over C, S: Authentication complete. Password was NEVER transmitted!
```

### 2. Client-Side Encryption (OpenPGP + Web Workers)
All files are encrypted client-side using OpenPGP. To prevent the browser's main UI thread from freezing during heavy cryptographic operations, Blackbridge offloads encryption to background **Web Workers** via `comlink`.

### 3. Memory Optimization (Streamsaver)
Encrypting a 5GB file typically requires holding 5GB of data in RAM, causing Out-Of-Memory (OOM) crashes in the browser. Blackbridge solves this by streaming the ciphertext chunk-by-chunk and utilizing `streamsaver` to stream the decrypted bytes directly to the user's hard drive.

### The Cryptographic Handshake

```mermaid
sequenceDiagram
    participant S as Sender (Browser)
    participant API as Blackbridge API
    participant R as Receiver (Browser)

    Note over S: 1. Generate random Symmetric Key
    S->>S: Encrypt File with Symmetric Key
    S->>API: Upload Ciphertext File
    API-->>S: Return Transfer ID
    Note over S: 2. Generate Shareable URL<br/>(Contains Transfer ID + Symmetric Key in hash fragment)
    S-->>R: Send Shareable URL via out-of-band channel
    Note over R: Hash fragments (#key) are never sent to the server.
    R->>API: Request Ciphertext using Transfer ID
    API-->>R: Stream Ciphertext File
    R->>R: Decrypt stream using Symmetric Key from URL
    R->>R: Stream raw bytes to disk (Streamsaver)
```

### 4. Secure File Requests
Beyond sending files, Blackbridge allows users to request highly sensitive files from external partners via a secure, zero-knowledge inbox.

```mermaid
sequenceDiagram
    participant R as Requester (Blackbridge User)
    participant API as Blackbridge API
    participant P as External Partner
    
    R->>API: Create "File Request" Portal
    API-->>R: Return Public Upload URL
    R-->>P: Send URL via email/chat
    Note over P: Partner opens link (No account needed)
    P->>P: Selects sensitive files
    P->>P: Encrypts files directly in browser
    P->>API: Uploads Ciphertext
    API-->>R: Notify: "Files Received"
    R->>API: Download Ciphertext
    R->>R: Decrypts files locally
```

### 5. Email Sharing (Public Key Cryptography)
When sending a file directly to an email address, Blackbridge utilizes standard asymmetric public-key cryptography (OpenPGP) to ensure the server never sees the symmetric file key.

```mermaid
sequenceDiagram
    participant S as Sender
    participant API as Blackbridge API
    participant R as Receiver (Email)

    S->>API: Request Receiver's Public Key (via Email)
    API-->>S: Return Public Key
    S->>S: Generate Symmetric File Key & Encrypt File
    S->>S: Encrypt Symmetric Key with Receiver's Public Key
    S->>API: Upload Ciphertext + Encrypted Key
    API->>R: Send Email Notification Link
    Note over R: Receiver clicks link and authenticates
    R->>API: Download Encrypted Key + Ciphertext
    R->>R: Decrypt Key using own Private Key
    R->>R: Decrypt File using Symmetric Key
```

### 6. Peer-to-Peer (WebRTC)
For ultimate privacy and speed, users can transfer files directly to each other without the files ever touching the Blackbridge servers using WebRTC Data Channels.

```mermaid
sequenceDiagram
    participant S as Sender
    participant SIG as Signaling Server
    participant R as Receiver

    S->>SIG: Join Room & Send WebRTC Offer
    SIG-->>R: Forward Offer
    R->>R: Accept Offer & Generate Answer
    R->>SIG: Send WebRTC Answer
    SIG-->>S: Forward Answer
    Note over S, R: ICE Candidates Exchanged via Signaling Server
    S->>R: Direct WebRTC Data Channel Established
    Note over S, R: Server is now entirely out of the loop
    S->>S: Encrypt File Chunk (OpenPGP)
    S->>R: Send Encrypted Chunk via Data Channel
    R->>R: Decrypt Chunk & Stream to disk
```

---

## 📸 Interface

![Transfer Screen](docs/assets/transfer.png)

## 🛠️ Tech Stack & Infrastructure

**Frontend**
- **Framework:** React 19, Vite
- **State & Data:** Zustand, TanStack React Query
- **Cryptography:** OpenPGP.js, `fast-srp-hap`
- **Performance:** Comlink (Web Workers), StreamSaver.js

**Backend**
- **Framework:** Node.js, Express 5
- **Database:** PostgreSQL via Prisma ORM
- **Caching & Rate Limiting:** Redis

**Infrastructure & DevOps**
- **IaC:** AWS provisioned via Terraform (Private VPC subnets, RDS, S3, CloudFront).
- **Security Posture:** 
  - `SameSite: Strict` JWT cookie enforcement to prevent CSRF.
  - Multi-stage Dockerfile builds utilizing non-root users (`node`) and pinned image digests.
  - Granular AWS S3 bucket policies and CloudFront signed URLs to prevent direct asset access.

---

## 🧪 Testing Methodology

Security applications require extreme confidence. Blackbridge employs multiple testing layers to guarantee cryptographic integrity:

### Playwright E2E Testing
Located in `/e2e`, the Playwright suite treats the application as a black box. It spawns **two isolated browser contexts** simultaneously to simulate the zero-knowledge flow:
1. **Context A (Sender)** uploads an encrypted file and captures the sharing link.
2. **Context B (Receiver)** opens the link, downloads, and decrypts the file.
3. The test asserts that the raw bytes match perfectly, mathematically proving the E2EE flow works without data corruption.

### Vitest Unit Testing
The core cryptographic service layer (`KeyStore`, `SRP`, `CryptoBridge`) is covered by a robust Vitest suite to ensure key generation and session proofs perform deterministically.

---

## 🚀 Getting Started Locally

### Prerequisites
- Node.js (v20+)
- PostgreSQL
- Redis
- AWS Account (for S3 and CloudFront)

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/dave-manufor/blackbridge-app.git
   cd blackbridge-app
   ```

2. **Backend Setup:**
   ```bash
   cd backend
   npm install
   cp .env.example .env # Ensure AWS, DB, and Redis vars are set
   npm run db:push
   npm run dev
   ```

3. **Frontend Setup:**
   ```bash
   cd ../frontend
   npm install
   npm run dev
   ```

### Running Tests
To execute the End-to-End testing suite against a fresh, isolated local test database:
```bash
cd e2e
npm run test
```

---

<div align="center">
  <i>Engineered with security and performance in mind.</i><br/>
  <b>License: ISC</b>
</div>
