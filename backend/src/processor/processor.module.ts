import { Module } from '@nestjs/common';
import { MockProcessorService } from './mock-processor.service';

@Module({
  providers: [MockProcessorService],
  exports: [MockProcessorService],
})
export class ProcessorModule {}