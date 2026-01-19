# Tokens Required for Intelligence Service

I've gathered all the Railway service IDs. Now I need you to create two tokens:

## ✅ Service IDs (Already Found)
- **Backend Service ID**: `ea897fb5-77e9-4433-8ddd-f34eed0cf169`
- **Frontend Service ID**: `1706ed8c-ba6c-404e-adb5-c64e9c44c183`
- **Scraper Service ID**: `4350c766-49bc-46c3-b858-ba560f0f6809`

## 🔑 Tokens You Need to Create

### 1. Railway API Token

**Create at**: https://railway.app/account/tokens

**Steps**:
1. Click "Create Token"
2. Name: `Intelligence Service`
3. Copy the token immediately (it won't be shown again)
4. **Paste it here** or provide it to me

**Required for**: Fetching deployment logs from Railway API

---

### 2. GitHub Personal Access Token

**Create at**: https://github.com/settings/tokens

**Steps**:
1. Click "Generate new token (classic)"
2. Name: `Intelligence Service Railway`
3. Select scopes:
   - ✅ `repo` (select the top-level checkbox, includes all sub-scopes)
   - ✅ `write:discussion`
4. Click "Generate token"
5. Copy the token immediately (it won't be shown again)
6. **Paste it here** or provide it to me

**Required for**: Creating GitHub issues when errors are detected

---

## Once You Have Both Tokens

Reply with both tokens and I'll:
1. Set all 11 environment variables on Railway
2. Link the intelligence-service
3. Trigger deployment
4. Run database migrations
5. Test the service
6. Verify end-to-end functionality

## Token Security

- These tokens will only be stored in Railway's encrypted environment variables
- Railway API token has read-only access to logs
- GitHub token has minimal scope (only repo + issues)
- Tokens can be rotated anytime in the future
