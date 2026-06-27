import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNumber, IsNotEmpty, IsDateString, IsBoolean, IsOptional, IsUrl } from 'class-validator';

export class CreateTransactionDto {
  @ApiProperty({ example: 'Salaire juin' })
  @IsString()
  @IsNotEmpty()
  label!: string;

  @ApiProperty({ example: 1500, description: 'Montant signé : positif = entrée, négatif = sortie' })
  @IsNumber()
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
  recurringCron?: string;

  @ApiPropertyOptional()
  @IsUrl()
  @IsOptional()
  attachmentUrl?: string;

  @ApiPropertyOptional({ description: "ID d'un objectif d'épargne — crée une contribution automatique" })
  @IsString()
  @IsOptional()
  goalId?: string;
}
