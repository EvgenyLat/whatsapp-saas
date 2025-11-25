# EMERGENCY RESPONSE GUIDE - API Key Exposure

**INCIDENT:** OpenAI API key exposed in `Backend/env.example`
**SEVERITY:** CRITICAL
**DATE:** 2025-10-17

---

## IMMEDIATE ACTIONS (Next 15 Minutes)

### 1. REVOKE THE EXPOSED API KEY - DO THIS NOW!

**CRITICAL: Complete this step before anything else!**

1. Go to: https://platform.openai.com/api-keys
2. Log in to your OpenAI account
3. Find the key starting with: `sk-proj-XXXX...`
4. Click the trash/delete icon
5. Confirm deletion
6. **Record the time you revoked it: ___:___ on ___/___/___**

### 2. Check for Unauthorized Usage

1. Go to: https://platform.openai.com/usage
2. Review last 30 days of activity
3. Look for:
   - Unusual spikes in API calls
   - Calls from unexpected times/locations
   - Abnormally high token usage
4. Document suspicious activity: ________________________________

**If you see suspicious activity:**
- Contact OpenAI support immediately: support@openai.com
- Document everything
- Calculate unauthorized costs
- Report to finance/accounting team

### 3. Create New API Key

1. Go to: https://platform.openai.com/api-keys
2. Click "Create new secret key"
3. Name it: `whatsapp-saas-production-2025-10-17`
4. **Set limits:**
   - Max requests per minute: 100
   - Max tokens per day: 1,000,000
   - Budget limit: $100/month (adjust as needed)
5. **COPY THE KEY** - you won't see it again!
6. Store in password manager: ________________________________
7. **DO NOT commit this key to any file!**

### 4. Temporary Fix (Until AWS Secrets Manager)

**Windows:**
```powershell
# Create .env file in Backend directory
cd Backend
Copy-Item .env.local.example .env

# Open .env in editor
notepad .env

# Replace OPENAI_API_KEY=sk-your-key-here with your NEW key
# Save and close

# Verify
Get-Content .env | Select-String "OPENAI_API_KEY"
```

**Linux/macOS:**
```bash
# Create .env file
cd Backend
cp .env.local.example .env

# Edit with your new key
nano .env  # or vim, code, etc.

# Replace OPENAI_API_KEY=sk-your-key-here with your NEW key
# Save and exit

# Verify
grep "OPENAI_API_KEY" .env
```

### 5. Restart Application

```bash
cd Backend
npm install  # Install AWS SDK dependency
npm start

# In another terminal, test
curl http://localhost:3000/healthz
```

**If you see errors:**
- Check logs: `Backend/logs/app.log`
- Verify .env file exists and has new key
- Ensure no typos in the API key

---

## NOTIFICATION CHECKLIST

Notify these people immediately:

- [ ] Engineering Team Lead: ________________ (Phone: _____________)
- [ ] Security Team: ________________ (Email: _____________)
- [ ] Product Owner: ________________
- [ ] DevOps Team: ________________
- [ ] Finance/Billing: ________________ (for usage review)

**Email Template:**
```
Subject: CRITICAL - OpenAI API Key Exposure Incident

Priority: URGENT

We have discovered an OpenAI API key exposure in our codebase.

Status: [IN PROGRESS / CONTAINED]
Exposed Key: Revoked at [TIME]
New Key: Created and deployed
Impact: [DESCRIBE ANY UNAUTHORIZED USAGE]

Actions Taken:
1. ✓ Exposed key revoked
2. ✓ Usage logs reviewed
3. ✓ New key created with limits
4. ✓ Application updated with new key
5. ⏳ AWS Secrets Manager setup (in progress)

No immediate action required from you at this time.
Full incident report will follow.

[Your Name]
```

---

## SHORT-TERM ACTIONS (Next 24 Hours)

### 6. Install AWS Secrets Manager (RECOMMENDED)

**Why?**
- Centralized secret management
- Automatic rotation
- Audit logging
- No secrets in code/env files

