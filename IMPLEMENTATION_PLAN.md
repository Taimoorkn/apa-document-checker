# Implementation Plan: Multi-User Architecture with Worker Threads & Supabase

## Current State Analysis

### Existing Structure
- **Node.js Version**: v20.11.0 ✅ (Worker Threads supported since v10.5.0)
- **Server**: Express 4.21.2 running on port 3001
- **Frontend**: Next.js 15.5.0 on port 3000
- **Current Dependencies**: All necessary packages already installed
- **Server Structure**:
  - `server/index.js` - Main Express server
  - `server/routes/docx.js` - Document processing routes
  - `server/processors/XmlDocxProcessor.js` - XML/DOCX processing
  - `server/processors/DocxModifier.js` - DOCX modification for fixes
  - `server/utils/` - Empty directory (available for new utilities)

### Current Flow (Single-User, Blocking)
```
User uploads → Express receives → XmlDocxProcessor runs synchronously → Returns result
(If User B uploads during processing, their request waits)
```

### Target Flow (Multi-User, Non-Blocking)
```
User A uploads → Express assigns to Worker 1 → Processes independently
User B uploads → Express assigns to Worker 2 → Processes independently
User C uploads → Express assigns to Worker 3 → Processes independently
User D uploads → Express assigns to Worker 4 → Processes independently
User E uploads → Express queues job → Assigns when worker available
```

---be

## Implementation Phases

### Phase 1: Worker Thread Infrastructure (Week 1)
**Goal**: Enable concurrent document processing without blocking the main thread

#### Step 1.1: Create Worker Pool Manager
**File**: `server/workers/WorkerPool.js`

**Requirements**:
- Maintain pool of 4-8 worker threads (configurable via environment variable)
- Queue incoming jobs when all workers busy
- Assign jobs to available workers using round-robin or least-busy strategy
- Handle worker crashes and automatic restart
- Timeout handling (max 60 seconds per job)
- Cleanup mechanism for completed jobs

**Implementation Details**:
```
WorkerPool Class:
├── constructor(poolSize, workerScript)
│   └── Initialize worker threads array
├── executeJob(jobData)
│   ├── Check for available worker
│   ├── If available: assign job
│   └── If busy: add to queue
├── _assignToWorker(worker, jobData)
│   └── Send message to worker thread
├── _handleWorkerMessage(worker, message)
│   └── Process result, free worker, check queue
├── _handleWorkerError(worker, error)
│   └── Log error, restart worker, reassign job
└── shutdown()
    └── Gracefully terminate all workers
```

**Dependencies**: Built-in `worker_threads` module (no new packages needed)

---

#### Step 1.2: Create Document Processor Worker
**File**: `server/workers/documentProcessor.worker.js`

**Requirements**:
- Import and execute XmlDocxProcessor logic
- Import and execute DocxModifier logic
- Receive job data via parentPort.on('message')
- Send results via parentPort.postMessage()
- Handle errors and send error messages back
- Isolate each processing job (no shared state)

**Implementation Details**:
```
Worker Script Structure:
1. Import required modules (XmlDocxProcessor, DocxModifier)
2. Listen for messages from main thread
3. On message received:
   ├── Extract job type (upload | fix)
   ├── If upload:
   │   ├── Run XmlDocxProcessor.processDocument()
   │   └── Return document data
   └── If fix:
       ├── Run DocxModifier.applyFormattingFix()
       └── Return modified document
4. Send result back to main thread
5. Handle errors and send error response
```

**Data Format**:
```javascript
// Input message
{
  jobId: 'uuid',
  type: 'upload' | 'fix',
  data: {
    buffer: Buffer,
    filename: String,
    // For fix jobs:
    fixAction: String,
    fixValue: Object
  }
}

// Output message
{
  jobId: 'uuid',
  success: Boolean,
  result: Object | null,
  error: String | null,
  processingTime: Number
}
```

