import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateMasterDto } from './create-master.dto';

export class UpdateMasterDto extends PartialType(
  OmitType(CreateMasterDto, ['salon_id'] as const),
) {}
