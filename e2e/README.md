# End-to-End Tests

Playwright tests for critical user flows in Michelin Star Hunter.

## Running Tests

### Local Development
```bash
# Install dependencies (from root)
npm install

# Run tests with UI
npm run test:e2e:ui

# Run tests in headed mode
npm run test:e2e:headed

# Run tests with debugger
npm run test:e2e:debug

# Run all tests
npm run test:e2e
```

### Prerequisites
- Backend running on http://localhost:3001
- Frontend running on http://localhost:3000
- Database seeded with restaurant data

### Test Structure
- `auth.spec.ts` - Login and registration flows
- `restaurants.spec.ts` - Restaurant search and filtering
- `restaurant-details.spec.ts` - Restaurant detail page
- `utils/` - Test helpers and utilities

### CI/CD
Tests run automatically on every PR to `main` branch via GitHub Actions.

## Writing Tests

### Best Practices
1. Use `createTestUser()` for auth tests
2. Use `loginUser()` helper for authenticated flows
3. Clean up test data after tests (where possible)
4. Use data-testid attributes for reliable selectors
5. Wait for elements explicitly, avoid fixed timeouts

### Debugging
```bash
# Run single test file
npx playwright test e2e/auth.spec.ts

# Run with headed browser
npx playwright test --headed

# Open Playwright Inspector
npx playwright test --debug

# View test report
npx playwright show-report
```