---

#### Step 1.3: Update Server Routes to Use Worker Pool
**File**: `server/routes/docx.js`

**Changes Required**:
1. Import WorkerPool at top of file
2. Initialize pool once: `const workerPool = new WorkerPool(4, './workers/documentProcessor.worker.js')`
3. Modify POST /api/upload-docx handler:
   - Instead of calling XmlDocxProcessor directly, send job to pool
   - Wait for result via Promise
   - Return result to client
4. Modify POST /api/apply-fix handler:
   - Send fix job to worker pool
   - Wait for result
   - Return to client

**Before**:
```javascript
const result = await XmlDocxProcessor.processDocument(buffer);
```

**After**:
```javascript
const result = await workerPool.executeJob({
  type: 'upload',
  data: { buffer, filename }
});
```

---

#### Step 1.4: Testing Worker Thread Implementation
**Tests to Run**:
1. Single upload works correctly
2. Concurrent uploads (4 simultaneous) process independently
3. Queue handling (8 simultaneous uploads with 4 workers)
4. Worker crash recovery (force kill worker during processing)
5. Timeout handling (simulate slow processing)
6. Memory isolation (verify no shared state between workers)

**Success Criteria**:
- 4 concurrent users process simultaneously (verify via console logs with timestamps)
- No blocking of HTTP server (health endpoint responds immediately even during heavy processing)
- Error handling works (crashed workers restart, jobs reassigned)
- Memory stable (no leaks after 100 sequential uploads)

---

### Phase 2: Supabase Integration (Week 2)

#### Step 2.1: Supabase Project Setup
**Prerequisites**:
- Create Supabase account
- Create new project: "apa-document-checker"
- Note project URL and anon key
- Install Supabase client library: `npm install @supabase/supabase-js @supabase/ssr`

**Database Schema**:

**Table: users** (handled by Supabase Auth, no manual creation needed)
```sql
-- Supabase Auth creates this automatically
id UUID PRIMARY KEY
email TEXT UNIQUE
created_at TIMESTAMP
```

**Table: documents**
```sql
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('uploaded', 'processing', 'completed', 'failed')),
  uploaded_at TIMESTAMP DEFAULT NOW(),
  processed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_documents_user_id ON documents(user_id);
CREATE INDEX idx_documents_status ON documents(status);
```

**Table: analysis_results**
```sql
CREATE TABLE analysis_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
  compliance_score INTEGER,
  issue_count INTEGER,
  issues JSONB,
  document_data JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_analysis_results_document_id ON analysis_results(document_id);
```

**Row Level Security (RLS) Policies**:
```sql
-- Enable RLS on tables
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE analysis_results ENABLE ROW LEVEL SECURITY;

-- Users can only see their own documents
CREATE POLICY "Users can view own documents"
  ON documents FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own documents"
  ON documents FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own documents"
  ON documents FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can only see analysis for their documents
CREATE POLICY "Users can view own analysis"
  ON analysis_results FOR SELECT
  USING (
    document_id IN (
      SELECT id FROM documents WHERE user_id = auth.uid()
    )
  );
```

**Storage Bucket**: `user-documents`
```
Configuration:
- Public: No
- File size limit: 20MB
- Allowed MIME types: application/vnd.openxmlformats-officedocument.wordprocessingml.document
```

**Storage Policy**:
```sql
-- Users can upload to their own folder
CREATE POLICY "Users can upload own documents"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'user-documents' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- Users can download their own documents
CREATE POLICY "Users can download own documents"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'user-documents' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );
```

---

#### Step 2.2: Environment Variables Setup
**File**: `.env.local` (root directory)
```
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Server Configuration (for backend)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Worker Configuration
WORKER_POOL_SIZE=4
MAX_PROCESSING_TIME=60000
```

**File**: `server/.env` (server directory - separate for backend)
```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
WORKER_POOL_SIZE=4
```

---

