import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class UpdateHouseholdDto {
  @ApiProperty({ example: 'Famille Martin' })
  @IsString()
  @MinLength(2)
  name!: string;
}
