import { ApiProperty } from '@nestjs/swagger';
import { IsArray, ValidateNested, IsString, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

class GoalOrderItem {
  @ApiProperty()
  @IsString()
  id!: string;

  @ApiProperty()
  @IsInt()
  @Min(0)
  order!: number;
}

export class ReorderGoalsDto {
  @ApiProperty({ type: [GoalOrderItem] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GoalOrderItem)
  items!: GoalOrderItem[];
}