#### Step 2.3: Create Supabase Client Utilities
**File**: `src/lib/supabase/client.js` (browser client)
```javascript
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
}
```

**File**: `src/lib/supabase/server.js` (server-side client for Next.js)
```javascript
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        get(name) {
          return cookieStore.get(name)?.value
        },
      },
    }
  )
}
```

**File**: `server/utils/supabaseClient.js` (Express backend client)
```javascript
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

module.exports = supabase
```

---

#### Step 2.4: Implement Authentication
**Files to Create**:
1. `src/app/login/page.js` - Login page
2. `src/app/signup/page.js` - Signup page
3. `src/app/auth/callback/route.js` - OAuth callback handler
4. `src/middleware.js` - Route protection

**Authentication Flow**:
```
1. User visits /login
2. Enters email/password
3. Supabase Auth validates credentials
4. Returns JWT token stored in cookie
5. Redirect to /dashboard
6. Middleware checks auth on protected routes
7. If not authenticated → redirect to /login
```

---

#### Step 2.5: Create Dashboard UI
**File**: `src/app/dashboard/page.js`

**Features**:
- Table of user's documents
- Columns: Filename, Upload Date, Status, Compliance Score, Actions
- "Upload New Document" button
- Search/filter documents
- Pagination (10 per page)
- Delete document functionality

**Data Flow**:
```
1. Page loads → Fetch user's documents from Supabase
2. Display in table with status indicators
3. Click "View" → Navigate to /document/[id]
4. Click "Delete" → Delete from Supabase (soft delete or hard delete)
```

---

### Phase 3: Upload Flow Integration (Week 3)

#### Step 3.1: Modify Upload Flow for Supabase Storage
**Current Flow**:
```
Client → Express (upload) → Process immediately → Return result
```

**New Flow**:
```
1. Client uploads DOCX to Supabase Storage directly
2. Client creates document record in DB (status: 'uploaded')
3. Client calls Express: POST /api/process-document { documentId }
4. Express downloads from Supabase Storage
5. Express processes via Worker Pool
6. Express writes results to analysis_results table
7. Express updates document status to 'completed'
8. Client polls DB for status change
9. Client fetches results and displays
```

---

#### Step 3.2: Update Header Component for Upload
**File**: `src/components/Header.js`

**Changes**:
1. Upload to Supabase Storage instead of Express
2. Show upload progress bar
3. Create document record in DB
4. Call Express for processing
5. Poll for completion
6. Load document when ready

---

#### Step 3.3: Create Document Viewer Page
**File**: `src/app/document/[id]/page.js`

**Features**:
- Fetch document and analysis from Supabase
- Load into DocumentModel (existing code)
- Render editor + issues panel (existing components)
- All existing functionality works unchanged

---

### Phase 4: Backend Processing Updates (Week 3 cont.)

#### Step 4.1: New API Route for Processing
**File**: `server/routes/docx.js`

**New Endpoint**: `POST /api/process-document`
```javascript
Request body: { documentId: UUID }

Flow:
1. Fetch document record from Supabase
2. Download DOCX from Supabase Storage
3. Update status to 'processing'
4. Send job to Worker Pool
5. Wait for result
6. Write to analysis_results table
7. Update document status to 'completed'
8. Return success response
```

---

### Phase 5: Testing & Deployment (Week 4)

#### Step 5.1: Local Testing Checklist
- [ ] User signup/login works
- [ ] Dashboard displays documents
- [ ] Upload to Supabase Storage succeeds
- [ ] Document processing via workers works
- [ ] Status polling updates UI
- [ ] Document viewer loads correctly
- [ ] All existing features work (editing, highlighting, fixes)
- [ ] Concurrent uploads (4+ simultaneous) work
- [ ] Error handling works (failed uploads, failed processing)

#### Step 5.2: Deployment Configuration

