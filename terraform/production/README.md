# **BlackBridge Production \- Terraform Infrastructure**

This repository contains the Terraform code to provision a full-stack application infrastructure on AWS for "BlackBridge Production".

The infrastructure includes:

- An **EC2 instance** for the backend application, accessible via SSH.
- A **PostgreSQL RDS instance** for the primary database, accessible only from the EC2.
- A **Redis ElastiCache cluster** for caching, also accessible only from the EC2.
- An **S3 bucket** with Transfer Acceleration for direct user uploads.
- A **CloudFront CDN** to serve files from the S3 bucket, preventing direct access.
- A second **S3 bucket** to host a static React front-end.
- An **API Gateway** to route /api requests to the EC2 backend and all other requests to the static React application.

### **Prerequisites**

- [Terraform CLI](https://developer.hashicorp.com/terraform/downloads) installed on your machine.
- AWS account configured with the necessary credentials.

### **How to Use**

1. **Clone this repository** to your local machine.
2. **Navigate** to the root directory of the repository.
3. **Initialize Terraform** to download the necessary providers and modules:  
   `terraform init`

4. **Create a terraform.tfvars file** to set your sensitive variables, specifically the RDS password. Do not commit this file to version control.  
   `rds_password \= "your-secure-password"`

5. **Review the plan** to see what Terraform will create.  
   `terraform plan`

6. **Apply the configuration** to provision the resources on AWS. You will be prompted to confirm the action.  
   `terraform apply`

### **Post-Deployment**

- After terraform apply is complete, the outputs will display key information such as the EC2 public IP, the RDS endpoint, and the private SSH key.
- **Copy the SSH private key** from the output and save it in a secure location (e.g., \~/.ssh/blackbridge_production_key.pem). Be sure to set the correct permissions:  
  `chmod 600 \~/.ssh/blackbridge_production_key.pem`

- You can now SSH into your EC2 instance using the provided IP:  
  `ssh \-i \~/.ssh/blackbridge_production_key.pem ubuntu@\<EC2_PUBLIC_IP\>`

### **File Breakdown**

- main.tf: The main entry point that ties all the resources together using modules.
- variables.tf: Defines all the input variables for the project.
- outputs.tf: Defines the values that will be displayed after the terraform apply command.
- compute.tf: Contains the EC2 instance and key pair resources.
- database.tf: Defines the Postgres RDS database instance.
- cache.tf: Defines the Redis cache cluster.
- storage-cdn.tf: Sets up the S3 bucket for user uploads and the CloudFront distribution to serve the files.
- static-site.tf: Configures the S3 bucket for static website hosting.
- api-gateway.tf: Defines the API Gateway with its two distinct routing behaviors.
- networking.tf: Manages the VPC, subnets, and all security group rules in one place.
