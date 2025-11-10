# GitHub Actions Quick Reference Card

## 🚀 One-Page Cheat Sheet

### Commands

```bash
# Run tests locally
npm test                    # Run all tests
npm run test:watch          # Watch mode
npm run test:coverage       # With coverage
npm run test:verbose        # Detailed output

# Check workflow status
gh workflow list            # List all workflows
gh run list                 # Recent workflow runs
gh run view <run-id>        # View specific run

# Trigger workflows manually
gh workflow run backend-tests.yml
gh workflow run ci.yml
```

### Workflows at a Glance

| Workflow | Trigger | Duration | Purpose |
|----------|---------|----------|---------|
| **Quick Test** | Push to any branch | ~3-5 min | Fast feedback |
| **Backend Tests** | Push to main/develop | ~5-8 min | Multi-version testing |
| **PR Checks** | Open/update PR | ~5-7 min | PR validation |
| **Full CI** | Push to main | ~10-15 min | Complete pipeline |

### File Locations

```
.github/
├── workflows/
│   ├── quick-test.yml          # Fast tests
│   ├── backend-tests.yml       # Multi-version tests
│   ├── test-on-pr.yml          # PR validation
│   └── ci.yml                  # Full pipeline
├── CI_CD_SETUP.md              # Setup guide
├── BADGES.md                   # Badge templates
├── WORKFLOW_DIAGRAM.md         # Visual diagrams
└── QUICK_REFERENCE.md          # This file
```

### URLs

```
Actions:     https://github.com/USER/REPO/actions
Settings:    https://github.com/USER/REPO/settings/actions
Secrets:     https://github.com/USER/REPO/settings/secrets/actions
Codecov:     https://codecov.io/gh/USER/REPO
```

### Environment Variables

```yaml
DATABASE_URL: postgresql://postgres:postgres@localhost:5432/michelin_test
JWT_SECRET: test-secret-key-for-ci
JWT_EXPIRES_IN: 1h
NODE_ENV: test
```

### Badge URLs

```markdown
# Backend Tests
![Tests](https://github.com/USER/REPO/actions/workflows/backend-tests.yml/badge.svg)

# Coverage
[![codecov](https://codecov.io/gh/USER/REPO/branch/main/graph/badge.svg)](https://codecov.io/gh/USER/REPO)
```

### Coverage Thresholds

| Level | Percentage | Badge |
|-------|-----------|--------|
| Good | ≥ 80% | 🟢 |
| Warning | 60-79% | 🟡 |
| Poor | < 60% | 🔴 |

### Common Issues & Fixes

| Issue | Solution |
|-------|----------|
| Tests fail in CI only | Check environment variables |
| Workflow not triggering | Verify path filters and branch names |
| Database connection error | Ensure PostgreSQL service is configured |
| Coverage not uploading | Add CODECOV_TOKEN to secrets |
| Slow workflows | Enable caching, use `npm ci` |

### Workflow Status Codes

| Code | Meaning |
|------|---------|
| ✅ Success | All tests passed |
| ❌ Failure | Tests failed or error occurred |
| 🟡 In Progress | Workflow is running |
| ⏭️ Skipped | Workflow was skipped |
| 🚫 Cancelled | Manually cancelled |

### Test Statistics

```
Total Tests: 83
├─ Authentication: 14
├─ Restaurants: 20
├─ Visits: 18
├─ Users: 10
├─ Leaderboard: 13
└─ Middleware: 8

Average Coverage: ~92%
Average Duration: 3-5 minutes
```

### Branch Protection Checklist

- [ ] Require status checks to pass
- [ ] Require branches to be up to date
- [ ] Require pull request reviews
- [ ] Dismiss stale reviews
- [ ] Require linear history
- [ ] Include administrators

### Pre-Push Checklist

- [ ] Run `npm test` locally
- [ ] Check `npm run test:coverage`
- [ ] Review changed files
- [ ] Write descriptive commit message
- [ ] Pull latest changes from main

### PR Checklist

- [ ] Tests pass ✅
- [ ] Coverage maintained/improved 📈
- [ ] Type checks pass ✅
- [ ] Build succeeds ✅
- [ ] No merge conflicts 🔀
- [ ] Review requested 👀

### Debugging Workflows

```bash
# View logs for failed run
gh run view <run-id> --log-failed

# Download artifacts
gh run download <run-id>

# Re-run failed jobs
gh run rerun <run-id> --failed

# Cancel running workflow
gh run cancel <run-id>

# Watch workflow in real-time
gh run watch <run-id>
```

### Skip Workflows

Add to commit message:
```bash
git commit -m "docs: update README [skip ci]"
git commit -m "fix: typo [skip actions]"
```

### Workflow Syntax Highlights

```yaml
# Service container
services:
  postgres:
    image: postgres:15
    env:
      POSTGRES_DB: test_db
    options: --health-cmd pg_isready
    ports:
      - 5432:5432

# Matrix strategy
strategy:
  matrix:
    node-version: [18.x, 20.x]

# Path filters
on:
  push:
    paths:
      - 'backend/**'

# Environment variables
env:
  DATABASE_URL: ${{ secrets.DATABASE_URL }}
  NODE_ENV: test

# Conditional steps
if: github.event_name == 'pull_request'
```

### Useful GitHub CLI Commands

```bash
# Install GitHub CLI
brew install gh

# Authenticate
gh auth login

# List workflows
gh workflow list

# View workflow file
gh workflow view backend-tests.yml

# List recent runs
gh run list --workflow=backend-tests.yml

# Watch current run
gh run watch

# Download test artifacts
gh run download

# View action logs
gh run view --log

# Trigger manual workflow
gh workflow run ci.yml

# Cancel workflow
gh run cancel <run-id>
```

### Performance Tips

1. **Cache dependencies**
   ```yaml
   - uses: actions/setup-node@v4
     with:
       cache: 'npm'
   ```

2. **Use `npm ci` not `npm install`**
   ```yaml
   - run: npm ci
   ```

3. **Run jobs in parallel**
   ```yaml
   jobs:
     test:
     lint:
     build:
   ```

4. **Use Alpine images**
   ```yaml
   postgres:15-alpine
   ```

5. **Filter paths**
   ```yaml
   paths:
     - 'backend/**'
   ```

### Monitoring & Metrics

Track these metrics:
- **Pass rate**: % of successful runs
- **Duration**: Average execution time
- **Coverage**: Trend over time
- **Flaky tests**: Tests that fail intermittently
- **Queue time**: Time waiting to start

### Security Best Practices

- ✅ Store secrets in GitHub Secrets
- ✅ Use minimal permissions
- ✅ Pin action versions
- ✅ Review third-party actions
- ❌ Never commit secrets
- ❌ Don't log sensitive data

### Resources

📚 [Full Documentation](workflows/README.md)
🎯 [Setup Guide](CI_CD_SETUP.md)
🎨 [Badge Guide](BADGES.md)
📊 [Workflow Diagrams](WORKFLOW_DIAGRAM.md)
🧪 [Backend Tests](../backend/TESTING.md)

### Support

Need help?
- Check workflow logs in Actions tab
- Review [workflows/README.md](workflows/README.md)
- Open an issue
- Check GitHub Actions docs

---

**Pro Tip:** Bookmark this page for quick reference! 📌

**Last Updated:** 2025-11-10
