# GitHub Actions Workflows

This directory contains CI/CD workflows for the Michelin Star Hunter project.

## 📋 Available Workflows

### 1. Quick Tests ([quick-test.yml](quick-test.yml))
**Triggers:** Every push to any branch
**Duration:** ~3-5 minutes
**Purpose:** Fast feedback on test failures

**What it does:**
- Runs all backend tests
- Uses PostgreSQL service container
- No coverage reports (faster)

**When to use:** During active development for quick feedback

---

### 2. Backend Tests ([backend-tests.yml](backend-tests.yml))
**Triggers:**
- Push to `main` or `develop` branches
- Pull requests to `main` or `develop`
- Only when backend files change

**Duration:** ~5-8 minutes
**Purpose:** Comprehensive backend testing with coverage

**What it does:**
- Runs tests on multiple Node versions (18.x, 20.x)
- Generates coverage reports
- Uploads coverage to Codecov
- Archives test results
- Comments PR with coverage stats

**Matrix testing:** Tests against Node.js 18.x and 20.x

---

### 3. PR Checks ([test-on-pr.yml](test-on-pr.yml))
**Triggers:** Pull request events (opened, synchronized, reopened)
**Duration:** ~5-7 minutes
**Purpose:** Automated PR validation

**What it does:**
- Runs full test suite with coverage
- Posts coverage summary as PR comment
- Checks coverage threshold (80%)
- Type checks and builds
- Updates comment on new commits

**Features:**
- 🟢 Green badge if coverage ≥ 80%
- 🟡 Yellow badge if coverage 60-79%
- 🔴 Red badge if coverage < 60%

---

### 4. Full CI Pipeline ([ci.yml](ci.yml))
**Triggers:**
- Push to `main` branch
- Pull requests to `main`

**Duration:** ~10-15 minutes
**Purpose:** Complete validation before merge/deploy

**What it does:**
1. **Backend Tests**
   - Full test suite with coverage
   - Uploads coverage artifacts

2. **Backend Lint & Type Check**
   - TypeScript type checking
   - Builds production bundle

3. **Frontend Build**
   - Builds frontend
   - Uploads build artifacts

4. **Docker Build Test**
   - Tests Docker image builds
   - Uses build cache for speed

5. **CI Summary**
   - Reports all job results
   - Fails if any job fails

---

## 🚀 Getting Started

### Prerequisites

1. **PostgreSQL Service:** All workflows use PostgreSQL 15 service containers (automatically provided by GitHub Actions)

2. **Secrets (Optional):**
   - `CODECOV_TOKEN` - For uploading coverage to Codecov (optional)
   - `GITHUB_TOKEN` - Automatically provided by GitHub

### Setup in Your Repository

1. **Enable GitHub Actions:**
   - Go to your repository Settings → Actions → General
   - Select "Allow all actions and reusable workflows"

2. **Add Codecov (Optional):**
   ```bash
   # Visit https://codecov.io and sign up
   # Add CODECOV_TOKEN to repository secrets
   ```

3. **Branch Protection Rules (Recommended):**
   - Settings → Branches → Add rule
   - Branch name pattern: `main`
   - ✅ Require status checks to pass before merging
   - Select: "Backend Tests", "PR Checks"
   - ✅ Require branches to be up to date

---

## 📊 Workflow Visualization

```
Push to any branch
└─→ Quick Tests (3-5 min)
    └─→ ✅ Pass / ❌ Fail

Push to main/develop (backend changes)
└─→ Backend Tests (5-8 min)
    ├─→ Node 18.x tests
    ├─→ Node 20.x tests
    └─→ Upload coverage

Open/Update Pull Request
└─→ PR Checks (5-7 min)
    ├─→ Run tests
    ├─→ Comment with coverage
    └─→ Type check & build

Push to main
└─→ Full CI Pipeline (10-15 min)
    ├─→ Backend Tests
    ├─→ Backend Lint
    ├─→ Frontend Build
    ├─→ Docker Build Test
    └─→ CI Summary
```

