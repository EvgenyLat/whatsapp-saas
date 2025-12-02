import { Test, TestingModule } from '@nestjs/testing';
import { ConversationsService } from './conversations.service';
import { ConversationsRepository } from './conversations.repository';
import { SalonsService } from '../salons/salons.service';

describe('ConversationsService', () => {
  let service: ConversationsService;
  const mockConversationsRepository = {
    findById: jest.fn(),
    findBySalonId: jest.fn(),
    findByMultipleSalonIds: jest.fn(),
    findAll: jest.fn(),
    update: jest.fn(),
  };
  const mockSalonsService = { verifySalonOwnership: jest.fn(), findAll: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConversationsService,
        { provide: ConversationsRepository, useValue: mockConversationsRepository },
        { provide: SalonsService, useValue: mockSalonsService },
      ],
    }).compile();

    service = module.get<ConversationsService>(ConversationsService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
