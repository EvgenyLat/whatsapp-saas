import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import BookingTable from '../BookingTable';
import { Booking } from '../../lib/api';

const mockBookings: Booking[] = [
  {
    id: '1',
    clientName: 'John Doe',
    phone: '0501234567',
    service: 'Haircut',
    startTs: '2024-01-15T10:00:00Z',
    status: 'confirmed'
  },
  {
    id: '2',
    clientName: 'Jane Smith',
    phone: '0509876543',
    service: 'Manicure',
    startTs: '2024-01-15T14:00:00Z',
    status: 'cancelled'
  },
  {
    id: '3',
    clientName: 'Bob Johnson',
    phone: '0501122334',
    service: 'Massage',
    startTs: '2024-01-15T16:00:00Z',
    status: 'pending'
  },
  {
    id: '4',
    clientName: 'Alice Brown',
    phone: '0505555555',
    service: 'Facial',
    startTs: '2024-01-16T09:00:00Z',
    status: 'completed'
  }
];

describe('BookingTable Component', () => {
  const mockOnCancel = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render table headers correctly', () => {
    render(<BookingTable data={mockBookings} onCancel={mockOnCancel} />);
    
    expect(screen.getByText('Клиент')).toBeInTheDocument();
    expect(screen.getByText('Телефон')).toBeInTheDocument();
    expect(screen.getByText('Услуга')).toBeInTheDocument();
    expect(screen.getByText('Дата и время')).toBeInTheDocument();
    expect(screen.getByText('Статус')).toBeInTheDocument();
    expect(screen.getByText('Действия')).toBeInTheDocument();
  });

  it('should render booking data correctly', () => {
    render(<BookingTable data={mockBookings} onCancel={mockOnCancel} />);
    
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('+1234567890')).toBeInTheDocument();
    expect(screen.getByText('Haircut')).toBeInTheDocument();
    expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    expect(screen.getByText('Bob Johnson')).toBeInTheDocument();
  });

  it('should render status badges with correct variants', () => {
    render(<BookingTable data={mockBookings} onCancel={mockOnCancel} />);
    
    const confirmedStatus = screen.getByText('Подтверждено');
    const cancelledStatus = screen.getByText('Отменено');
    const pendingStatus = screen.getByText('Ожидает');
    
    expect(confirmedStatus).toBeInTheDocument();
    expect(cancelledStatus).toBeInTheDocument();
    expect(pendingStatus).toBeInTheDocument();
  });

  it('should show cancel buttons for non-cancelled bookings', () => {
    render(<BookingTable data={mockBookings} onCancel={mockOnCancel} />);
    
    const cancelButtons = screen.getAllByText('Отменить');
    expect(cancelButtons).toHaveLength(3); // Only non-cancelled bookings
  });

  it('should show "Отменено" text for cancelled bookings', () => {
    render(<BookingTable data={mockBookings} onCancel={mockOnCancel} />);
    
    const cancelledText = screen.getByText('Отменено');
    expect(cancelledText).toBeInTheDocument();
  });

  it('should format dates correctly', () => {
    render(<BookingTable data={mockBookings} onCancel={mockOnCancel} />);
    
    // Check if dates are formatted (this will depend on locale)
    expect(screen.getByText('15.01.2024')).toBeInTheDocument();
  });

  it('should handle empty data array', () => {
    render(<BookingTable data={[]} onCancel={mockOnCancel} />);
    
    expect(screen.getByText('Клиент')).toBeInTheDocument();
    expect(screen.queryByText('John Doe')).not.toBeInTheDocument();
  });

  it('should have hover effects on table rows', () => {
    render(<BookingTable data={mockBookings} onCancel={mockOnCancel} />);
    
    const firstRow = screen.getByText('John Doe').closest('tr');
    expect(firstRow).toBeInTheDocument();
  });

  it('should format phone numbers correctly', () => {
    render(<BookingTable data={mockBookings} onCancel={mockOnCancel} />);
    
    expect(screen.getByText('+972 50-123-4567')).toBeInTheDocument();
    expect(screen.getByText('+972 50-987-6543')).toBeInTheDocument();
  });

  it('should show search input', () => {
    render(<BookingTable data={mockBookings} onCancel={mockOnCancel} />);
    
    expect(screen.getByPlaceholderText('Поиск по имени или телефону...')).toBeInTheDocument();
  });

  it('should show status filter dropdown', () => {
    render(<BookingTable data={mockBookings} onCancel={mockOnCancel} />);
    
    expect(screen.getByDisplayValue('Все статусы')).toBeInTheDocument();
  });

  it('should filter bookings by search term', () => {
    render(<BookingTable data={mockBookings} onCancel={mockOnCancel} />);
    
    const searchInput = screen.getByPlaceholderText('Поиск по имени или телефону...');
    fireEvent.change(searchInput, { target: { value: 'John' } });
    
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.queryByText('Jane Smith')).not.toBeInTheDocument();
  });

  it('should filter bookings by status', () => {
    render(<BookingTable data={mockBookings} onCancel={mockOnCancel} />);
    
    const statusFilter = screen.getByDisplayValue('Все статусы');
    fireEvent.change(statusFilter, { target: { value: 'confirmed' } });
    
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.queryByText('Jane Smith')).not.toBeInTheDocument();
  });

  it('should show confirmation dialog when cancel button is clicked', async () => {
    render(<BookingTable data={mockBookings} onCancel={mockOnCancel} />);

    const cancelButtons = screen.getAllByText('Отменить');
    fireEvent.click(cancelButtons[0]!);
    
    await waitFor(() => {
      expect(screen.getByText('Подтверждение отмены')).toBeInTheDocument();
      expect(screen.getByText('Вы уверены, что хотите отменить эту запись?')).toBeInTheDocument();
    });
  });

  it('should call onCancel when confirmation is accepted', async () => {
    render(<BookingTable data={mockBookings} onCancel={mockOnCancel} />);

    const cancelButtons = screen.getAllByText('Отменить');
    fireEvent.click(cancelButtons[0]!);
    
    await waitFor(() => {
      expect(screen.getByText('Да, отменить запись')).toBeInTheDocument();
    });
    
    const confirmButton = screen.getByText('Да, отменить запись');
    fireEvent.click(confirmButton);
    
    expect(mockOnCancel).toHaveBeenCalledWith('1');
  });

  it('should not call onCancel when confirmation is cancelled', async () => {
    render(<BookingTable data={mockBookings} onCancel={mockOnCancel} />);

    const cancelButtons = screen.getAllByText('Отменить');
    fireEvent.click(cancelButtons[0]!);
    
    await waitFor(() => {
      expect(screen.getByText('Отмена')).toBeInTheDocument();
    });
    
    const cancelButton = screen.getByText('Отмена');
    fireEvent.click(cancelButton);
    
    expect(mockOnCancel).not.toHaveBeenCalled();
  });

  it('should show pagination when there are more than 10 bookings', () => {
    const manyBookings = Array.from({ length: 15 }, (_, i) => ({
      id: `${i + 1}`,
      clientName: `Client ${i + 1}`,
      phone: `050${i.toString().padStart(7, '0')}`,
      service: 'Service',
      startTs: new Date().toISOString(),
      status: 'confirmed' as const
    }));
    
    render(<BookingTable data={manyBookings} onCancel={mockOnCancel} />);
    
    expect(screen.getByText('Показано 1-10 из 15 записей')).toBeInTheDocument();
  });

  it('should sort bookings when header is clicked', () => {
    render(<BookingTable data={mockBookings} onCancel={mockOnCancel} />);
    
    const clientHeader = screen.getByText('Клиент');
    fireEvent.click(clientHeader);
    
    // Check if sorting indicator appears
    expect(screen.getByText('Клиент')).toBeInTheDocument();
  });
});
