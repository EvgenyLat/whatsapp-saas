import { render, screen } from '@testing-library/react';
import { act } from 'react-dom/test-utils';
import BookingTable from '../components/BookingTable';
import { Booking } from '../lib/api';

// Generate large dataset for performance testing
const generateLargeBookingDataset = (count: number): Booking[] => {
  return Array.from({ length: count }, (_, index) => ({
    id: `booking-${index}`,
    clientName: `Client ${index}`,
    phone: `+123456789${index}`,
    service: `Service ${index % 10}`,
    startTs: new Date(Date.now() + index * 60000).toISOString(),
    status: ['confirmed', 'pending', 'cancelled', 'completed'][index % 4] as any,
  }));
};

describe('Performance Tests', () => {
  it('should render large booking table efficiently', () => {
    const largeDataset = generateLargeBookingDataset(1000);
    const mockOnCancel = jest.fn();

    const startTime = performance.now();
    
    render(<BookingTable data={largeDataset} onCancel={mockOnCancel} />);
    
    const endTime = performance.now();
    const renderTime = endTime - startTime;

    // Should render within reasonable time (less than 1 second)
    expect(renderTime).toBeLessThan(1000);
    
    // Should render all items
    expect(screen.getAllByText(/Client \d+/)).toHaveLength(1000);
  });

  it('should handle rapid state updates efficiently', () => {
    const { rerender } = render(<BookingTable data={[]} onCancel={jest.fn()} />);
    
    const startTime = performance.now();
    
    // Simulate rapid updates
    for (let i = 0; i < 100; i++) {
      const dataset = generateLargeBookingDataset(100);
      act(() => {
        rerender(<BookingTable data={dataset} onCancel={jest.fn()} />);
      });
    }
    
    const endTime = performance.now();
    const totalTime = endTime - startTime;

    // Should handle rapid updates efficiently
    expect(totalTime).toBeLessThan(2000);
  });

  it('should not cause memory leaks with frequent renders', () => {
    const initialMemory = (performance as any).memory?.usedJSHeapSize || 0;
    
    // Render and unmount multiple times
    for (let i = 0; i < 50; i++) {
      const { unmount } = render(
        <BookingTable data={generateLargeBookingDataset(100)} onCancel={jest.fn()} />
      );
      unmount();
    }
    
    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }
    
    const finalMemory = (performance as any).memory?.usedJSHeapSize || 0;
    const memoryIncrease = finalMemory - initialMemory;
    
    // Memory increase should be reasonable (less than 10MB)
    expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024);
  });
});