---

## 🎯 Which Workflow Runs When?

| Event | Quick Test | Backend Tests | PR Checks | Full CI |
|-------|:----------:|:-------------:|:---------:|:-------:|
| Push to feature branch | ✅ | ❌ | ❌ | ❌ |
| Push to main | ✅ | ❌ | ❌ | ✅ |
| Push to develop | ✅ | ✅ (backend) | ❌ | ❌ |
| Open PR to main | ❌ | ✅ (backend) | ✅ | ✅ |
| Update PR | ❌ | ✅ (backend) | ✅ | ❌ |

---

## 💡 Best Practices

### For Contributors

1. **Before pushing:**
   ```bash
   npm test                    # Run tests locally
   npm run test:coverage       # Check coverage
   ```

2. **Watch for workflow status:**
   - Check the Actions tab in GitHub
   - Look for ✅ or ❌ in your PR

3. **Read PR comments:**
   - Review coverage changes
   - Investigate failed tests

### For Maintainers

1. **Don't merge if:**
   - Tests are failing ❌
   - Coverage drops significantly 📉
   - TypeScript errors present 🔴

2. **Review coverage reports:**
   - Click on coverage details in PR
   - Ensure critical paths are tested

3. **Monitor workflow performance:**
   - Check workflow duration trends
   - Optimize slow tests

---

## 🔧 Customization

### Adjust Coverage Threshold

Edit [test-on-pr.yml](test-on-pr.yml):
```yaml
if (( $(echo "$COVERAGE < 80" | bc -l) )); then
  # Change 80 to your desired threshold
```

### Add More Node Versions

Edit [backend-tests.yml](backend-tests.yml):
```yaml
strategy:
  matrix:
    node-version: [18.x, 20.x, 21.x]  # Add more versions
```

### Change Test Database

All workflows use:
```yaml
DATABASE_URL: postgresql://postgres:postgres@localhost:5432/michelin_test?schema=public
```

Modify if needed in each workflow file.

### Skip Workflows

Add to commit message:
```bash
git commit -m "docs: update README [skip ci]"
```

---

## 📈 Coverage Reporting

### Codecov Integration

1. Sign up at [codecov.io](https://codecov.io)
2. Add `CODECOV_TOKEN` to repository secrets
3. Coverage uploaded automatically on PR

### Viewing Coverage Locally

```bash
cd backend
npm run test:coverage
open coverage/lcov-report/index.html
```

---

## 🐛 Troubleshooting

### Tests failing in CI but passing locally?

**Possible causes:**
1. Database connection issues
2. Environment variable differences
3. Timezone differences
4. Node version differences

**Solutions:**
- Check workflow logs in Actions tab
- Ensure `.env.test` is properly configured
- Test with same Node version as CI

### Workflow not triggering?

**Check:**
1. Is the workflow file in `.github/workflows/`?
2. Is YAML syntax correct? (use a validator)
3. Are path filters too restrictive?
4. Is GitHub Actions enabled for your repo?

### Slow workflows?

**Optimize:**
1. Use `npm ci` instead of `npm install`
2. Enable caching for dependencies
3. Run tests in parallel where possible
4. Use Alpine images for containers

---

## 📚 Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [PostgreSQL Service Container](https://docs.github.com/en/actions/using-containerized-services/creating-postgresql-service-containers)
- [Jest CLI Options](https://jestjs.io/docs/cli)
- [Codecov Documentation](https://docs.codecov.com/)

---

## 🎉 Success Indicators

Your CI is working well when you see:

✅ All tests passing
✅ Coverage above threshold
✅ PRs with automatic feedback
✅ Build artifacts generated
✅ Fast feedback (< 10 minutes)

---

**Last Updated:** 2025-11-10
**Maintained by:** MichellinCompare Team
