# Deployment Guide: Single Server Setup (0-500 Users)

## Overview

This guide covers deploying the APA Document Checker application for small to medium traffic (0-500 concurrent users) using a cost-effective single server architecture.

**Architecture:**

- **Frontend**: Next.js on Vercel (Free Tier)
- **Backend**: Express + Worker Threads on Render.com ($7/month)
- **Database & Storage**: Supabase Cloud ($25/month)
- **Total Cost**: ~$32/month

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
- [x] Render.com account (sign up at https://render.com)
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

# API Configuration (will be updated after Render deployment)
NEXT_PUBLIC_API_URL=https://your-app.onrender.com

# Worker Pool Configuration
WORKER_POOL_SIZE=4
MAX_PROCESSING_TIME=60000

# Server Configuration
PORT=3001
NODE_ENV=production
```

---

## Step 3: Deploy Backend to Render.com

### 3.1 Create Render Account & Connect GitHub

1. Go to https://render.com/register
2. Sign up with GitHub (easiest option)
3. Authorize Render to access your repositories

### 3.2 Create New Web Service

1. From Render dashboard, click **"New +"** → **"Web Service"**
2. Connect your repository:
   - If this is your first time, click **"Connect account"** and authorize GitHub
   - Find and select `apa-document-checker` repository
   - Click **"Connect"**

### 3.3 Configure Web Service

Fill in the configuration form:

**Basic Settings:**

- **Name**: `apa-document-checker-api` (this will be your subdomain)
- **Region**: Choose closest to your users (e.g., `Oregon (US West)`)
- **Branch**: `main`
- **Root Directory**: Leave blank
- **Runtime**: `Node`
- **Build Command**:
  ```bash
  npm install
  ```
- **Start Command**:
  ```bash
  node server/index.js
  ```

**Instance Type:**

- Select **"Starter"** ($7/month)
  - 0.5 CPU
  - 512 MB RAM
  - Sufficient for 4 worker threads

**Advanced Settings** (click "Advanced"):

**Environment Variables** - Add these one by one:

| Key                         | Value                              |
| --------------------------- | ---------------------------------- |
| `NODE_ENV`                  | `production`                       |
| `PORT`                      | `3001`                             |
| `NEXT_PUBLIC_SUPABASE_URL`  | `https://your-project.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | `your-service-role-key`            |
| `WORKER_POOL_SIZE`          | `4`                                |
| `MAX_PROCESSING_TIME`       | `60000`                            |

**Health Check Path:**

- Set to `/api/health` (we'll create this endpoint)

### 3.4 Create Health Check Endpoint

Before deploying, add a health check endpoint. Create or update `server/index.js`:

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
git commit -m "Add health check endpoint for Render"
git push origin main
```

### 3.5 Deploy

1. Click **"Create Web Service"**
2. Render will automatically:

   - Clone your repository
   - Run `npm install`
   - Start the server with `node server/index.js`
   - Assign a URL: `https://apa-document-checker-api.onrender.com`

3. Monitor deployment in the **Logs** tab
4. Wait for "Server started successfully on port 3001" message

### 3.6 Verify Backend Deployment

1. Once deployed, test the health check:

   ```
   https://your-app.onrender.com/api/health
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
   https://your-app.onrender.com/api/worker-stats
   ```

**Save your Render URL**: `https://apa-document-checker-api.onrender.com`

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

| Name                            | Value                                           | Environment                      |
| ------------------------------- | ----------------------------------------------- | -------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`      | `https://your-project.supabase.co`              | Production, Preview, Development |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `your-anon-key`                                 | Production, Preview, Development |
| `NEXT_PUBLIC_API_URL`           | `https://apa-document-checker-api.onrender.com` | Production, Preview, Development |

⚠️ **IMPORTANT**:

- Do NOT add `SUPABASE_SERVICE_ROLE_KEY` to Vercel (it's only for backend)
- All variables prefixed with `NEXT_PUBLIC_` are safe to expose to the browser
- The `NEXT_PUBLIC_API_URL` should point to your Render backend URL

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
   - Check Render logs - should see processing activity
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

Render will automatically redeploy.

### 5.3 Enable Render Auto-Deploy

1. In Render dashboard → Your service → **Settings**
2. Scroll to **Build & Deploy**
3. Ensure **"Auto-Deploy"** is set to **"Yes"**
4. This means every push to `main` branch triggers a new deployment

### 5.4 Set Up Monitoring

**Render Monitoring:**

1. In Render → Your service → **Metrics**
2. Monitor:
   - CPU usage (should be <80%)
   - Memory usage (should be <400MB)
   - Request latency
   - Error rate

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
   - ✅ Check Render logs for Worker Pool activity

### 6.2 Check Logs

**Render Logs:**

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

**Upgrade Render to Professional ($25/month) if:**

- CPU usage consistently >80%
- Memory usage consistently >400MB
- Processing queue often has >4 documents waiting
- You have >200 concurrent users

Professional plan provides:

- 1 CPU core
- 2 GB RAM
- Can increase `WORKER_POOL_SIZE` to 8

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

1. Check Render environment variables
2. Ensure `VERCEL` env var is NOT set
3. Restart Render service

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

1. Increase `MAX_PROCESSING_TIME` env var to `120000`
2. Restart Render service
3. Consider upgrading to Professional plan for more CPU

### Issue: "Invalid or expired token" on /api/process-document

**Cause**: JWT token verification failing

**Solution**:

1. Check that `SUPABASE_SERVICE_ROLE_KEY` is correctly set in Render
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
   - Render redeploys backend automatically

### Monitoring Checklist (Weekly)

- [ ] Check Render service health
- [ ] Review error logs in Render
- [ ] Check Supabase database size
- [ ] Review storage usage
- [ ] Check billing for all services
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

| Service      | Plan         | Monthly Cost  |
| ------------ | ------------ | ------------- |
| **Vercel**   | Hobby (Free) | $0            |
| **Render**   | Starter      | $7            |
| **Supabase** | Pro          | $25           |
| **Total**    |              | **$32/month** |

**Included in Free/Paid Tiers:**

- Vercel: 100GB bandwidth, unlimited deployments, SSL
- Render: 512MB RAM, persistent disk, SSL, auto-deploy
- Supabase: 8GB database, 100GB storage, daily backups

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

**Render:**

- Documentation: https://render.com/docs
- Support: support@render.com

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
- **Backend API**: `https://apa-document-checker-api.onrender.com`
- **Database**: Supabase Cloud

For questions or issues, refer to the Troubleshooting section or create an issue in your GitHub repository.
