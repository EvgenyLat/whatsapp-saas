#!/bin/bash

echo "Starting WhatsApp SaaS Admin Frontend..."
echo

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
    if [ $? -ne 0 ]; then
        echo "Error installing dependencies. Please check your Node.js installation."
        exit 1
    fi
fi

# Create .env.local if it doesn't exist
if [ ! -f ".env.local" ]; then
    echo "Creating .env.local file..."
    cat > .env.local << EOF
NEXT_PUBLIC_API_BASE=http://localhost:4000
NODE_ENV=development
EOF
    echo "Environment file created."
fi

echo "Starting development server on http://localhost:3000..."
echo
echo "Press Ctrl+C to stop the server"
echo

npm run dev