**Windows PowerShell:**
```powershell
# Install AWS CLI (if not installed)
winget install Amazon.AWSCLI

# Configure AWS credentials
aws configure
# Enter your AWS Access Key ID
# Enter your AWS Secret Access Key
# Default region: us-east-1
# Output format: json

# Run setup script
cd C:\whatsapp-saas-starter
powershell -ExecutionPolicy Bypass -File scripts\setup-secrets-manager.ps1
```

**Linux/macOS:**
```bash
# Install AWS CLI (if not installed)
# macOS:
brew install awscli

# Linux:
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install

# Configure AWS credentials
aws configure

# Run setup script
cd whatsapp-saas-starter
chmod +x scripts/setup-secrets-manager.sh
./scripts/setup-secrets-manager.sh
```

**Follow the prompts to enter:**
- Your NEW OpenAI API key
- Database URL
- Redis URL
- Admin token
- Meta/WhatsApp credentials

### 7. Update Application Code

The code changes have already been made:
- ✓ `Backend/src/config/secrets.js` - Secrets management module
- ✓ `Backend/src/ai/conversationManager.js` - Updated to use secrets
- ✓ `Backend/index.js` - Initialize secrets on startup
- ✓ `Backend/env.example` - Safe placeholders only

### 8. Deploy with AWS Secrets Manager

**Set environment variables:**
```bash
# Windows
$env:USE_AWS_SECRETS = "true"
$env:AWS_REGION = "us-east-1"

# Linux/macOS
export USE_AWS_SECRETS=true
export AWS_REGION=us-east-1
```

**Restart application:**
```bash
cd Backend
npm start
```

**Verify secrets loaded:**
```bash
curl http://localhost:3000/healthz

# Should show:
# "services": {
#   "secrets": {
#     "status": "healthy",
#     "source": "aws"
#   }
# }
```

### 9. Install Pre-Commit Hook (Prevent Future Exposures)

**Windows (Git Bash):**
```bash
cp .github/hooks/pre-commit .git/hooks/pre-commit
chmod +x .git/hooks/pre-commit
```

**Linux/macOS:**
```bash
cp .github/hooks/pre-commit .git/hooks/pre-commit
chmod +x .git/hooks/pre-commit
```

**Test the hook:**
```bash
# Try to commit a secret (should fail)
echo "OPENAI_API_KEY=sk-test123" >> test.txt
git add test.txt
git commit -m "test"
# Should block the commit!

# Clean up
rm test.txt
```

---

## GIT HISTORY CLEANUP (If Code Was Pushed)

**IMPORTANT:** Only needed if you've already committed this code to git!

**Check if you need this:**
```bash
# Are you using git?
git status

# If you get "fatal: not a git repository" - SKIP THIS SECTION
# If you see git output - READ CAREFULLY
```

### Option A: Repository Not Yet Pushed to Remote

If you haven't pushed to GitHub/GitLab yet:

```bash
# Simply create a new commit with the fix
git add Backend/env.example Backend/src/
git commit -m "security: Remove exposed API keys, implement AWS Secrets Manager"

# NOW you can safely push
```

### Option B: Code Was Pushed to Remote Repository

**DANGER ZONE:** This rewrites history for everyone!

1. **Backup everything:**
   ```bash
   git bundle create ../backup.bundle --all
   cp -r . ../backup-$(date +%Y%m%d)
   ```

2. **Run cleanup script:**
   ```bash
   chmod +x scripts/cleanup-git-history.sh
   ./scripts/cleanup-git-history.sh
   ```

3. **Verify cleanup:**
   ```bash
   ./scripts/verify-secret-removal.sh
   ```

4. **COORDINATE WITH TEAM** before force pushing:
   ```bash
   # This REWRITES HISTORY for everyone!
   git push --force --all origin
   git push --force --tags origin
   ```

