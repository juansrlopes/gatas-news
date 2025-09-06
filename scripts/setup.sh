#!/bin/bash

# Gatas News - Development Setup Script
# This script helps new developers set up the project quickly

set -e  # Exit on any error

echo "🐱 Setting up Gatas News development environment..."
echo "=================================================="

# Check if required tools are installed
check_dependency() {
    if ! command -v $1 &> /dev/null; then
        echo "❌ $1 is not installed. Please install it first."
        echo "   Installation guide: $2"
        exit 1
    else
        echo "✅ $1 is installed"
    fi
}

echo "📋 Checking dependencies..."
check_dependency "node" "https://nodejs.org/"
check_dependency "npm" "https://nodejs.org/"
check_dependency "mongod" "https://docs.mongodb.com/manual/installation/"
check_dependency "redis-server" "https://redis.io/download"

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2)
REQUIRED_VERSION="18.0.0"
if [ "$(printf '%s\n' "$REQUIRED_VERSION" "$NODE_VERSION" | sort -V | head -n1)" != "$REQUIRED_VERSION" ]; then
    echo "❌ Node.js version $NODE_VERSION is too old. Please upgrade to v18 or higher."
    exit 1
fi

echo "✅ Node.js version $NODE_VERSION is compatible"

# Install dependencies
echo ""
echo "📦 Installing dependencies..."
npm install

# Start services
echo ""
echo "🚀 Starting services..."

# Check if MongoDB is running
if ! pgrep -x "mongod" > /dev/null; then
    echo "Starting MongoDB..."
    if command -v brew &> /dev/null; then
        brew services start mongodb-community
    else
        echo "Please start MongoDB manually: sudo systemctl start mongod"
    fi
else
    echo "✅ MongoDB is already running"
fi

# Check if Redis is running
if ! pgrep -x "redis-server" > /dev/null; then
    echo "Starting Redis..."
    if command -v brew &> /dev/null; then
        brew services start redis
    else
        echo "Please start Redis manually: sudo systemctl start redis"
    fi
else
    echo "✅ Redis is already running"
fi

# Create environment file if it doesn't exist
if [ ! -f "apps/api/.env" ]; then
    echo ""
    echo "📝 Creating environment configuration..."
    cat > apps/api/.env << EOF
# News API Configuration - Get your key from https://newsapi.org/
NEWS_API_KEY=your_newsapi_key_here
NEWS_API_KEY_BACKUP=your_backup_key_here

# Database Configuration
MONGODB_URI=mongodb://localhost:27017/gatas-news
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_DB=0

# Server Configuration
PORT=8000
NODE_ENV=development
EOF
    echo "✅ Created apps/api/.env file"
    echo "⚠️  Please edit apps/api/.env and add your NewsAPI key"
else
    echo "✅ Environment file already exists"
fi

# Populate database with celebrities
echo ""
echo "👥 Populating database with celebrities..."
npm run migrate:celebrities

echo ""
echo "🎉 Setup complete!"
echo ""
echo "Next steps:"
echo "1. Edit apps/api/.env and add your NewsAPI key from https://newsapi.org/"
echo "2. Run 'npm run dev' to start both frontend and API"
echo "3. Visit http://localhost:3000 for the frontend"
echo "4. Visit http://localhost:8000/health to check API health"
echo ""
echo "Useful commands:"
echo "  npm run dev          # Start both frontend and API"
echo "  npm run dev:api      # Start API only"
echo "  npm run dev:frontend # Start frontend only"
echo "  npm run test         # Run tests"
echo "  npm run lint         # Check code quality"
echo ""
echo "Happy coding! 🚀"