**Vercel (Frontend)**:
- Environment variables: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY
- Build command: `npm run build`
- Deploy: Connect GitHub repo, auto-deploy on push

**Render.com (Backend)**:
- Environment variables: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, WORKER_POOL_SIZE=4
- Build command: `npm install`
- Start command: `node server/index.js`
- Instance type: Starter ($7/month) or Standard ($12/month with 2GB RAM)

**Supabase**:
- Already configured and running
- Upgrade to Pro if needed ($25/month)

---

## Implementation Order (Sequential Steps)

### Day 1-2: Worker Thread Foundation
1. Create `server/workers/` directory
2. Implement `WorkerPool.js`
3. Implement `documentProcessor.worker.js`
4. Test basic worker execution

### Day 3-4: Integrate Workers with Routes
1. Update `server/routes/docx.js` to use WorkerPool
2. Test concurrent uploads locally
3. Verify no blocking behavior

### Day 5-7: Supabase Setup
1. Create Supabase project
2. Set up database schema
3. Configure storage bucket
4. Create environment variables
5. Install Supabase packages

### Day 8-10: Authentication
1. Create Supabase client utilities
2. Implement login/signup pages
3. Create middleware for route protection
4. Test authentication flow

### Day 11-14: Dashboard & Document Management
1. Create dashboard page
2. Implement document listing
3. Add upload to Supabase Storage
4. Create processing trigger

### Day 15-17: Backend Processing Pipeline
1. Update Express routes for Supabase integration
2. Implement download from Storage
3. Implement write to DB after processing
4. Test end-to-end flow

### Day 18-21: Document Viewer Integration
1. Create document viewer page
2. Fetch from Supabase and load into DocumentModel
3. Verify all existing features work
4. Test editing and fix application

### Day 22-24: Testing & Bug Fixes
1. Load testing with concurrent users
2. Error handling verification
3. Edge case testing
4. Performance optimization

### Day 25-28: Deployment
1. Deploy frontend to Vercel
2. Deploy backend to Render
3. Configure production environment variables
4. Production testing
5. Monitor and fix issues

---

## Rollback Plan

If anything breaks during implementation:

**Phase 1 (Workers) Rollback**:
- Remove WorkerPool imports
- Restore direct XmlDocxProcessor calls
- Everything works as before

**Phase 2-3 (Supabase) Rollback**:
- Remove Supabase dependencies
- Keep worker thread improvements
- Lose persistence but keep concurrency

**Phase 4 (Integration) Rollback**:
- Disable new upload flow
- Use original upload-to-Express flow
- Workers still improve performance

---

## Success Metrics

**Performance**:
- 4 concurrent uploads process simultaneously
- 5th upload queues and processes when worker free
- Average processing time: <15 seconds per document
- No blocking of HTTP server

**Functionality**:
- User authentication works
- Documents persist across sessions
- All existing features work unchanged
- Concurrent users don't interfere

**Scalability**:
- Can handle 100+ concurrent users
- Database performs well with 1000+ documents
- Storage handles 10GB+ files

---

## Risk Mitigation

**Risk**: Worker threads crash frequently
**Mitigation**: Implement robust error handling, worker restart, job reassignment

**Risk**: Supabase integration breaks existing features
**Mitigation**: Build alongside existing code, feature flag to toggle

**Risk**: Performance worse than before
**Mitigation**: Profile and optimize, add caching if needed

**Risk**: Deployment issues
**Mitigation**: Test locally first, deploy to staging environment, gradual rollout

---

## Notes for Implementation

- **No assumptions**: Read existing files before modifying
- **Verify imports**: Check exact function names and export formats
- **Test incrementally**: Each phase should work before moving to next
- **Preserve existing**: Don't break current functionality
- **Document changes**: Comment complex logic
- **Error handling**: Every worker message, every Supabase call
- **Logging**: Console.log at key points for debugging

---

## Current Status

✅ Plan created
⏳ Ready to begin implementation
