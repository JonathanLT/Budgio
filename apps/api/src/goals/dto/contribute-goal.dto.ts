import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsPositive, IsOptional, IsString } from 'class-validator';

export class ContributeGoalDto {
  @ApiProperty({ example: 250 })
  @IsNumber()
  @IsPositive()
  amount!: number;

  @ApiPropertyOptional({ example: 'Virement épargne janvier' })
  @IsOptional()
  @IsString()
  note?: string;
}
