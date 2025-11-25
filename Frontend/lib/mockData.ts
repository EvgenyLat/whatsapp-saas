// Mock data for development and demo purposes
export const mockStats = {
  bookings: 24,
  revenue: 2840,
  clients: 18
};

export const mockBookings = [
  {
    id: '1',
    clientName: 'Анна Петрова',
    phone: '+7 (999) 123-45-67',
    service: 'Стрижка и укладка',
    startTs: '2024-01-15T10:00:00Z',
    status: 'confirmed' as const
  },
  {
    id: '2',
    clientName: 'Мария Сидорова',
    phone: '+7 (999) 234-56-78',
    service: 'Маникюр',
    startTs: '2024-01-15T14:30:00Z',
    status: 'pending' as const
  },
  {
    id: '3',
    clientName: 'Елена Козлова',
    phone: '+7 (999) 345-67-89',
    service: 'Массаж',
    startTs: '2024-01-15T16:00:00Z',
    status: 'confirmed' as const
  },
  {
    id: '4',
    clientName: 'Ольга Новикова',
    phone: '+7 (999) 456-78-90',
    service: 'Педикюр',
    startTs: '2024-01-16T11:00:00Z',
    status: 'cancelled' as const
  },
  {
    id: '5',
    clientName: 'Татьяна Морозова',
    phone: '+7 (999) 567-89-01',
    service: 'Стрижка',
    startTs: '2024-01-16T15:30:00Z',
    status: 'completed' as const
  }
];

export const mockServices = [
  {
    id: '1',
    name: 'Стрижка и укладка',
    duration: 60
  },
  {
    id: '2',
    name: 'Маникюр',
    duration: 45
  },
  {
    id: '3',
    name: 'Педикюр',
    duration: 60
  },
  {
    id: '4',
    name: 'Массаж',
    duration: 90
  },
  {
    id: '5',
    name: 'Макияж',
    duration: 30
  }
];

// Simulate API delay
export const simulateApiDelay = (ms: number = 500) => 
  new Promise(resolve => setTimeout(resolve, ms));
