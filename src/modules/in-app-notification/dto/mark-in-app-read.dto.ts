import { IsNotEmpty, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class MarkInAppNotificationReadDto {
  @ApiProperty({ description: 'Campaign/notification ID', example: 'notif_101' })
  @IsNotEmpty()
  @IsUUID()
  notificationId: string;

  @ApiProperty({ description: 'User ID', example: 'user_101' })
  @IsNotEmpty()
  @IsUUID()
  userId: string;
}
