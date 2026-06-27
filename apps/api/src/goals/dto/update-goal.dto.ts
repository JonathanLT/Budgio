import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsNumber, IsPositive, IsOptional, IsDateString, IsBoolean } from 'class-validator';

export class UpdateGoalDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @IsPositive()
  targetAmount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  deadline?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isCompleted?: boolean;
}
