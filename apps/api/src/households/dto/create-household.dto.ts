import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class CreateHouseholdDto {
  @ApiProperty({ example: 'Famille Dupont' })
  @IsString()
  @MinLength(2)
  name!: string;
}
