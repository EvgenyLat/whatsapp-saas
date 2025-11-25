# Quick Test Guide

Fast reference for running and writing tests in the WhatsApp SaaS Frontend.

## Quick Start

```bash
# Run all tests
npm test

# Run specific test file
npm test -- page.test.tsx

# Run tests for a module
npm test -- customers

# Watch mode
npm run test:watch

# Coverage report
npm run test:coverage
```

## Test File Locations

```
src/app/
├── (auth)/
│   ├── login/__tests__/page.test.tsx
│   ├── register/__tests__/page.test.tsx
│   └── forgot-password/__tests__/page.test.tsx
└── (dashboard)/dashboard/
    ├── customers/__tests__/page.test.tsx
    ├── staff/__tests__/page.test.tsx
    ├── services/__tests__/page.test.tsx
    ├── templates/__tests__/page.test.tsx
    ├── bookings/__tests__/page.test.tsx
    ├── messages/__tests__/page.test.tsx
    ├── analytics/__tests__/page.test.tsx
    └── settings/__tests__/page.test.tsx
```

## Quick Test Template

```typescript
import { render, screen, waitFor, userEvent } from '@/test-utils';
import MyPage from '../page';

describe('MyPage', () => {
  it('renders correctly', () => {
    render(<MyPage />);
    expect(screen.getByRole('heading')).toBeInTheDocument();
  });

  it('handles user interaction', async () => {
    const user = userEvent.setup();
    render(<MyPage />);

    await user.click(screen.getByRole('button', { name: /submit/i }));

    await waitFor(() => {
      expect(screen.getByText(/success/i)).toBeInTheDocument();
    });
  });
});
```

## Common Queries

```typescript
// By role (preferred)
screen.getByRole('button', { name: /submit/i })
screen.getByRole('textbox', { name: /email/i })
screen.getByRole('heading', { name: /title/i })

// By label
screen.getByLabelText(/email/i)

// By text
screen.getByText(/welcome/i)

// By placeholder
screen.getByPlaceholderText(/search/i)
```

## Common Assertions

```typescript
// Presence
expect(element).toBeInTheDocument()
expect(element).not.toBeInTheDocument()

// Visibility
expect(element).toBeVisible()
expect(element).not.toBeVisible()

// State
expect(element).toBeDisabled()
expect(element).toBeEnabled()
expect(element).toHaveValue('text')

// Attributes
expect(element).toHaveAttribute('href', '/path')
expect(element).toHaveClass('active')

// Text content
expect(element).toHaveTextContent(/pattern/i)
```

## User Interactions

```typescript
const user = userEvent.setup();

// Click
await user.click(button);

// Type
await user.type(input, 'text');

// Clear and type
await user.clear(input);
await user.type(input, 'new text');

// Keyboard
await user.tab();
await user.keyboard('{Enter}');

// Select
await user.selectOptions(select, 'value');

// Checkbox
await user.click(checkbox);
```

## Async Testing

```typescript
// Wait for element to appear
await waitFor(() => {
  expect(screen.getByText(/loaded/i)).toBeInTheDocument();
});

// Wait for element to disappear
await waitFor(() => {
  expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
});

// Find queries (built-in wait)
const element = await screen.findByText(/appeared/i);

// Custom timeout
await waitFor(() => {
  // assertions
}, { timeout: 5000 });
```

## Mocking APIs

```typescript
import { server } from '@/mocks/server';
import { http, HttpResponse } from 'msw';

// Override default handler
server.use(
  http.get('/api/endpoint', () => {
    return HttpResponse.json({ data: [] });
  })
);

// Error response
server.use(
  http.get('/api/endpoint', () => {
    return HttpResponse.json(
      { message: 'Error' },
      { status: 500 }
    );
  })
);
```

## Debug Tips

```typescript
// Print DOM
screen.debug();

// Print specific element
screen.debug(screen.getByRole('button'));

// Get testing playground URL
screen.logTestingPlaygroundURL();

// Check available queries
screen.getByRole(''); // Will show available roles
```

## Coverage Commands

```bash
# Generate coverage report
npm run test:coverage

# View HTML report
open coverage/lcov-report/index.html   # macOS
start coverage/lcov-report/index.html  # Windows

# Check coverage summary
npm test -- --coverage --coverageReporters=text
```

## Common Patterns

### Form Testing
```typescript
it('submits form', async () => {
  const user = userEvent.setup();
  render(<MyForm />);

  await user.type(screen.getByLabelText(/email/i), 'test@example.com');
  await user.type(screen.getByLabelText(/password/i), 'password123');
  await user.click(screen.getByRole('button', { name: /submit/i }));

  await waitFor(() => {
    expect(screen.getByText(/success/i)).toBeInTheDocument();
  });
});
```

### Navigation Testing
```typescript
const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

it('navigates on click', async () => {
  const user = userEvent.setup();
  render(<MyComponent />);

  await user.click(screen.getByRole('link', { name: /details/i }));

  expect(mockPush).toHaveBeenCalledWith('/details');
});
```

### Error Testing
```typescript
it('displays error message', async () => {
  server.use(
    http.get('/api/data', () => {
      return HttpResponse.json({ error: 'Failed' }, { status: 500 });
    })
  );

  render(<MyComponent />);

  await waitFor(() => {
    expect(screen.getByText(/failed/i)).toBeInTheDocument();
  });
});
```

### Loading State Testing
```typescript
it('shows loading state', async () => {
  render(<MyComponent />);

  expect(screen.getByText(/loading/i)).toBeInTheDocument();

  await waitFor(() => {
    expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
  });

  expect(screen.getByText(/loaded data/i)).toBeInTheDocument();
});
```

## Troubleshooting

### Test fails with "not wrapped in act()"
```typescript
// Wrap async operations in waitFor
await waitFor(() => {
  expect(screen.getByText(/text/i)).toBeInTheDocument();
});
```

### Can't find element
```typescript
// Use findBy for async elements
const element = await screen.findByText(/text/i);

// Check if element exists without throwing
const element = screen.queryByText(/text/i);
expect(element).toBeNull();
```

### Mock not working
```typescript
// Ensure beforeEach clears mocks
beforeEach(() => {
  jest.clearAllMocks();
});

// Reset MSW handlers
afterEach(() => {
  server.resetHandlers();
});
```

## Files Reference

- **Test Utils**: `src/test-utils/index.tsx`
- **Mock Handlers**: `src/mocks/handlers.ts`
- **Setup File**: `src/setupTests.ts`
- **Jest Config**: `jest.config.js`
- **Full Guide**: `TESTING.md`

## Quick Commands

```bash
# Run single test file
npm test -- login.test.tsx

# Run tests matching pattern
npm test -- "validates email"

# Run with coverage
npm test -- --coverage

# Run in watch mode
npm test -- --watch

# Update snapshots
npm test -- -u

# Run only changed files
npm test -- --onlyChanged

# Verbose output
npm test -- --verbose
```

---

For comprehensive documentation, see **TESTING.md**
