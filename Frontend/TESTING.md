# Testing Documentation

Comprehensive testing guide for the WhatsApp SaaS Frontend application.

## Table of Contents

- [Overview](#overview)
- [Test Structure](#test-structure)
- [Running Tests](#running-tests)
- [Test Coverage](#test-coverage)
- [Writing Tests](#writing-tests)
- [Testing Patterns](#testing-patterns)
- [MSW Mock Handlers](#msw-mock-handlers)
- [Test Utilities](#test-utilities)
- [Troubleshooting](#troubleshooting)

## Overview

This project uses a comprehensive testing strategy covering:

- **Unit Tests**: Individual component and function tests
- **Integration Tests**: Multi-component interaction tests
- **Accessibility Tests**: WCAG compliance and keyboard navigation
- **Responsive Tests**: Mobile, tablet, and desktop viewports

### Testing Stack

- **Jest**: Test runner and assertion library
- **React Testing Library**: Component testing utilities
- **MSW (Mock Service Worker)**: API mocking
- **@testing-library/user-event**: User interaction simulation
- **@testing-library/jest-dom**: Custom DOM matchers

## Test Structure

```
Frontend/
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   ├── login/__tests__/page.test.tsx
│   │   │   ├── register/__tests__/page.test.tsx
│   │   │   ├── forgot-password/__tests__/page.test.tsx
│   │   │   ├── reset-password/__tests__/page.test.tsx
│   │   │   └── verify-email/__tests__/page.test.tsx
│   │   └── (dashboard)/
│   │       └── dashboard/
│   │           ├── __tests__/page.test.tsx
│   │           ├── customers/
│   │           │   ├── __tests__/page.test.tsx (list)
│   │           │   ├── [id]/__tests__/page.test.tsx (detail)
│   │           │   ├── new/__tests__/page.test.tsx
│   │           │   └── [id]/edit/__tests__/page.test.tsx
│   │           ├── staff/ (same structure)
│   │           ├── services/ (same structure)
│   │           ├── templates/ (same structure)
│   │           ├── bookings/ (same structure)
│   │           ├── messages/__tests__/page.test.tsx
│   │           ├── analytics/__tests__/page.test.tsx
│   │           └── settings/__tests__/page.test.tsx
│   ├── components/__tests__/
│   ├── hooks/__tests__/
│   ├── lib/__tests__/
│   ├── mocks/
│   │   ├── handlers.ts
│   │   ├── server.ts
│   │   └── browser.ts
│   ├── test-utils/
│   │   └── index.tsx
│   └── setupTests.ts
└── scripts/
    └── generate-tests.js
```

## Running Tests

### Basic Commands

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run tests in CI mode (no watch)
npm run test:ci
```

### Running Specific Tests

```bash
# Run tests for a specific file
npm test -- login.test.tsx

# Run tests matching a pattern
npm test -- customers

# Run tests with a specific name
npm test -- "validates email format"

# Run only changed tests
npm test -- --onlyChanged
```

### Debug Mode

```bash
# Run tests with Node debugger
node --inspect-brk node_modules/.bin/jest --runInBand

# Run with verbose output
npm test -- --verbose
```

## Test Coverage

### Coverage Thresholds

The project enforces minimum coverage thresholds:

- **Branches**: 80%
- **Functions**: 80%
- **Lines**: 80%
- **Statements**: 80%

### Viewing Coverage Reports

After running `npm run test:coverage`, view the report:

```bash
# Open HTML coverage report
open coverage/lcov-report/index.html  # macOS
start coverage/lcov-report/index.html # Windows
```

### Coverage Exclusions

The following are excluded from coverage:

- Type definition files (`*.d.ts`)
- Test files (`__tests__/**`)
- Mock files (`__mocks__/**`)
- Layout files (`layout.tsx`)
- Loading states (`loading.tsx`)
- Error boundaries (`error.tsx`)

## Writing Tests

### Basic Test Structure

```typescript
import { render, screen, waitFor, userEvent } from '@/test-utils';
import MyComponent from '../MyComponent';

describe('MyComponent', () => {
  describe('Rendering', () => {
    it('renders component correctly', () => {
      render(<MyComponent />);
      expect(screen.getByRole('heading')).toBeInTheDocument();
    });
  });

  describe('User Interactions', () => {
    it('handles button click', async () => {
      const user = userEvent.setup();
      const handleClick = jest.fn();

      render(<MyComponent onClick={handleClick} />);

      const button = screen.getByRole('button', { name: /click me/i });
      await user.click(button);

      expect(handleClick).toHaveBeenCalledTimes(1);
    });
  });
});
```

### Testing Forms

```typescript
describe('LoginForm', () => {
  it('validates and submits form', async () => {
    const user = userEvent.setup();
    const handleSubmit = jest.fn();

    render(<LoginForm onSubmit={handleSubmit} />);

    // Fill form fields
    await user.type(screen.getByLabelText(/email/i), 'test@example.com');
    await user.type(screen.getByLabelText(/password/i), 'password123');

    // Submit form
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    // Verify submission
    await waitFor(() => {
      expect(handleSubmit).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      });
    });
  });

  it('shows validation errors', async () => {
    const user = userEvent.setup();

    render(<LoginForm />);

    // Submit empty form
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    // Check for errors
    await waitFor(() => {
      expect(screen.getByText(/email is required/i)).toBeInTheDocument();
      expect(screen.getByText(/password is required/i)).toBeInTheDocument();
    });
  });
});
```

### Testing Async Operations

```typescript
describe('DataFetching', () => {
  it('loads and displays data', async () => {
    render(<CustomersList />);

    // Check loading state
    expect(screen.getByText(/loading/i)).toBeInTheDocument();

    // Wait for data to load
    await waitFor(() => {
      expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
    });

    // Verify data is displayed
    expect(screen.getByText(/john doe/i)).toBeInTheDocument();
  });

  it('handles errors gracefully', async () => {
    // Mock failed request
    server.use(
      http.get('/api/customers', () => {
        return HttpResponse.json({ error: 'Failed' }, { status: 500 });
      })
    );

    render(<CustomersList />);

    await waitFor(() => {
      expect(screen.getByText(/failed to load/i)).toBeInTheDocument();
    });
  });
});
```

### Testing Navigation

```typescript
import { useRouter } from 'next/navigation';

jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

describe('Navigation', () => {
  it('navigates to detail page', async () => {
    const mockPush = jest.fn();
    (useRouter as jest.Mock).mockReturnValue({ push: mockPush });

    const user = userEvent.setup();
    render(<CustomerRow customer={mockCustomer} />);

    await user.click(screen.getByText(/view details/i));

    expect(mockPush).toHaveBeenCalledWith('/customers/123');
  });
});
```

## Testing Patterns

### AAA Pattern (Arrange-Act-Assert)

```typescript
it('increments counter', async () => {
  // Arrange
  const user = userEvent.setup();
  render(<Counter />);

  // Act
  await user.click(screen.getByRole('button', { name: /increment/i }));

  // Assert
  expect(screen.getByText(/count: 1/i)).toBeInTheDocument();
});
```

### Query Priority

Use queries in this order of priority:

1. **Accessible Queries** (preferred):
   - `getByRole`
   - `getByLabelText`
   - `getByPlaceholderText`
   - `getByText`

2. **Semantic Queries**:
   - `getByAltText`
   - `getByTitle`

3. **Test IDs** (last resort):
   - `getByTestId`

```typescript
// ✅ Good
screen.getByRole('button', { name: /submit/i });
screen.getByLabelText(/email/i);

// ❌ Avoid
screen.getByTestId('submit-button');
```

### Accessibility Testing

```typescript
describe('Accessibility', () => {
  it('has proper ARIA labels', () => {
    render(<Form />);

    const emailInput = screen.getByLabelText(/email/i);
    expect(emailInput).toHaveAttribute('aria-required', 'true');
  });

  it('supports keyboard navigation', async () => {
    const user = userEvent.setup();
    render(<Form />);

    await user.tab();
    expect(screen.getByLabelText(/email/i)).toHaveFocus();

    await user.tab();
    expect(screen.getByLabelText(/password/i)).toHaveFocus();
  });

  it('announces errors to screen readers', async () => {
    const user = userEvent.setup();
    render(<Form />);

    await user.click(screen.getByRole('button', { name: /submit/i }));

    const errorAlert = await screen.findByRole('alert');
    expect(errorAlert).toHaveTextContent(/email is required/i);
  });
});
```

### Responsive Testing

```typescript
import { mockMatchMedia } from '@/test-utils';

describe('Responsive Design', () => {
  it('shows mobile layout on small screens', () => {
    mockMatchMedia(true); // Mobile
    render(<CustomersList />);

    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    expect(screen.getByTestId('mobile-cards')).toBeInTheDocument();
  });

  it('shows desktop layout on large screens', () => {
    mockMatchMedia(false); // Desktop
    render(<CustomersList />);

    expect(screen.getByRole('table')).toBeInTheDocument();
    expect(screen.queryByTestId('mobile-cards')).not.toBeInTheDocument();
  });
});
```

## MSW Mock Handlers

### Using Mock Handlers

Mock API responses are configured in `src/mocks/handlers.ts`.

```typescript
// handlers.ts
export const handlers = [
  http.get('/api/customers', () => {
    return HttpResponse.json({
      data: mockCustomers,
      pagination: { page: 1, limit: 10, total: 3, totalPages: 1 },
    });
  }),
];
```

### Overriding Handlers in Tests

```typescript
import { server } from '@/mocks/server';
import { http, HttpResponse } from 'msw';

it('handles empty state', async () => {
  // Override default handler
  server.use(
    http.get('/api/customers', () => {
      return HttpResponse.json({
        data: [],
        pagination: { page: 1, limit: 10, total: 0, totalPages: 0 },
      });
    })
  );

  render(<CustomersList />);

  await waitFor(() => {
    expect(screen.getByText(/no customers found/i)).toBeInTheDocument();
  });
});
```

### Error Responses

```typescript
it('handles server errors', async () => {
  server.use(
    http.get('/api/customers', () => {
      return HttpResponse.json(
        { message: 'Internal server error' },
        { status: 500 }
      );
    })
  );

  render(<CustomersList />);

  await waitFor(() => {
    expect(screen.getByText(/failed to load customers/i)).toBeInTheDocument();
  });
});
```

## Test Utilities

### Custom Render Function

The custom `render` function provides all necessary providers:

```typescript
import { render } from '@/test-utils';

// Automatically wraps with QueryClientProvider, SessionProvider, etc.
render(<MyComponent />);
```

### Custom Providers

```typescript
import { render, createTestQueryClient } from '@/test-utils';

const customQueryClient = createTestQueryClient();

render(<MyComponent />, {
  queryClient: customQueryClient,
  session: customSession,
});
```

### Utility Functions

```typescript
import {
  waitForLoadingToFinish,
  fillFormField,
  submitForm,
  expectErrorMessage,
} from '@/test-utils';

it('submits form successfully', async () => {
  const user = userEvent.setup();
  render(<LoginForm />);

  await fillFormField('Email', 'test@example.com', user);
  await fillFormField('Password', 'password123', user);
  await submitForm('Sign In', user);

  await waitForLoadingToFinish();
});
```

## Test Generation

### Generating Tests for New Pages

Use the test generation script for new modules:

```bash
node scripts/generate-tests.js
```

This generates test files for:
- List pages
- Detail pages
- New/Create pages
- Edit pages
- Simple pages

### Custom Test Templates

Edit `scripts/generate-tests.js` to customize test templates for your needs.

## Best Practices

### DO:
- ✅ Test user behavior, not implementation details
- ✅ Use accessible queries (getByRole, getByLabelText)
- ✅ Test error states and edge cases
- ✅ Write descriptive test names
- ✅ Group related tests with describe blocks
- ✅ Clean up side effects in afterEach
- ✅ Mock external dependencies (APIs, routers)
- ✅ Test accessibility features

### DON'T:
- ❌ Test implementation details
- ❌ Use brittle selectors (class names, IDs)
- ❌ Write overly complex tests
- ❌ Test third-party libraries
- ❌ Forget to wait for async operations
- ❌ Leave console errors/warnings unresolved
- ❌ Skip accessibility tests

## Troubleshooting

### Common Issues

#### Tests timing out
```typescript
// Increase timeout for specific tests
it('loads large dataset', async () => {
  // Test code
}, 10000); // 10 second timeout
```

#### Act warnings
```typescript
// Wrap state updates in waitFor
await waitFor(() => {
  expect(screen.getByText(/updated/i)).toBeInTheDocument();
});
```

#### MSW not intercepting requests
```typescript
// Ensure server is listening
beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

#### Next.js router errors
```typescript
// Mock useRouter in setupTests.ts or individual test
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
  }),
}));
```

### Debug Tips

```typescript
// View rendered DOM
import { screen } from '@testing-library/react';
screen.debug(); // Prints entire DOM
screen.debug(screen.getByRole('button')); // Prints specific element

// Check what queries are available
screen.logTestingPlaygroundURL();

// Pause test execution
import { screen } from '@testing-library/react';
await screen.findByText(/some text/i);
// debugger; // Uncomment to pause
```

## CI/CD Integration

### GitHub Actions Example

```yaml
- name: Run tests
  run: npm run test:ci

- name: Upload coverage
  uses: codecov/codecov-action@v3
  with:
    files: ./coverage/lcov.info
```

### Pre-commit Hooks

Tests run automatically before commits via Husky:

```json
{
  "husky": {
    "hooks": {
      "pre-commit": "npm run test:ci"
    }
  }
}
```

## Resources

- [React Testing Library Docs](https://testing-library.com/react)
- [Jest Documentation](https://jestjs.io/)
- [MSW Documentation](https://mswjs.io/)
- [Testing Library Queries](https://testing-library.com/docs/queries/about)
- [Common Testing Mistakes](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)

## Support

For issues or questions about testing:
1. Check this documentation
2. Review existing test files for patterns
3. Consult the testing library docs
4. Ask the team in #testing channel
