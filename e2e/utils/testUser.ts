import { APIRequestContext } from '@playwright/test';

export async function createTestUser(request: APIRequestContext) {
  const timestamp = Date.now();
  const testUser = {
    username: `test_${timestamp}`,
    email: `test_${timestamp}@example.com`,
    password: 'Test123456!',
  };

  const response = await request.post('/api/auth/register', {
    data: testUser,
  });

  const data = await response.json();
  return {
    ...testUser,
    token: data.token,
    userId: data.user.id,
  };
}
