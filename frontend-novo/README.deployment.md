# Deployment Instructions for Northflank

## Important Files Created

1. **Dockerfile** - Main production-ready Dockerfile with optimized multi-stage build
2. **Dockerfile.simple** - Alternative simpler Dockerfile (use if main one doesn't work)
3. **.dockerignore** - Optimizes Docker build by excluding unnecessary files
4. **northflank.toml** - Configuration file for Northflank deployment
5. **next.config.ts** - Updated with standalone output mode for better Docker support

## Deployment Options

### Option 1: Using the Main Dockerfile (Recommended)
The main `Dockerfile` uses Next.js standalone mode for optimal performance and smaller image size.

### Option 2: Using the Simple Dockerfile
If you encounter issues with the main Dockerfile, rename `Dockerfile.simple` to `Dockerfile` and try again.

## Northflank Configuration

### Build Settings
- **Build type**: Dockerfile
- **Dockerfile path**: `/Dockerfile`
- **Context**: `/` (root directory)

### Environment Variables
Make sure to set these in Northflank:
- `PORT` - Will be automatically set by Northflank
- `NODE_ENV` - Set to `production`
- Any API URLs or secrets your app needs

### Port Configuration
The app is configured to listen on the PORT environment variable that Northflank provides.

## Testing Locally

```bash
# Build the Docker image
docker build -t frontend-next .

# Run the container
docker run -p 3000:3000 -e PORT=3000 frontend-next
```

## Troubleshooting

### If "next: not found" error persists:
1. Make sure `package-lock.json` is committed to your repository
2. Try using `Dockerfile.simple` instead
3. Check that Node.js version in Dockerfile matches your local development

### If build fails:
1. The ESLint and TypeScript errors are already configured to be ignored during production build
2. Check Northflank logs for specific error messages
3. Ensure all environment variables are properly set in Northflank

## Important Notes
- The app is configured to ignore ESLint and TypeScript errors during build (for quick deployment)
- Images are set to `unoptimized` for Docker deployment (you can configure a CDN later)
- The standalone output mode creates a minimal production build
