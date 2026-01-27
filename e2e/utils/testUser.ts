import { APIRequestContext } from '@playwright/test';

export async function createTestUser(request: APIRequestContext) {
  const timestamp = Date.now();
  const testUser = {
    username: `test${timestamp}`,
    email: `test${timestamp}@example.com`,
    password: 'Test123456!',
  };

  // Use absolute URL for API endpoint
  const apiUrl = process.env.API_URL || 'http://localhost:3001';
  const response = await request.post(`${apiUrl}/api/auth/register`, {
    data: testUser,
  });

  // Check if request succeeded
  if (!response.ok()) {
    const errorBody = await response.text();
    throw new Error(
      `Failed to create test user: ${response.status()} ${response.statusText()}\n${errorBody}`
    );
  }

  const data = await response.json();

  // Validate response structure
  if (!data.token || !data.user || !data.user.id) {
    throw new Error(
      `Invalid API response structure: ${JSON.stringify(data)}`
    );
  }

  return {
    ...testUser,
    token: data.token,
    userId: data.user.id,
  };
}
