import { Test, TestingModule } from '@nestjs/testing';
import { MessagesService } from './messages.service';
import { MessagesRepository } from './messages.repository';
import { SalonsService } from '../salons/salons.service';

describe('MessagesService', () => {
  let service: MessagesService;
  const mockMessagesRepository = {
    create: jest.fn(),
    findById: jest.fn(),
    findAll: jest.fn(),
    findPaginatedWithFilters: jest.fn(),
    updateStatus: jest.fn(),
  };
  const mockSalonsService = { verifySalonOwnership: jest.fn(), findAll: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MessagesService,
        { provide: MessagesRepository, useValue: mockMessagesRepository },
        { provide: SalonsService, useValue: mockSalonsService },
      ],
    }).compile();

    service = module.get<MessagesService>(MessagesService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
