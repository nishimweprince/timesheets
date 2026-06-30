import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MediaAsset } from './entities/media-asset.entity';
import { CloudinaryService } from './cloudinary.service';
import { MediaService } from './media.service';
import { MediaController } from './media.controller';

@Module({
  imports: [TypeOrmModule.forFeature([MediaAsset])],
  controllers: [MediaController],
  providers: [CloudinaryService, MediaService],
  exports: [MediaService]
})
export class MediaModule {}
