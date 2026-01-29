import { Module, Global } from '@nestjs/common';
import { ImageKitService } from './imagekit.service';

@Global()
@Module({
  providers: [ImageKitService],
  exports: [ImageKitService],
})
export class ImageKitModule {}
