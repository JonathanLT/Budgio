import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
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

export enum FrequencyType {
  DAILY    = 'DAILY',
  WEEKDAYS = 'WEEKDAYS',
  WEEKLY   = 'WEEKLY',
  MONTHLY  = 'MONTHLY',
  YEARLY   = 'YEARLY',
}

export class CreateRecurringDto {
  @ApiProperty({ example: 'Loyer' })
  @IsString()
  @IsNotEmpty()
  label!: string;

  @ApiProperty({ example: -800, description: 'Montant signé (négatif = sortie, positif = entrée)' })
  @IsNumber()
  amount!: number;

  @ApiProperty({ enum: FrequencyType })
  @IsEnum(FrequencyType)
  frequency!: FrequencyType;

  @ApiPropertyOptional({ description: '0=dim 1=lun … 6=sam — requis pour WEEKLY', minimum: 0, maximum: 6 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(6)
  dayOfWeek?: number;

  @ApiPropertyOptional({ description: 'Jour du mois 1-31 — requis pour MONTHLY et YEARLY', minimum: 1, maximum: 31 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(31)
  dayOfMonth?: number;

  @ApiPropertyOptional({ description: 'Mois 1-12 — requis pour YEARLY', minimum: 1, maximum: 12 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(12)
  month?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  categoryId?: string;
}
