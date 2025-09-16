#!/bin/bash

echo "🚀 Preparing Michelin Star Hunter for Render deployment..."

# Test builds
echo "🔧 Testing production builds..."
cd backend && npm run build
cd ../frontend && npm run build
cd ..

echo "✅ Production builds successful!"

# Initialize git if not already done
if [ ! -d ".git" ]; then
    echo "📝 Initializing Git repository..."
    git init
fi

# Add all files
echo "📦 Adding files to Git..."
git add .

# Check if there are changes to commit
if git diff --staged --quiet; then
    echo "ℹ️  No changes to commit"
else
    echo "💾 Creating commit..."
    git commit -m "Prepare for Render deployment

- Add Render configuration files
- Add build scripts for production
- Add environment configuration
- Add deployment documentation"
fi

echo ""
echo "🎉 Ready for Render deployment!"
echo ""
echo "📋 Next steps:"
echo "1. Push to GitHub:"
echo "   git remote add origin https://github.com/YOUR_USERNAME/michelin-star-hunter.git"
echo "   git push -u origin main"
echo ""
echo "2. Follow the guide in RENDER_DEPLOYMENT.md"
echo ""
echo "3. Your live app will be at:"
echo "   https://michelin-star-hunter-frontend.onrender.com"
echo ""
echo "🍽️ Happy Michelin star hunting!"