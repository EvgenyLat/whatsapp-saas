import { Test, TestingModule } from '@nestjs/testing';
import { TemplatesService } from './templates.service';
import { PrismaService } from '@database/prisma.service';
import { SalonsService } from '../salons/salons.service';

describe('TemplatesService', () => {
  let service: TemplatesService;
  const mockPrismaService = { template: { create: jest.fn(), findUnique: jest.fn(), findFirst: jest.fn(), findMany: jest.fn(), update: jest.fn(), delete: jest.fn() } };
  const mockSalonsService = { verifySalonOwnership: jest.fn(), findAll: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TemplatesService, { provide: PrismaService, useValue: mockPrismaService }, { provide: SalonsService, useValue: mockSalonsService }],
    }).compile();

    service = module.get<TemplatesService>(TemplatesService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
