# GitHub Actions Badges

Add these badges to your main README.md to show CI/CD status.

## 📛 Available Badges

### Test Status Badges

#### Backend Tests
```markdown
![Backend Tests](https://github.com/YOUR_USERNAME/MichellinCompare/actions/workflows/backend-tests.yml/badge.svg)
```

#### Full CI Pipeline
```markdown
![CI](https://github.com/YOUR_USERNAME/MichellinCompare/actions/workflows/ci.yml/badge.svg)
```

#### Quick Tests
```markdown
![Quick Tests](https://github.com/YOUR_USERNAME/MichellinCompare/actions/workflows/quick-test.yml/badge.svg)
```

#### PR Checks
```markdown
![PR Checks](https://github.com/YOUR_USERNAME/MichellinCompare/actions/workflows/test-on-pr.yml/badge.svg)
```

### Branch-Specific Badges

#### Main Branch
```markdown
![Backend Tests - Main](https://github.com/YOUR_USERNAME/MichellinCompare/actions/workflows/backend-tests.yml/badge.svg?branch=main)
```

#### Develop Branch
```markdown
![Backend Tests - Develop](https://github.com/YOUR_USERNAME/MichellinCompare/actions/workflows/backend-tests.yml/badge.svg?branch=develop)
```

## 🎨 Badge Styles

### Default
```markdown
![Tests](https://github.com/YOUR_USERNAME/MichellinCompare/actions/workflows/backend-tests.yml/badge.svg)
```

### Flat
```markdown
![Tests](https://github.com/YOUR_USERNAME/MichellinCompare/actions/workflows/backend-tests.yml/badge.svg?style=flat)
```

### Flat Square
```markdown
![Tests](https://github.com/YOUR_USERNAME/MichellinCompare/actions/workflows/backend-tests.yml/badge.svg?style=flat-square)
```

### For the Badge Style
```markdown
![Tests](https://github.com/YOUR_USERNAME/MichellinCompare/actions/workflows/backend-tests.yml/badge.svg?style=for-the-badge)
```

## 📊 Coverage Badge (Codecov)

If using Codecov:

```markdown
[![codecov](https://codecov.io/gh/YOUR_USERNAME/MichellinCompare/branch/main/graph/badge.svg)](https://codecov.io/gh/YOUR_USERNAME/MichellinCompare)
```

## 🚀 Recommended Badge Layout

Add this to the top of your README.md:

```markdown
# Michelin Star Hunter 🌟

[![Backend Tests](https://github.com/YOUR_USERNAME/MichellinCompare/actions/workflows/backend-tests.yml/badge.svg)](https://github.com/YOUR_USERNAME/MichellinCompare/actions/workflows/backend-tests.yml)
[![CI](https://github.com/YOUR_USERNAME/MichellinCompare/actions/workflows/ci.yml/badge.svg)](https://github.com/YOUR_USERNAME/MichellinCompare/actions/workflows/ci.yml)
[![codecov](https://codecov.io/gh/YOUR_USERNAME/MichellinCompare/branch/main/graph/badge.svg)](https://codecov.io/gh/YOUR_USERNAME/MichellinCompare)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](https://nodejs.org)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A gamified platform where users can track visits to Michelin-starred restaurants and compete for the highest score.
```

## 🎯 Additional Shields.io Badges

### Technology Stack

```markdown
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=flat&logo=typescript&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-43853D?style=flat&logo=node.js&logoColor=white)
![React](https://img.shields.io/badge/React-20232A?style=flat&logo=react&logoColor=61DAFB)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=flat&logo=postgresql&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-3982CE?style=flat&logo=Prisma&logoColor=white)
![Express.js](https://img.shields.io/badge/Express.js-404D59?style=flat&logo=express&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-2496ED?style=flat&logo=docker&logoColor=white)
```

### Code Quality

```markdown
![Maintained](https://img.shields.io/badge/Maintained%3F-yes-green.svg)
![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)
```

### Deployment Status (if using Railway/Render)

```markdown
![Railway Deploy](https://img.shields.io/badge/Railway-Deployed-success)
```

## 🔗 Quick Setup

1. **Replace `YOUR_USERNAME`** with your GitHub username in all badge URLs
2. **Copy desired badges** to your README.md
3. **Commit and push** to see badges appear
4. **Badges update automatically** based on workflow status

## 📸 Preview

After adding badges, your README header will look like:

```
Michelin Star Hunter 🌟
✅ passing | ✅ passing | 📊 92% | 💚 Node ≥18 | 📄 MIT
```

The badges are clickable and link to:
- Workflow run history
- Coverage reports
- License details

## 🎨 Custom Badges

Create custom badges at [shields.io](https://shields.io/):

```markdown
![Tests](https://img.shields.io/badge/tests-83%20passing-success)
![Coverage](https://img.shields.io/badge/coverage-92%25-brightgreen)
```

## ⚡ Dynamic Badges

These update automatically based on your repository:

```markdown
![GitHub issues](https://img.shields.io/github/issues/YOUR_USERNAME/MichellinCompare)
![GitHub pull requests](https://img.shields.io/github/issues-pr/YOUR_USERNAME/MichellinCompare)
![GitHub last commit](https://img.shields.io/github/last-commit/YOUR_USERNAME/MichellinCompare)
![GitHub repo size](https://img.shields.io/github/repo-size/YOUR_USERNAME/MichellinCompare)
```

---

**Remember:** Badges are automatically updated by GitHub Actions - no manual intervention needed! 🎉
