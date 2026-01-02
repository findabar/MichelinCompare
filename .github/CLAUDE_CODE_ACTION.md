# Claude Code GitHub Action Setup

This repository uses the [Claude Code GitHub Action](https://github.com/anthropics/claude-code-action) to automatically analyze and fix issues.

## How It Works

When you mention `@claude` in an issue (title, description, or comment), the workflow automatically:

1. ✅ **Analyzes** the issue and creates an implementation plan
2. 🔧 **Creates a branch** named `claude/issue-{number}-{timestamp}`
3. 💻 **Implements the fix** following project patterns (guided by CLAUDE.md)
4. 🧪 **Runs the full test suite** (backend + frontend)
5. ✅ **Creates a Pull Request** if tests pass
6. 💬 **Comments on the issue** with the PR link

## Setup Instructions

### 1. Get an Anthropic API Key

1. Go to https://console.anthropic.com/
2. Create an account or sign in
3. Navigate to API Keys
4. Create a new API key
5. Copy the key (starts with `sk-ant-`)

### 2. Add the API Key to GitHub Secrets

1. Go to your repository on GitHub
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Name: `CLAUDE_CODE_OAUTH_TOKEN`
5. Value: Paste your API key
6. Click **Add secret**

### 3. Enable GitHub Actions

1. Go to **Settings** → **Actions** → **General**
2. Under **Workflow permissions**, select:
   - ✅ **Read and write permissions**
   - ✅ **Allow GitHub Actions to create and approve pull requests**
3. Click **Save**

## Usage

### Triggering the Action

Simply mention `@claude` anywhere in an issue:

**Example 1: In issue description**
```markdown
Title: Fix restaurant filter bug

Description:
The cuisine filter isn't working properly. @claude please investigate and fix.
```

**Example 2: In a comment**
```markdown
This looks like a race condition in the visit tracking.
@claude can you fix this?
```

**Example 3: In the title**
```markdown
Title: @claude Fix authentication redirect loop
```

### What Happens Next

1. **Within seconds**: Claude Code bot comments that it's analyzing the issue
2. **1-3 minutes**: Implementation and testing complete
3. **Pull Request created**: Review the changes and merge if satisfied

### Example PR Created by Claude

```markdown
## 🤖 Automated Fix by Claude Code

This PR addresses issue #42

### Original Issue
Fix restaurant filter bug

### Changes Made
- Fixed race condition in RestaurantsPage.tsx filter logic
- Added debouncing to prevent multiple simultaneous API calls
- Updated filter state management

### Test Results
- ✅ Backend tests: success
- ✅ Frontend tests: success

### Review Checklist
- [ ] Code changes are correct and follow project patterns
- [ ] No security issues introduced
- [ ] Tests are passing
- [ ] Documentation updated if needed
- [ ] Ready to merge

🔗 Closes #42
```

## What Claude Code Can Fix

Claude Code works best for:

- ✅ Bug fixes with clear reproduction steps
- ✅ Feature implementations with specific requirements
- ✅ Code refactoring with defined goals
- ✅ Test additions
- ✅ Documentation updates
- ✅ TypeScript/type errors
- ✅ Database schema changes (via Prisma migrations)

## What to Review

Always review Claude's PRs for:

- **Security**: Ensure no vulnerabilities introduced
- **Logic**: Verify the fix actually solves the issue
- **Tests**: Check that tests are meaningful and passing
- **Breaking changes**: Ensure backwards compatibility
- **Database migrations**: Review schema changes carefully

## Limitations

Claude Code may struggle with:

- ❌ Issues requiring external API credentials
- ❌ Issues needing human judgment or design decisions
- ❌ Debugging production-only issues without logs
- ❌ Complex architectural changes spanning many files

## Troubleshooting

### Action doesn't trigger

- Check that `@claude` is spelled correctly
- Verify CLAUDE_CODE_OAUTH_TOKEN is set in repository secrets
- Check GitHub Actions permissions are enabled

### Tests fail in CI

- The PR will still be created but marked as failing
- Review the test output in the GitHub Action logs
- You may need to manually fix the tests

### Claude makes incorrect changes

- Simply close the PR and comment on the issue with more context
- You can re-trigger by adding another comment with `@claude` and clarification

## Cost Considerations

The Claude Code action uses the Anthropic API, which has usage costs:

- **Typical issue fix**: ~$0.10 - $0.50 (depending on complexity)
- **Complex refactoring**: ~$1.00 - $2.00

Monitor your usage at https://console.anthropic.com/settings/usage

## Feedback and Improvements

If Claude Code consistently makes certain types of mistakes:

1. Update `CLAUDE.md` with more specific guidance
2. Add patterns to avoid in the workflow prompt
3. Create a skill for repetitive workflows

## Example Issues to Try

After setup, test with a simple issue:

```markdown
Title: Add loading spinner to restaurant list

Description:
@claude please add a loading spinner component that shows while
restaurants are being fetched in RestaurantsPage.tsx

Requirements:
- Use Tailwind CSS for styling
- Show spinner while isLoading is true
- Center it in the page
```

Claude should create a PR with a working implementation within a few minutes!
