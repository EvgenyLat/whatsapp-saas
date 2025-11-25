import { render, screen } from '@testing-library/react';
import FormField from '../FormField';

describe('FormField Component', () => {
  it('should render label correctly', () => {
    render(
      <FormField label="Test Label">
        <input />
      </FormField>
    );
    
    expect(screen.getByText('Test Label')).toBeInTheDocument();
  });

  it('should show required asterisk when required prop is true', () => {
    render(
      <FormField label="Test Label" required>
        <input />
      </FormField>
    );
    
    expect(screen.getByText('*')).toBeInTheDocument();
  });

  it('should not show required asterisk when required prop is false', () => {
    render(
      <FormField label="Test Label" required={false}>
        <input />
      </FormField>
    );
    
    expect(screen.queryByText('*')).not.toBeInTheDocument();
  });

  it('should render error message when error prop is provided', () => {
    render(
      <FormField label="Test Label" error="This is an error">
        <input />
      </FormField>
    );
    
    expect(screen.getByText('This is an error')).toBeInTheDocument();
  });

  it('should not render error message when error prop is not provided', () => {
    render(
      <FormField label="Test Label">
        <input />
      </FormField>
    );
    
    expect(screen.queryByText('This is an error')).not.toBeInTheDocument();
  });

  it('should render children correctly', () => {
    render(
      <FormField label="Test Label">
        <input data-testid="test-input" />
      </FormField>
    );
    
    expect(screen.getByTestId('test-input')).toBeInTheDocument();
  });

  it('should apply custom className', () => {
    render(
      <FormField label="Test Label" className="custom-class">
        <input />
      </FormField>
    );
    
    const container = screen.getByText('Test Label').closest('div');
    expect(container).toHaveClass('custom-class');
  });

  it('should have correct error styling', () => {
    render(
      <FormField label="Test Label" error="Error message">
        <input />
      </FormField>
    );
    
    const error = screen.getByText('Error message');
    expect(error).toHaveClass('text-sm', 'text-red-600');
  });
});
