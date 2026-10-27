const { api } = require('./helpers');

describe('Smoke Test: GET /health', () => {
  it('should return 200 OK and report UP status with service checks', async () => {
    const res = await api('GET', '/health');

    expect(res.status).toBe(200);
    expect(res.data).toHaveProperty('status');
    expect(res.data).toHaveProperty('service');
    expect(res.data).toHaveProperty('checks');
  });
});
