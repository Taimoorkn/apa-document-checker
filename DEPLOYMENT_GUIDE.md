# Deployment Guide: Single Server Setup (0-500 Users)

## Overview

This guide covers deploying the APA Document Checker application for small to medium traffic (0-500 concurrent users) using a cost-effective single server architecture.

**Architecture:**

- **Frontend**: Next.js on Vercel (Free Tier)
- **Backend**: Express + Worker Threads on Railway ($5-10/month)
- **Database & Storage**: Supabase Cloud ($25/month)
- **Total Cost**: ~$30-35/month

**Estimated Traffic Capacity:**

- 500 concurrent users
- 4 worker threads for document processing
- 50GB storage
- Unlimited bandwidth (Vercel)

---

## Prerequisites

Before starting, ensure you have:

- [x] GitHub account (for code repository)
- [x] Vercel account (sign up at https://vercel.com)
- [x] Railway account (sign up at https://railway.app)
- [x] Supabase account (sign up at https://supabase.com)
- [x] Git installed locally
- [x] Node.js 20.x installed locally

---

## Step 1: Supabase Setup (Database & Storage)

### 1.1 Create Supabase Project

1. Go to https://supabase.com/dashboard
2. Click **"New Project"**
3. Fill in project details:
   - **Name**: `apa-document-checker`
   - **Database Password**: Generate a strong password (save this!)
   - **Region**: Choose closest to your users (e.g., `us-east-1`)
   - **Pricing Plan**: Select **Pro** ($25/month for 8GB database + 100GB storage)
4. Click **"Create new project"**
5. Wait 2-3 minutes for provisioning

### 1.2 Run Database Schema

1. In your Supabase project, navigate to **SQL Editor** (left sidebar)
2. Click **"New Query"**
3. Copy the entire contents of `supabase-schema.sql` from your repository
4. Paste into the SQL editor
5. Click **"Run"** (or press Ctrl+Enter)
6. Verify success: You should see "Success. No rows returned"

### 1.3 Configure Storage Bucket

1. Navigate to **Storage** (left sidebar)
2. Click **"Create a new bucket"**
3. Configure bucket:
   - **Name**: `user-documents`
   - **Public bucket**: Toggle **OFF** (private)
   - **File size limit**: `52428800` (50MB)
   - **Allowed MIME types**: `application/vnd.openxmlformats-officedocument.wordprocessingml.document`
4. Click **"Create bucket"**

### 1.4 Get Supabase Credentials

1. Navigate to **Settings** → **API** (left sidebar)
2. Copy and save these values:

   - **Project URL**: `https://your-project.supabase.co`
   - **anon/public key**: `eyJhbGci...` (long JWT token)

3. Navigate to **Settings** → **Database** → **Connection string**
4. Under **Connection pooling**, copy the **URI** (we'll use this later)

5. Navigate to **Settings** → **API** → **Service Role Key**
6. Click **"Reveal"** and copy the service role key
   - ⚠️ **WARNING**: This is a secret key with admin privileges. NEVER expose it in frontend code!

**Save these credentials** - you'll need them for environment variables:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci... (anon key)
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci... (service role key - keep secret!)
```

### 1.5 Verify Setup

1. Navigate to **Table Editor** (left sidebar)
2. You should see two tables: `documents` and `analysis_results`
3. Navigate to **Storage** → `user-documents`
4. Bucket should be empty and ready

---

## Step 2: Prepare Repository

### 2.1 Create GitHub Repository

1. Go to https://github.com/new
2. Create a new repository:
   - **Name**: `apa-document-checker`
   - **Visibility**: Private (recommended) or Public
   - **Initialize**: Do NOT add README, .gitignore, or license (we already have these)
3. Click **"Create repository"**

### 2.2 Push Code to GitHub

```bash
# Navigate to your project directory
cd C:\Users\Taimoor\Documents\GitHub\apa-document-checker

# Initialize git if not already done
git init

# Add remote repository
git remote add origin https://github.com/YOUR_USERNAME/apa-document-checker.git

# Add all files
git add .

# Commit
git commit -m "Initial commit - Production ready"

# Push to GitHub
git push -u origin main
```

### 2.3 Create Production Environment File

Create a `.env.production` file (DO NOT commit this to git):

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# API Configuration (will be updated after Railway deployment)
NEXT_PUBLIC_API_URL=https://your-app.up.railway.app

# Worker Pool Configuration
WORKER_POOL_SIZE=4
MAX_PROCESSING_TIME=60000

# Server Configuration
PORT=3001
NODE_ENV=production
```

---

## Step 3: Deploy Backend to Railway

### 3.1 Create Railway Account & Connect GitHub

1. Go to https://railway.app
2. Click **"Login"** → **"Login with GitHub"**
3. Authorize Railway to access your repositories
4. Complete the onboarding (select your use case, etc.)

### 3.2 Create New Project

1. From Railway dashboard, click **"New Project"**
2. Select **"Deploy from GitHub repo"**
3. If this is your first time:
   - Click **"Configure GitHub App"**
   - Select which repositories Railway can access (select `apa-document-checker`)
   - Click **"Install & Authorize"**
4. Find and select `apa-document-checker` repository

### 3.3 Configure Service

Railway will auto-detect your Node.js app. Configure the deployment:

1. **Service name**: Railway auto-generates one, or click to rename to `apa-api`

2. **Settings** tab (click ⚙️ gear icon):
   - **Branch**: `main` (should be auto-selected)
   - **Root Directory**: `/` (leave as root)
   - **Build Command**: Railway auto-detects from `package.json` (`npm install`)
   - **Start Command**: Railway auto-detects (`node server/index.js`)

3. **Variables** tab (click 🔧 icon):
   Click **"New Variable"** and add these one by one:

   | Variable Name               | Value                              |
   | --------------------------- | ---------------------------------- |
   | `NODE_ENV`                  | `production`                       |
   | `PORT`                      | `3001`                             |
   | `NEXT_PUBLIC_SUPABASE_URL`  | `https://your-project.supabase.co` |
   | `SUPABASE_SERVICE_ROLE_KEY` | `your-service-role-key`            |
   | `WORKER_POOL_SIZE`          | `4`                                |
   | `MAX_PROCESSING_TIME`       | `60000`                            |

   💡 **TIP**: You can also use **"RAW Editor"** to paste all variables at once in `KEY=VALUE` format

4. **Networking** tab:
   - Railway automatically assigns a public domain
   - Click **"Generate Domain"** to get your public URL
   - Your URL will look like: `https://apa-document-checker-api-production.up.railway.app`

### 3.4 Create Health Check Endpoint

Before deploying, add a health check endpoint to `server/index.js`:

```javascript
// Add this route BEFORE app.listen()
app.get("/api/health", (req, res) => {
  const stats = workerPool ? workerPool.getStats() : null;
  res.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    workerPool: stats
      ? {
          enabled: true,
          poolSize: stats.poolSize,
          availableWorkers: stats.availableWorkers,
          busyWorkers: stats.busyWorkers,
        }
      : {
          enabled: false,
        },
  });
});
```

Commit and push this change:

```bash
git add server/index.js
git commit -m "Add health check endpoint for Railway"
git push origin main
```

### 3.5 Deploy

Railway automatically deploys on push! The deployment will:

1. Detect the push to `main` branch
2. Clone your repository
3. Run `npm install`
4. Start the server with `node server/index.js`
5. Make it available at your Railway URL

**Monitor deployment:**
- Go to **Deployments** tab in Railway dashboard
- Click on the active deployment to see real-time logs
- Wait for "Server started successfully on port 3001" message
- Deployment typically takes 2-3 minutes

### 3.6 Verify Backend Deployment

1. Once deployed (green checkmark), test the health check:

   ```
   https://your-app.up.railway.app/api/health
   ```

2. You should see:

   ```json
   {
     "status": "healthy",
     "timestamp": "2025-10-01T12:00:00.000Z",
     "environment": "production",
     "workerPool": {
       "enabled": true,
       "poolSize": 4,
       "availableWorkers": 4,
       "busyWorkers": 0
     }
   }
   ```

3. Test worker stats endpoint:
   ```
   https://your-app.up.railway.app/api/worker-stats
   ```

**Copy your Railway URL** (you'll need it for Vercel): `https://your-app.up.railway.app`

### 3.7 Set Up Custom Domain (Optional)

1. In Railway → **Settings** → **Domains**
2. Click **"Custom Domain"**
3. Enter your domain (e.g., `api.apachecker.com`)
4. Follow DNS configuration instructions
5. Railway automatically provisions SSL certificate

---

## Step 4: Deploy Frontend to Vercel

### 4.1 Create Vercel Account

1. Go to https://vercel.com/signup
2. Sign up with GitHub (easiest option)
3. Authorize Vercel to access your repositories

### 4.2 Import Project

1. From Vercel dashboard, click **"Add New..."** → **"Project"**
2. Find and select `apa-document-checker` repository
3. Click **"Import"**

### 4.3 Configure Project

**Framework Preset:**

- Vercel should auto-detect **Next.js** ✅

**Build Settings:**

- **Build Command**: `npm run build` (default)
- **Output Directory**: `.next` (default)
- **Install Command**: `npm install` (default)

**Root Directory:**

- Leave as `/` (root)

### 4.4 Environment Variables

Click **"Environment Variables"** and add these:

| Name                            | Value                                                     | Environment                      |
| ------------------------------- | --------------------------------------------------------- | -------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`      | `https://your-project.supabase.co`                        | Production, Preview, Development |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `your-anon-key`                                           | Production, Preview, Development |
| `NEXT_PUBLIC_API_URL`           | `https://your-app.up.railway.app` | Production, Preview, Development |

⚠️ **IMPORTANT**:

- Do NOT add `SUPABASE_SERVICE_ROLE_KEY` to Vercel (it's only for backend)
- All variables prefixed with `NEXT_PUBLIC_` are safe to expose to the browser
- The `NEXT_PUBLIC_API_URL` should point to your Railway backend URL

### 4.5 Deploy

1. Click **"Deploy"**
2. Vercel will:

   - Clone repository
   - Install dependencies
   - Build Next.js app
   - Deploy to global CDN
   - Assign URL: `https://apa-document-checker.vercel.app`

3. Monitor deployment in real-time
4. Wait for "Build Completed" message (~2-3 minutes)

### 4.6 Configure Custom Domain (Optional)

1. In Vercel project settings, go to **"Domains"**
2. Add your custom domain (e.g., `apachecker.com`)
3. Follow DNS configuration instructions
4. Vercel automatically provisions SSL certificate

### 4.7 Verify Frontend Deployment

1. Visit your Vercel URL: `https://apa-document-checker.vercel.app`
2. You should see the home page
3. Test authentication:

   - Click **"Sign Up"** → Create account
   - You should be redirected to `/dashboard`
   - Check Supabase → **Authentication** → **Users** - you should see your new user

4. Test document upload:
   - Upload a `.docx` file
   - Check browser console - should see no errors
   - Check Railway logs - should see processing activity
   - Check Supabase → **Storage** → `user-documents` - file should appear

---

## Step 5: Post-Deployment Configuration

### 5.1 Update Supabase Site URL

1. Go to Supabase project → **Settings** → **Authentication**
2. Under **Site URL**, update to your Vercel URL:
   ```
   https://apa-document-checker.vercel.app
   ```
3. Under **Redirect URLs**, add:
   ```
   https://apa-document-checker.vercel.app/auth/callback
   https://apa-document-checker.vercel.app/dashboard
   ```

### 5.2 Configure CORS (If Needed)

If you encounter CORS errors, update `server/index.js`:

```javascript
const cors = require("cors");

app.use(
  cors({
    origin: [
      "https://apa-document-checker.vercel.app",
      "http://localhost:3000", // For local development
    ],
    credentials: true,
  })
);
```

Commit and push:

```bash
git add server/index.js
git commit -m "Update CORS configuration for production"
git push origin main
```

Railway will automatically redeploy.

### 5.3 Railway Auto-Deploy (Already Enabled)

Railway automatically deploys on every push to `main` branch by default.

**To verify:**
1. In Railway dashboard → Your service → **Settings**
2. Under **Source**, you should see **"Deploy on push"** enabled
3. Every push to `main` branch triggers a new deployment automatically

### 5.4 Set Up Monitoring

**Railway Monitoring:**

1. In Railway → Your service → **Metrics**
2. Monitor:
   - CPU usage (should be <80%)
   - Memory usage (should be <512MB)
   - Network bandwidth
   - Active deployments

**Vercel Monitoring:**

1. In Vercel → Your project → **Analytics**
2. Monitor:
   - Page load times
   - Core Web Vitals
   - Error tracking

**Supabase Monitoring:**

1. In Supabase → **Reports**
2. Monitor:
   - Database size
   - Storage usage
   - API requests
   - Active connections

---

## Step 6: Testing Production Deployment

### 6.1 End-to-End User Flow Test

1. **Visit homepage**: `https://apa-document-checker.vercel.app`

   - ✅ Should load without errors
   - ✅ Should show "APA Document Checker" title

2. **Sign up**:

   - Click "Sign Up"
   - Enter email and password
   - ✅ Should redirect to `/dashboard`
   - ✅ Verify user appears in Supabase → Authentication → Users

3. **Upload document**:

   - Drag and drop a `.docx` file or click to upload
   - ✅ File should upload to Supabase Storage
   - ✅ Document record should appear in dashboard
   - ✅ Status should change: uploaded → processing → completed

4. **View document**:

   - Click "View" on completed document
   - ✅ Should navigate to `/document/{id}`
   - ✅ Document should load in editor
   - ✅ Compliance score should display
   - ✅ Issues should appear in right panel

5. **Test concurrent users** (optional):
   - Open 2-3 browser tabs
   - Upload documents simultaneously
   - ✅ All should process without blocking each other
   - ✅ Check Railway logs for Worker Pool activity

### 6.2 Check Logs

**Railway Logs:**

```
✅ WorkerPool initialized with 4 workers
✅ Server started successfully on port 3001
🔐 Authenticated user: [user-id]
📥 Processing document from Supabase Storage
🔄 Sending job to Worker Pool for document [doc-id]
📥 Worker received job [job-id] (type: upload)
✅ Worker completed job [job-id] in 2345ms
🧠 Running APA compliance analysis...
✅ Analysis complete: 5 issues found, compliance score: 78%
```

**Vercel Logs:**

```
✓ Compiled successfully
✓ Middleware executed
✓ Page rendered: /dashboard
✓ API route called: /document/[id]
```

### 6.3 Performance Benchmarks

Expected performance on Starter plan:

- **Document upload**: <2 seconds
- **Document processing**: 3-8 seconds (depends on document size)
- **Page load time**: <1.5 seconds
- **Concurrent processing**: 4 simultaneous documents

---

## Step 7: Scaling & Optimization

### 7.1 When to Upgrade

**Upgrade Railway resources if:**

- CPU usage consistently >80%
- Memory usage consistently >512MB
- Processing queue often has >4 documents waiting
- You have >200 concurrent users

**Railway Pricing:**
- Usage-based billing (pay for what you use)
- ~$5-10/month for starter apps
- Scale up resources as needed:
  - More CPU cores
  - More RAM (up to 32GB)
  - Can increase `WORKER_POOL_SIZE` to 8+

### 7.2 When to Upgrade Supabase

**Upgrade to Team ($599/month) if:**

- Database size >8GB
- Storage >100GB
- > 500 concurrent connections
- Need advanced features (point-in-time recovery, etc.)

### 7.3 Optimization Tips

1. **Enable Vercel Edge Functions** for faster API routes
2. **Implement caching** for document results
3. **Compress documents** before storage
4. **Add CDN caching** for static assets
5. **Monitor and optimize** database queries

---

## Troubleshooting

### Issue: Backend shows "Worker Pool disabled"

**Cause**: Serverless environment detected

**Solution**:

1. Check Railway environment variables
2. Ensure `VERCEL` env var is NOT set
3. Redeploy Railway service

### Issue: CORS errors in browser console

**Cause**: Vercel URL not allowed in backend CORS config

**Solution**:

```javascript
// server/index.js
app.use(
  cors({
    origin: "https://apa-document-checker.vercel.app",
    credentials: true,
  })
);
```

### Issue: "Document not found" errors

**Cause**: RLS policies blocking access

**Solution**:

1. Check Supabase SQL Editor
2. Verify RLS policies are correctly configured
3. Test query manually:
   ```sql
   SELECT * FROM documents WHERE user_id = 'your-user-id';
   ```

### Issue: Worker timeout errors

**Cause**: Document processing taking >60 seconds

**Solution**:

1. Increase `MAX_PROCESSING_TIME` env var to `120000` in Railway
2. Redeploy service
3. Consider scaling up Railway resources (more CPU/RAM)

### Issue: "Invalid or expired token" on /api/process-document

**Cause**: JWT token verification failing

**Solution**:

1. Check that `SUPABASE_SERVICE_ROLE_KEY` is correctly set in Railway
2. Verify frontend sends `Authorization: Bearer {token}` header
3. Check Supabase project URL matches exactly

---

## Maintenance & Updates

### Deploying Updates

1. **Make code changes locally**
2. **Test locally**:
   ```bash
   npm run dev
   npm run server
   ```
3. **Commit and push**:
   ```bash
   git add .
   git commit -m "Description of changes"
   git push origin main
   ```
4. **Automatic deployment**:
   - Vercel redeploys frontend automatically
   - Railway redeploys backend automatically

### Monitoring Checklist (Weekly)

- [ ] Check Railway service health
- [ ] Review error logs in Railway
- [ ] Check Supabase database size
- [ ] Review storage usage
- [ ] Check billing for all services (Railway usage dashboard)
- [ ] Test critical user flows

### Backup Strategy

**Supabase Automatic Backups:**

- Pro plan includes daily backups (7 day retention)
- Point-in-time recovery available

**Manual Backup:**

```bash
# Backup database
pg_dump -h db.your-project.supabase.co -U postgres your_db > backup.sql

# Backup storage (use Supabase CLI)
supabase storage download user-documents --all
```

---

## Cost Breakdown

| Service      | Plan             | Monthly Cost     |
| ------------ | ---------------- | ---------------- |
| **Vercel**   | Hobby (Free)     | $0               |
| **Railway**  | Usage-based      | $5-10            |
| **Supabase** | Pro              | $25              |
| **Total**    |                  | **$30-35/month** |

**Included in Plans:**

- **Vercel**: 100GB bandwidth, unlimited deployments, SSL, edge network
- **Railway**: 512MB RAM, 1 vCPU, 1GB disk, SSL, auto-deploy, usage-based scaling
- **Supabase**: 8GB database, 100GB storage, daily backups, 50GB bandwidth

**Railway Pricing Details:**
- $5 minimum subscription (includes $5 credit)
- Usage calculated per second (CPU, RAM, Network)
- Typical cost for this app: $5-10/month
- View real-time usage in Railway dashboard

---

## Security Checklist

- [x] Environment variables stored securely (not in code)
- [x] Service role key never exposed to frontend
- [x] RLS policies enabled on all tables
- [x] JWT token verification on backend
- [x] CORS configured properly
- [x] HTTPS enforced on all services
- [x] File upload validation (type, size)
- [x] User authentication required for all document operations
- [x] Storage bucket is private (not public)

---

## Support Resources

**Vercel:**

- Documentation: https://vercel.com/docs
- Community: https://github.com/vercel/next.js/discussions

**Railway:**

- Documentation: https://docs.railway.app
- Discord: https://discord.gg/railway
- Help Center: https://help.railway.app

**Supabase:**

- Documentation: https://supabase.com/docs
- Discord: https://discord.supabase.com

**Project Repository:**

- Issues: https://github.com/YOUR_USERNAME/apa-document-checker/issues
- Discussions: https://github.com/YOUR_USERNAME/apa-document-checker/discussions

---

## Next Steps After Deployment

1. **Set up custom domain** on Vercel
2. **Configure email templates** in Supabase Auth
3. **Add analytics** (Google Analytics, Plausible, etc.)
4. **Set up error tracking** (Sentry, LogRocket)
5. **Create monitoring alerts** for service downtime
6. **Document user guides** for end users
7. **Plan scaling strategy** for growth

---

**Deployment Complete!** 🎉

Your APA Document Checker is now live and ready to serve users at:

- **Frontend**: `https://apa-document-checker.vercel.app`
- **Backend API**: `https://your-app.up.railway.app`
- **Database**: Supabase Cloud

For questions or issues, refer to the Troubleshooting section or create an issue in your GitHub repository.
