import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsNumber, IsPositive, IsOptional, IsDateString } from 'class-validator';

export class CreateGoalDto {
  @ApiProperty({ example: 'Vacances Italie' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({ example: 2000 })
  @IsNumber()
  @IsPositive()
  targetAmount!: number;

  @ApiPropertyOptional({ example: '2026-08-01' })
  @IsOptional()
  @IsDateString()
  deadline?: string;
}
