import { render, screen } from '@testing-library/react';
import KPI from '../KPI';

describe('KPI Component', () => {
  it('should render title and value correctly', () => {
    render(<KPI title="Test Title" value="100" />);
    
    expect(screen.getByText('Test Title')).toBeInTheDocument();
    expect(screen.getByText('100')).toBeInTheDocument();
  });

  it('should render number value correctly', () => {
    render(<KPI title="Count" value={42} />);
    
    expect(screen.getByText('Count')).toBeInTheDocument();
    expect(screen.getByText('42')).toBeInTheDocument();
  });

  it('should have correct styling classes', () => {
    render(<KPI title="Test" value="100" />);
    
    const container = screen.getByText('Test').closest('div');
    expect(container).toHaveClass('bg-white', 'p-4', 'rounded', 'shadow-sm');
  });

  it('should render title with correct styling', () => {
    render(<KPI title="Test Title" value="100" />);
    
    const title = screen.getByText('Test Title');
    expect(title).toHaveClass('text-sm', 'text-gray-500');
  });

  it('should render value with correct styling', () => {
    render(<KPI title="Test" value="100" />);
    
    const value = screen.getByText('100');
    expect(value).toHaveClass('text-2xl', 'font-bold', 'mt-1');
  });
});
