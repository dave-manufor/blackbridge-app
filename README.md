# BlackBridge

A full-stack TypeScript application with Terraform-managed AWS infrastructure and automated CI/CD pipelines.

🔗 **Live Beta:** [blackbridge-beta.davman.dev](https://blackbridge-beta.davman.dev)

## Architecture

```
blackbridge-app/
├── backend/          # Node.js/TypeScript API with Express
│   ├── src/          # Application source code
│   └── react-email-starter/  # Transactional email templates
├── frontend/         # React + Vite + shadcn/ui
│   ├── src/          # Components, pages, and hooks
│   └── public/       # Static assets
├── terraform/        # AWS infrastructure as code (HCL)
└── .github/          # CI/CD workflows (GitHub Actions)
```

## Tech Stack

| Layer          | Technology                          |
|----------------|-------------------------------------|
| **Frontend**   | React, TypeScript, Vite, shadcn/ui  |
| **Backend**    | Node.js, Express, TypeScript        |
| **Database**   | PostgreSQL                          |
| **Emails**     | React Email                         |
| **Infra**      | Terraform (HCL), AWS                |
| **CI/CD**      | GitHub Actions                      |
| **Hosting**    | AWS (managed via Terraform)         |

## Key Features

- **Full-Stack TypeScript** — End-to-end type safety from API to UI
- **Infrastructure as Code** — All AWS resources managed declaratively with Terraform
- **Automated Deployments** — CI/CD pipeline via GitHub Actions for testing and deployment
- **Transactional Emails** — React Email templates for type-safe, responsive email generation
- **Component Library** — Built on shadcn/ui for consistent, accessible UI components

## Getting Started

```bash
# Clone the repository
git clone https://github.com/dave-manufor/blackbridge-app.git

# Backend
cd backend
cp .env.template .env
npm install
npm run dev

# Frontend (separate terminal)
cd frontend
cp .env.template .env
npm install
npm run dev
```

## Infrastructure

AWS infrastructure is provisioned and managed via Terraform:

```bash
cd terraform
terraform init
terraform plan
terraform apply
```

## License

MIT
