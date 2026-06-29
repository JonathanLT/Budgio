import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNumber, IsNotEmpty, IsDateString, IsBoolean, IsOptional, IsUrl, Matches, Min, Max, MaxLength } from 'class-validator';

// Standard 5-field cron expression (minute hour day month weekday)
const CRON_REGEX = /^(\*|[0-9,\-\/]+)\s+(\*|[0-9,\-\/]+)\s+(\*|[0-9,\-\/]+)\s+(\*|[0-9,\-\/]+)\s+(\*|[0-6,\-\/]+)$/;

export class CreateTransactionDto {
  @ApiProperty({ example: 'Salaire juin' })
  @IsString()
  @IsNotEmpty()
  label!: string;

  @ApiProperty({ example: 1500, description: 'Montant signé : positif = entrée, négatif = sortie' })
  @IsNumber()
  @Min(-1_000_000_000)
  @Max(1_000_000_000)
  amount!: number;

  @ApiPropertyOptional({ description: 'ID de la catégorie du foyer' })
  @IsString()
  @IsOptional()
  categoryId?: string;

  @ApiProperty({ example: '2026-06-15T00:00:00.000Z' })
  @IsDateString()
  date!: string;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  isRecurring?: boolean;

  @ApiPropertyOptional({ example: '0 0 5 * *' })
  @IsString()
  @IsOptional()
  @Matches(CRON_REGEX, { message: 'recurringCron doit être une expression cron valide (5 champs)' })
  recurringCron?: string;

  @ApiPropertyOptional()
  @IsUrl({ require_protocol: true, protocols: ['https'] })
  @MaxLength(2048)
  @IsOptional()
  attachmentUrl?: string;

  @ApiPropertyOptional({ description: "ID d'un objectif d'épargne — crée une contribution automatique" })
  @IsString()
  @IsOptional()
  goalId?: string;
}