5. **All team members must:**
   ```bash
   # Delete local repo
   cd ..
   rm -rf whatsapp-saas-starter

   # Clone fresh
   git clone https://github.com/your-org/whatsapp-saas-starter.git
   ```

### Option C: Public Repository

If the code was in a public repository:

1. Complete Option B cleanup
2. Contact platform support:
   - GitHub: https://support.github.com/contact
   - GitLab: https://about.gitlab.com/support/
3. Request cache purge
4. Consider creating new repository with clean history
5. Update any documentation with new repo URL

---

## VERIFICATION CHECKLIST

Before considering this incident resolved:

### Application Verification
- [ ] Old API key revoked in OpenAI dashboard
- [ ] New API key created with rate limits
- [ ] Application running with new key
- [ ] Health endpoint returns 200 OK
- [ ] AI features working (test conversation)
- [ ] No errors in application logs

### Security Verification
- [ ] AWS Secrets Manager configured (or .env secured)
- [ ] No secrets in Backend/env.example
- [ ] Pre-commit hook installed and tested
- [ ] Git history cleaned (if applicable)
- [ ] No secrets visible in GitHub/GitLab web UI

### Team Communication
- [ ] All stakeholders notified
- [ ] Team members know not to commit secrets
- [ ] Documentation updated
- [ ] Post-mortem scheduled

---

## TESTING PROCEDURE

### Local Development Test
```bash
# 1. Verify environment
cd Backend
cat .env | grep OPENAI_API_KEY
# Should show: OPENAI_API_KEY=sk-proj-[YOUR-NEW-KEY]

# 2. Start application
npm start

# 3. Check health
curl http://localhost:3000/healthz
# Should return 200 OK

# 4. Test AI conversation (simulate webhook)
curl -X POST http://localhost:3000/webhook \
  -H "Content-Type: application/json" \
  -H "x-admin-token: your-admin-token" \
  -d '{
    "entry": [{
      "changes": [{
        "value": {
          "messages": [{
            "from": "1234567890",
            "text": {"body": "test message"}
          }]
        }
      }]
    }]
  }'

# 5. Check logs for errors
tail -f Backend/logs/app.log | grep -i error
# Should show no OpenAI-related errors
```

### AWS Secrets Manager Test
```bash
# 1. Set environment
export USE_AWS_SECRETS=true
export AWS_REGION=us-east-1

# 2. Test AWS access
aws secretsmanager get-secret-value \
  --secret-id whatsapp-saas/openai-api-key \
  --query SecretString \
  --output text
# Should return your API key

# 3. Start application
cd Backend
npm start

# 4. Check logs for AWS confirmation
tail Backend/logs/app.log | grep "AWS Secrets Manager"
# Should show: "Secrets loaded successfully from AWS Secrets Manager"

# 5. Verify secrets health endpoint
curl http://localhost:3000/admin/secrets/health \
  -H "x-admin-token: your-admin-token"
# Should show: {"status": "healthy", "source": "aws"}
```

---

## ROLLBACK PROCEDURE

If something goes wrong:

### Rollback to Environment Variables
```bash
# 1. Disable AWS Secrets Manager
export USE_AWS_SECRETS=false  # Linux/macOS
$env:USE_AWS_SECRETS = "false"  # Windows

# 2. Ensure .env file has new key
cat Backend/.env | grep OPENAI_API_KEY

# 3. Restart application
cd Backend
npm start

# 4. Verify working
curl http://localhost:3000/healthz
```

### Emergency Access to Old Key (If Needed)
If you accidentally revoked the new key:

1. Create another new key in OpenAI dashboard
2. Update .env immediately
3. Restart application
4. Don't reuse old keys!

---

## COST ESTIMATION

### OpenAI API Usage
```
Typical costs:
- GPT-4: $0.03 per 1K tokens
- Average conversation: ~500 tokens
- Cost per conversation: ~$0.015

Example monthly costs:
- 1,000 conversations: $15
- 10,000 conversations: $150
- 100,000 conversations: $1,500

Set budget alerts in OpenAI dashboard!
```

