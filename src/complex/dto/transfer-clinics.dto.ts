import { IsNotEmpty, IsString, IsArray, ArrayMinSize } from 'class-validator';

export class TransferClinicsDto {
  @IsNotEmpty()
  @IsString()
  targetComplexId: string;

  @IsNotEmpty()
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  clinicIds: string[];
}
