#!/bin/bash

# AxyN Backend - PostgreSQL Local Setup Script
# This script creates a local PostgreSQL database for development

set -e

DB_NAME="axyn_db"
DB_USER="${USER}"  # Uses your macOS username

echo "🗄️  Setting up PostgreSQL database for AxyN..."
echo ""

# Check if PostgreSQL is installed
if ! command -v psql &> /dev/null; then
    echo "❌ PostgreSQL is not installed or not in PATH"
    echo ""
    echo "Install PostgreSQL using Homebrew:"
    echo "  brew install postgresql@16"
    echo "  brew services start postgresql@16"
    exit 1
fi

echo "✅ PostgreSQL found"

# Check if PostgreSQL is running
if ! pg_isready &> /dev/null; then
    echo "⚠️  PostgreSQL is not running"
    echo ""
    echo "Start PostgreSQL with:"
    echo "  brew services start postgresql@16"
    echo ""
    echo "Or if installed differently, start your PostgreSQL service"
    exit 1
fi

echo "✅ PostgreSQL is running"
echo ""

# Create database
echo "Creating database '$DB_NAME'..."
if psql -lqt | cut -d \| -f 1 | grep -qw "$DB_NAME"; then
    echo "⚠️  Database '$DB_NAME' already exists"
    read -p "Do you want to drop and recreate it? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        dropdb "$DB_NAME"
        echo "🗑️  Dropped existing database"
        createdb "$DB_NAME"
        echo "✅ Database '$DB_NAME' created"
    else
        echo "Keeping existing database"
    fi
else
    createdb "$DB_NAME"
    echo "✅ Database '$DB_NAME' created"
fi

echo ""
echo "📝 Database connection details:"
echo "   Host: localhost"
echo "   Port: 5432"
echo "   Database: $DB_NAME"
echo "   User: $DB_USER"
echo ""
echo "🔐 Update your .env file with:"
echo "   DATABASE_URL=postgresql://$DB_USER@localhost:5432/$DB_NAME"
echo ""
echo "✅ Database setup complete!"
echo ""
echo "Next steps:"
echo "  1. cp .env.example .env"
echo "  2. Update DATABASE_URL in .env with the connection string above"
echo "  3. Add your PRIVY_APP_ID and PRIVY_APP_SECRET"
echo "  4. Generate JWT_SECRET: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\""
echo "  5. npm run start:dev"
