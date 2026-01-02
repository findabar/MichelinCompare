# Claude Code GitHub Action Setup

This repository uses the [Claude Code GitHub Action](https://github.com/anthropics/claude-code-action) to automatically analyze and fix issues.

## How It Works

When you mention `@claude` in an issue or comment, Claude Code automatically:

1. ✅ **Detects the mention** and activates
2. 🔍 **Analyzes** the issue using project context (CLAUDE.md)
3. 💻 **Implements the fix** following project patterns
4. 🧪 **Runs tests** to verify the fix works
5. 🔄 **Creates a Pull Request** with the changes
6. 💬 **Updates the issue** with progress and results

## Setup Instructions

### Option 1: Quick Setup (Recommended)

If you have Claude Code installed locally, run:
```bash
claude /install-github-app
```

This will guide you through the entire setup process automatically.

### Option 2: Manual Setup

#### 1. Get Authentication

**Choose ONE of these options:**

**A. Anthropic API Key (Easiest)**
1. Go to https://console.anthropic.com/
2. Create an account or sign in
3. Navigate to API Keys
4. Create a new API key
5. Copy the key (starts with `sk-ant-`)

**B. Claude Code OAuth Token**
1. Run `claude /install-github-app` locally
2. Complete the OAuth flow
3. The token will be generated for you

#### 2. Add Secret to GitHub

1. Go to your repository on GitHub
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Name: `CLAUDE_CODE_OAUTH_TOKEN` (or `ANTHROPIC_API_KEY`)
5. Value: Paste your token/key
6. Click **Add secret**

#### 3. Enable GitHub Actions Permissions

1. Go to **Settings** → **Actions** → **General**
2. Under **Workflow permissions**, select:
   - ✅ **Read and write permissions**
   - ✅ **Allow GitHub Actions to create and approve pull requests**
3. Click **Save**

## Usage

### Triggering the Action

Simply mention `@claude` anywhere in an issue or comment:

**Example 1: In issue description**
```markdown
Title: Fix restaurant filter bug

Description:
The cuisine filter isn't working properly on the restaurants page.
@claude please investigate and fix this issue.
```

**Example 2: In a comment**
```markdown
I think this is a race condition in the visit tracking logic.
@claude can you take a look and fix it?
```

**Example 3: Ask questions**
```markdown
@claude What does the geocoding service do and how is it used?
```

**Example 4: Code review**
```markdown
@claude Please review this PR for security issues and best practices
```

### What Happens Next

1. **Immediate**: Claude Code acknowledges your request
2. **Analysis**: Reads the issue, reviews code, and creates a plan
3. **Implementation**: Makes the necessary changes
4. **Testing**: Runs the test suite
5. **Pull Request**: Creates a PR with the changes for review

### Example Workflow

You create an issue:
```
Title: Add loading spinner to restaurant list
@claude Please add a loading spinner component that shows while
restaurants are being fetched in RestaurantsPage.tsx
```

Claude will:
1. Comment that it's working on the issue
2. Create a branch
3. Add a loading spinner component
4. Update RestaurantsPage.tsx to use it
5. Run tests
6. Create a PR with the implementation
7. Link the PR back to your issue

## What Claude Code Can Do

### ✅ Great For:
- **Bug fixes** with clear reproduction steps
- **Feature implementations** with specific requirements
- **Code refactoring** with defined goals
- **Test additions** for existing code
- **Documentation updates**
- **TypeScript/type errors**
- **Database schema changes** via Prisma migrations
- **Code reviews** on pull requests
- **Answering questions** about the codebase

### ⚠️ May Struggle With:
- Issues requiring external API credentials
- Complex architectural decisions needing human judgment
- Production-only bugs without clear reproduction
- Massive refactoring across many files

## Reviewing Claude's Work

Always review the PRs created by Claude:

- **✅ Correctness**: Does it actually solve the issue?
- **✅ Security**: No vulnerabilities introduced?
- **✅ Tests**: Are tests passing and meaningful?
- **✅ Code Quality**: Follows project patterns?
- **✅ Breaking Changes**: Maintains backwards compatibility?
- **✅ Database**: Schema changes look correct?

## Customization

### Custom Trigger Phrase

If you don't want to use `@claude`, you can change the trigger in the workflow:

```yaml
- uses: anthropics/claude-code-action@v1
  with:
    claude_code_oauth_token: ${{ secrets.CLAUDE_CODE_OAUTH_TOKEN }}
    trigger_phrase: "/fix"  # Use /fix instead of @claude
```

### Advanced Configuration

```yaml
- uses: anthropics/claude-code-action@v1
  with:
    claude_code_oauth_token: ${{ secrets.CLAUDE_CODE_OAUTH_TOKEN }}
    claude_args: |
      --max-turns 15
      --model claude-sonnet-4-5-20250929
      --system-prompt "Custom instructions for Claude"
```

## Troubleshooting

### Action doesn't trigger

**Check:**
- ✓ `@claude` is spelled correctly
- ✓ `CLAUDE_CODE_OAUTH_TOKEN` secret is set
- ✓ GitHub Actions permissions are enabled
- ✓ Workflow file exists at `.github/workflows/claude-issue-handler.yml`

**Debug:**
- Go to **Actions** tab → Find the workflow run → Check logs
- Look for "Run Claude Code" step to see what happened

### Authentication errors

**Error**: `Invalid API key` or `Unauthorized`

**Fix:**
1. Verify your secret is named exactly `CLAUDE_CODE_OAUTH_TOKEN`
2. Make sure the token/key hasn't expired
3. Re-generate the token if needed

### Claude makes incorrect changes

**What to do:**
1. Close the PR and add a comment explaining the issue
2. Provide more context in the issue description
3. You can re-trigger by mentioning `@claude` again with clarification

### Installation failures

**Error**: `Claude Code process exited with code 1`

**Fix:**
- This usually means authentication failed
- Double-check your `CLAUDE_CODE_OAUTH_TOKEN` secret is correct
- Try regenerating your token
- Check the Actions logs for specific error messages

### Tests fail in CI

Claude may create a PR even if tests fail. Check:
- Review the test output in PR checks
- Fix tests manually if needed
- Or ask `@claude` to fix the failing tests in a comment

## Cost Considerations

The Claude Code action uses the Anthropic API:

- **Typical issue fix**: $0.10 - $0.50
- **Complex refactoring**: $1.00 - $2.00
- **Code review**: $0.05 - $0.20

Monitor your usage at https://console.anthropic.com/settings/usage

## Tips for Best Results

### Write Clear Issues

Good:
```
@claude The restaurant filter dropdown in RestaurantsPage.tsx
doesn't update the list when I select a cuisine type.

Steps to reproduce:
1. Go to /restaurants
2. Select "Italian" from cuisine dropdown
3. List doesn't filter

Expected: List should show only Italian restaurants
```

Bad:
```
@claude fix the filter
```

### Provide Context

```
@claude There's a memory leak in the restaurant loading.
I think it's related to the useEffect hook not cleaning up
the subscription. Can you investigate and fix?
```

### Use CLAUDE.md

Claude automatically reads the CLAUDE.md file in this repo, which contains:
- Project architecture
- Common commands
- Code navigation guide
- Troubleshooting tips

Keep CLAUDE.md updated to help Claude work more effectively!

## Example Issues to Try

After setup, test with a simple issue:

```markdown
Title: Add a 404 page

@claude Please create a 404 Not Found page component in the frontend.

Requirements:
- Create a new component at frontend/src/pages/NotFoundPage.tsx
- Use Tailwind CSS for styling
- Include a friendly message and a link back to the home page
- Add the route to the React Router configuration
```

## Documentation

- **Claude Code Action**: https://github.com/anthropics/claude-code-action
- **Usage Guide**: https://github.com/anthropics/claude-code-action/blob/main/docs/usage.md
- **Solutions Guide**: https://github.com/anthropics/claude-code-action/blob/main/docs/solutions.md

## Feedback

If Claude consistently makes certain types of mistakes:
1. Update CLAUDE.md with more specific guidance
2. Adjust the system prompt in the workflow file
3. Provide more detailed issue descriptions

---

Need help? Check the [official docs](https://github.com/anthropics/claude-code-action) or open an issue!
