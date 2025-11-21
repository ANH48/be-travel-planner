# Railway.app Deployment Guide

## Why Railway?

Railway.app is the **RECOMMENDED** platform for this NestJS backend because:

- ✅ **$5 trial credit** - Deploy immediately for free
- ✅ **8GB build RAM** - More than enough for NestJS + Prisma
- ✅ **Automatic deployments** from GitHub
- ✅ **Built-in PostgreSQL** (optional, you're using Prisma Accelerate)
- ✅ **Simple environment variable management**
- ✅ **After trial: ~$5-10/month** for this app size

## Step-by-Step Deployment

### 1. Create Railway Account

1. Go to [railway.app](https://railway.app)
2. Sign up with GitHub (it will access your repositories)
3. You'll get **$5 trial credit** automatically

### 2. Deploy from GitHub

1. Click **"New Project"**
2. Select **"Deploy from GitHub repo"**
3. Choose **`ANH48/be-travel-planner`**
4. Railway will auto-detect it's a Node.js project

### 3. Configure Build Settings

Railway should auto-detect these, but verify in **Settings → Build**:

- **Build Command**: `npm run build:prod`
- **Start Command**: `npm run start:prod`
- **Install Command**: `npm install` (default is fine)

### 4. Set Environment Variables

Go to **Variables** tab and add these:

#### Required Variables

```bash
# Database (Prisma Accelerate)
DATABASE_URL=your_prisma_accelerate_connection_string

# JWT Authentication
JWT_SECRET=your-super-secret-jwt-key-change-this
JWT_EXPIRES_IN=7d

# Frontend URL (for CORS)
FRONTEND_URL=https://your-frontend-domain.vercel.app

# Email Configuration (Gmail SMTP)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-gmail@gmail.com
EMAIL_PASS=your-app-specific-password
EMAIL_FROM=your-gmail@gmail.com

# Node Environment
NODE_ENV=production
```

#### Optional Variables (if using Firebase)

```bash
FIREBASE_DATABASE_URL=https://your-project.firebaseio.com
FIREBASE_SERVICE_ACCOUNT={"type":"service_account","project_id":"..."}
```

**Note**: For `FIREBASE_SERVICE_ACCOUNT`, copy the entire JSON content from your Firebase credentials file and paste it as a single-line string.

### 5. Deploy!

1. Click **"Deploy"** or push to `main` branch
2. Railway will:
   - Clone your repo
   - Install dependencies (with 8GB RAM - no memory issues!)
   - Run Prisma generate
   - Build TypeScript
   - Start your app

3. Check the **Deployment Logs** tab to monitor progress

### 6. Get Your App URL

1. Go to **Settings → Networking**
2. Click **"Generate Domain"**
3. Railway will give you a URL like: `https://be-travel-planner-production.up.railway.app`
4. **Copy this URL** - you'll need it for frontend configuration

### 7. Update Frontend Configuration

In your frontend (`travel-planner-fe`):

1. Update `.env.local`:
   ```bash
   NEXT_PUBLIC_API_URL=https://be-travel-planner-production.up.railway.app
   ```

2. If deployed on Vercel, update environment variables there too

3. Redeploy frontend

## Automatic Deployments

Railway automatically deploys when you push to `main`:

```bash
git add .
git commit -m "Your changes"
git push origin main
```

Railway will detect the push and redeploy automatically!

## Monitoring

### View Logs
- Go to **Deployments** → Select latest deployment → **View Logs**
- Real-time logs show all console output

### Metrics
- **Metrics** tab shows:
  - Memory usage
  - CPU usage
  - Network traffic

### Health Check
- Test your API: `https://your-app.up.railway.app/api/health` (if you have a health endpoint)

## Cost Breakdown

### Trial
- **$5 free credit** - Lasts 1-2 months for a small app
- Monitor usage in **Account → Usage**

### After Trial (~$5-10/month)
- **Memory**: ~$0.000231/GB/min → ~$5/month for 512MB
- **CPU**: ~$0.000463/vCPU/min → ~$2/month for 0.5 vCPU
- **Network**: First 100GB free

**Estimate for this app**: $5-10/month depending on traffic

## Troubleshooting

### Build Fails
- Check **Build Logs** in deployment details
- Verify `package.json` scripts are correct
- Ensure all environment variables are set

### App Crashes on Start
- Check **Deploy Logs** 
- Common issues:
  - Missing `DATABASE_URL`
  - Invalid Prisma connection string
  - Missing environment variables

### Database Connection Issues
- Verify `DATABASE_URL` is correct Prisma Accelerate URL
- Check Prisma Accelerate connection limits

### Email Not Sending
- Verify Gmail SMTP credentials
- Check if "App Password" is used (not regular password)
- Ensure `EMAIL_*` variables are set correctly

## Rolling Back

If a deployment breaks:

1. Go to **Deployments**
2. Find a working previous deployment
3. Click **"Redeploy"** on that version

## Custom Domain (Optional)

1. Go to **Settings → Networking**
2. Click **"Custom Domain"**
3. Add your domain (e.g., `api.yourdomain.com`)
4. Update DNS records as shown by Railway

## Firebase Push Notifications Setup

If you need Firebase Admin SDK:

### Option 1: Environment Variable (Recommended)
Set `FIREBASE_SERVICE_ACCOUNT` with the JSON content:

```bash
FIREBASE_SERVICE_ACCOUNT={"type":"service_account","project_id":"..."}
FIREBASE_DATABASE_URL=https://your-project.firebaseio.com
```

### Option 2: Install After Deploy
Railway doesn't need this - use environment variable approach above.

## Alternative: Docker Deployment on Railway

Railway supports Docker! If you prefer:

1. Railway will auto-detect `Dockerfile`
2. Build and deploy using Docker instead of Node buildpacks
3. Same environment variables apply

## Comparison: Railway vs Render

| Feature | Railway | Render Free Tier |
|---------|---------|------------------|
| Build RAM | **8GB** ✅ | 512MB ❌ |
| Build Success | **Yes** ✅ | **No** ❌ |
| Trial Credit | $5 | No trial |
| Auto-deploy | Yes | Yes |
| Custom domains | Yes | Yes |
| Cost after trial | $5-10/month | Free (but can't build) |

## Need Help?

- Railway docs: https://docs.railway.app
- Railway Discord: https://discord.gg/railway
- Check deployment logs first - they're very detailed!

## Summary

1. Sign up at railway.app (free $5 credit)
2. Deploy from GitHub repo `ANH48/be-travel-planner`
3. Add environment variables
4. Get generated URL
5. Update frontend with new backend URL
6. Done! 🎉

**Estimated time**: 10-15 minutes for first deployment
