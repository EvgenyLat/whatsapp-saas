import { Test, TestingModule } from '@nestjs/testing';
import { ConversationsService } from './conversations.service';
import { PrismaService } from '@database/prisma.service';
import { SalonsService } from '../salons/salons.service';

describe('ConversationsService', () => {
  let service: ConversationsService;
  const mockPrismaService = {
    conversation: { findUnique: jest.fn(), findMany: jest.fn(), update: jest.fn() },
  };
  const mockSalonsService = { verifySalonOwnership: jest.fn(), findAll: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConversationsService,
        { provide: PrismaService, useValue: mockPrismaService },
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
