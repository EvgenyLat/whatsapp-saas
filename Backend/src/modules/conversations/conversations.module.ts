import { Module, forwardRef } from '@nestjs/common';
import { DatabaseModule } from '@database/database.module';
import { SalonsModule } from '../salons/salons.module';
import { ConversationsService } from './conversations.service';
import { ConversationsController } from './conversations.controller';
import { ConversationsRepository } from './conversations.repository';

@Module({
  imports: [DatabaseModule, forwardRef(() => SalonsModule)],
  providers: [ConversationsService, ConversationsRepository],
  controllers: [ConversationsController],
  exports: [ConversationsService, ConversationsRepository],
})
export class ConversationsModule {}
