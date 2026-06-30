import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { RequestUser } from '../../common/types/authenticated-request';
import { CompleteUploadDto, UploadAuthorizationDto } from './dto/media.dto';
import { MediaService } from './media.service';

@Controller('media')
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  @Post('upload-authorization')
  @Permissions('media.upload.self')
  authorize(@CurrentUser() user: RequestUser, @Body() dto: UploadAuthorizationDto) {
    return this.mediaService.createUploadAuthorization(user, dto);
  }

  @Post(':id/complete')
  @Permissions('media.upload.self')
  complete(@CurrentUser() user: RequestUser, @Param('id') id: string, @Body() dto: CompleteUploadDto) {
    return this.mediaService.complete(user, id, dto.publicId);
  }

  @Get(':id')
  @Permissions('media.read.self')
  findOne(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.mediaService.findOwned(user, id);
  }

  @Get(':id/view-url')
  @Permissions('media.read.self')
  viewUrl(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.mediaService.viewUrl(user, id);
  }
}
