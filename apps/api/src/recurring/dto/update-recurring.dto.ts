import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsEnum,
  IsOptional,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { FrequencyType } from './create-recurring.dto';

export class UpdateRecurringDto {
  @ApiPropertyOptional({ example: 'Loyer' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  label?: string;

  @ApiPropertyOptional({ example: -800 })
  @IsOptional()
  @IsNumber()
  amount?: number;

  @ApiPropertyOptional({ enum: FrequencyType })
  @IsOptional()
  @IsEnum(FrequencyType)
  frequency?: FrequencyType;

  @ApiPropertyOptional({ minimum: 0, maximum: 6 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(6)
  dayOfWeek?: number | null;

  @ApiPropertyOptional({ minimum: 1, maximum: 31 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(31)
  dayOfMonth?: number | null;

  @ApiPropertyOptional({ minimum: 1, maximum: 12 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(12)
  month?: number | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  categoryId?: string | null;
}
