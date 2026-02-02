import { IsNotEmpty, IsString } from 'class-validator';

export class AssignPICDto {
  @IsNotEmpty()
  @IsString()
  userId: string;
}