### AWS Secrets Manager
```
Pricing:
- $0.40 per secret per month
- $0.05 per 10,000 API calls
- Our setup: 11 secrets = $4.40/month
- Estimated API calls (with 1hr cache): ~720/month = $0.004
- Total: ~$4.50/month

Very cheap for the security benefits!
```

---

## SUPPORT CONTACTS

### OpenAI
- Dashboard: https://platform.openai.com/
- Usage: https://platform.openai.com/usage
- Support: https://help.openai.com/
- Email: support@openai.com

### AWS
- Console: https://console.aws.amazon.com/
- Secrets Manager: https://console.aws.amazon.com/secretsmanager/
- Support: https://console.aws.amazon.com/support/
- Documentation: https://docs.aws.amazon.com/secretsmanager/

### Internal
- Security Team: _______________________
- DevOps Team: _______________________
- On-Call Engineer: _______________________
- Emergency Hotline: _______________________

---

## COMMON ISSUES & SOLUTIONS

### Issue: "OPENAI_API_KEY not found"
**Solution:**
```bash
# Check .env file exists
ls -la Backend/.env

# Check content
cat Backend/.env | grep OPENAI_API_KEY

# Verify format (no quotes needed)
# Correct: OPENAI_API_KEY=sk-proj-abc123
# Wrong: OPENAI_API_KEY="sk-proj-abc123"

# Restart app
npm start
```

### Issue: "AWS credentials not configured"
**Solution:**
```bash
# Check AWS CLI
aws --version

# Configure credentials
aws configure

# Test access
aws sts get-caller-identity

# Verify region
aws configure get region
```

### Issue: "Secrets not loading from AWS"
**Solution:**
```bash
# Check environment variables
echo $USE_AWS_SECRETS  # Should be "true"
echo $AWS_REGION       # Should be "us-east-1"

# Test secret retrieval
aws secretsmanager get-secret-value \
  --secret-id whatsapp-saas/openai-api-key \
  --region us-east-1

# Check IAM permissions
aws iam get-user
# Ensure user has secretsmanager:GetSecretValue permission

# Check application logs
tail -f Backend/logs/app.log | grep -i secret
```

### Issue: "Pre-commit hook not working"
**Solution:**
```bash
# Check hook is executable
ls -la .git/hooks/pre-commit
# Should show: -rwxr-xr-x (x means executable)

# Make executable
chmod +x .git/hooks/pre-commit

# Test manually
./.git/hooks/pre-commit

# If using Windows, ensure Git Bash is installed
```

---

## INCIDENT TIMELINE TEMPLATE

Document everything:

```
[TIME] - Incident discovered
[TIME] - Security team notified
[TIME] - Old API key revoked
[TIME] - Usage logs reviewed
[TIME] - New API key created
[TIME] - Application updated
[TIME] - Tested and verified working
[TIME] - AWS Secrets Manager setup started
[TIME] - AWS Secrets Manager deployed
[TIME] - Pre-commit hook installed
[TIME] - Git history cleaned (if applicable)
[TIME] - Team notified
[TIME] - Incident closed

Total Resolution Time: ___ hours
```

---

## SUCCESS CRITERIA

Incident is resolved when:

1. ✅ Old API key revoked
2. ✅ No unauthorized usage detected
3. ✅ New API key created with limits
4. ✅ Application running successfully
5. ✅ Secrets managed securely (AWS or protected .env)
6. ✅ No secrets in version control
7. ✅ Pre-commit hook preventing future exposures
8. ✅ Team trained on proper secrets management
9. ✅ Monitoring and alerts configured
10. ✅ Post-mortem completed

---

## DOCUMENT VERSION

- Version: 1.0
- Last Updated: 2025-10-17
- Next Review: 2025-11-17
- Owner: Security Team

---

**Remember: Security is everyone's responsibility!**

When in doubt, ask. It's better to be safe than sorry.

For detailed technical documentation, see `SECURITY_FIX.md`
