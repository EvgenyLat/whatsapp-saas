import { render, screen } from '@testing-library/react';
// import { axe, toHaveNoViolations } from 'jest-axe';
import BookingTable from '../components/BookingTable';
import LoadingSpinner from '../components/LoadingSpinner';
import KPI from '../components/KPI';
import FormField from '../components/FormField';
import { Booking } from '../lib/api';

// Extend Jest matchers
// expect.extend(toHaveNoViolations);

const mockBookings: Booking[] = [
  {
    id: '1',
    clientName: 'John Doe',
    phone: '+1234567890',
    service: 'Haircut',
    startTs: '2024-01-15T10:00:00Z',
    status: 'confirmed'
  }
];

describe('Accessibility Tests', () => {
  // it('should not have accessibility violations in BookingTable', async () => {
  //   const { container } = render(
  //     <BookingTable data={mockBookings} onCancel={jest.fn()} />
  //   );
    
  //   const results = await axe(container);
  //   expect(results).toHaveNoViolations();
  // });

  // it('should not have accessibility violations in LoadingSpinner', async () => {
  //   const { container } = render(<LoadingSpinner />);
    
  //   const results = await axe(container);
  //   expect(results).toHaveNoViolations();
  // });

  // it('should not have accessibility violations in KPI', async () => {
  //   const { container } = render(
  //     <KPI title="Test KPI" value="100" />
  //   );
    
  //   const results = await axe(container);
  //   expect(results).toHaveNoViolations();
  // });

  // it('should not have accessibility violations in FormField', async () => {
  //   const { container } = render(
  //     <FormField label="Test Field" required>
  //       <input type="text" />
  //     </FormField>
  //   );
    
  //   const results = await axe(container);
  //   expect(results).toHaveNoViolations();
  // });

  it('should have proper table structure in BookingTable', () => {
    render(<BookingTable data={mockBookings} onCancel={jest.fn()} />);
    
    // Check for table element
    const table = screen.getByRole('table');
    expect(table).toBeInTheDocument();
    
    // Check for column headers
    expect(screen.getByRole('columnheader', { name: 'Client' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Phone' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Service' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Date & Time' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Status' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Actions' })).toBeInTheDocument();
  });

  it('should have proper button accessibility in BookingTable', () => {
    render(<BookingTable data={mockBookings} onCancel={jest.fn()} />);
    
    const cancelButton = screen.getByRole('button', { name: 'Cancel' });
    expect(cancelButton).toBeInTheDocument();
    expect(cancelButton).toHaveAttribute('type', 'button');
  });

  it('should have proper form field accessibility', () => {
    render(
      <FormField label="Test Field" required error="Test error">
        <input type="text" />
      </FormField>
    );
    
    const input = screen.getByRole('textbox');
    const label = screen.getByText('Test Field');
    
    expect(input).toBeInTheDocument();
    expect(label).toBeInTheDocument();
    expect(input).toHaveAttribute('aria-required', 'true');
  });

  it('should have proper loading spinner accessibility', () => {
    render(<LoadingSpinner />);
    
    const spinner = screen.getByRole('status', { hidden: true });
    expect(spinner).toBeInTheDocument();
  });

  it('should have proper color contrast for status badges', () => {
    render(<BookingTable data={mockBookings} onCancel={jest.fn()} />);
    
    const statusBadge = screen.getByText('Confirmed');
    expect(statusBadge).toHaveClass('text-green-800');
  });

  it('should support keyboard navigation', () => {
    render(<BookingTable data={mockBookings} onCancel={jest.fn()} />);
    
    const cancelButton = screen.getByRole('button', { name: 'Cancel' });
    expect(cancelButton).toBeInTheDocument();
    
    // Button should be focusable
    cancelButton.focus();
    expect(document.activeElement).toBe(cancelButton);
  });
});
