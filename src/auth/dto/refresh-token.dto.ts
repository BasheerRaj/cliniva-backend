import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RefreshTokenDto {
  @ApiProperty({
    description: 'JWT refresh token',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    type: String,
  })
  @IsString({ message: 'Refresh token must be a string' })
  @IsNotEmpty({ message: 'Refresh token is required' })
  refresh_token: string;
}
