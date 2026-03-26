import { IsNotEmpty, IsOptional, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class MarkInAppNotificationReadDto {
  @ApiProperty({ description: 'Campaign/notification ID', example: 'notif_101' })
  @IsNotEmpty()
  @IsUUID()
  notificationId: string;

  @ApiPropertyOptional({ description: 'User ID (optional, taken from auth token when omitted)', example: 'user_101' })
  @IsOptional()
  @IsUUID()
  userId?: string;
}
