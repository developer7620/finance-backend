import request from 'supertest';

import app from '../../src/app';

interface LoginResult {
  accessToken: string;
  refreshToken: string;
}

export const loginUser = async (email: string, password: string): Promise<LoginResult> => {
  const response = await request(app).post('/api/auth/login').send({
    email,
    password,
  });

  if (response.status !== 200) {
    throw new Error(`Login failed for ${email}. Received status ${response.status}.`);
  }

  return response.body.data.tokens as LoginResult;
};
