#!/bin/bash

# ==================================================================================================
# 🚀 Automated Redeployment Script for Node.js App on AWS EC2
# ==================================================================================================
# This script:
# ✅ Runs prisma migrate deploy to apply database changes
# ✅ Restarts the application using PM2
# ==================================================================================================

set -e  # Exit script immediately if any command fails (useful for debugging)
set -o pipefail

APP_DIR="/var/www/blackbridge" 
APP_NAME="blackbridge"
APP_ENTRY="index.js"

cd "$APP_DIR" || { echo "Application directory not found! Exiting."; exit 1; }

# ========================================================================================
# 1️⃣ MIGRATE DATABASE CHANGES
# ========================================================================================
echo "Running database migrations..."
npm run prisma:migrate
npm run prisma:generate

# ========================================================================================
# 2️⃣ RESTART THE APPLICATION USING PM2
# ========================================================================================
if pm2 list | grep -q "$APP_NAME"; then
    echo "Reloading $APP_NAME..."
    pm2 reload "$APP_NAME"
else
    echo "Starting $APP_NAME..."
    pm2 start "$APP_ENTRY" --name "$APP_NAME"
    pm2 startup systemd || true
    pm2 save || true
fi

# ========================================================================================
# ✅ REDEPLOYMENT COMPLETE
# ========================================================================================
echo "Redeployment completed successfully! Your app is live."