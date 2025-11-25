import { Module, forwardRef } from '@nestjs/common';
import { DatabaseModule } from '@database/database.module';
import { SalonsModule } from '../salons/salons.module';
import { MessagesService } from './messages.service';
import { MessagesController } from './messages.controller';
import { MessagesRepository } from './messages.repository';

@Module({
  imports: [DatabaseModule, forwardRef(() => SalonsModule)],
  providers: [MessagesService, MessagesRepository],
  controllers: [MessagesController],
  exports: [MessagesService, MessagesRepository],
})
export class MessagesModule {}
