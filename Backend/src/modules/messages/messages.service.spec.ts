import { Test, TestingModule } from '@nestjs/testing';
import { MessagesService } from './messages.service';
import { PrismaService } from '@database/prisma.service';
import { SalonsService } from '../salons/salons.service';

describe('MessagesService', () => {
  let service: MessagesService;
  const mockPrismaService = { message: { create: jest.fn(), findUnique: jest.fn(), findMany: jest.fn(), count: jest.fn(), update: jest.fn() } };
  const mockSalonsService = { verifySalonOwnership: jest.fn(), findAll: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MessagesService, { provide: PrismaService, useValue: mockPrismaService }, { provide: SalonsService, useValue: mockSalonsService }],
    }).compile();

    service = module.get<MessagesService>(MessagesService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
