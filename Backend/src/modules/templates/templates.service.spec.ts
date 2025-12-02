import { Test, TestingModule } from '@nestjs/testing';
import { TemplatesService } from './templates.service';
import { TemplatesRepository } from './templates.repository';
import { SalonsService } from '../salons/salons.service';

describe('TemplatesService', () => {
  let service: TemplatesService;
  const mockTemplatesRepository = {
    create: jest.fn(),
    findById: jest.fn(),
    findAll: jest.fn(),
    findBySalonId: jest.fn(),
    findByMultipleSalonIds: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    existsByNameAndLanguage: jest.fn(),
  };
  const mockSalonsService = { verifySalonOwnership: jest.fn(), findAll: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TemplatesService,
        { provide: TemplatesRepository, useValue: mockTemplatesRepository },
        { provide: SalonsService, useValue: mockSalonsService },
      ],
    }).compile();

    service = module.get<TemplatesService>(TemplatesService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
