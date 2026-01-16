import '@testing-library/jest-dom';
import { vi, beforeAll, afterAll, afterEach } from 'vitest';

// Extended timeout for integration tests
vi.setConfig({ testTimeout: 30000 });

// Setup/teardown hooks for test database
beforeAll(async () => {
  // Set up test database connection if needed
});

afterEach(async () => {
  // Clean up test data after each test
});

afterAll(async () => {
  // Close connections
});
