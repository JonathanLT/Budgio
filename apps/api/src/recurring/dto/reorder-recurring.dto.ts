import { ApiProperty } from '@nestjs/swagger';
import { IsArray, ValidateNested, IsString, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

class RecurringOrderItem {
  @ApiProperty()
  @IsString()
  id!: string;

  @ApiProperty()
  @IsInt()
  @Min(0)
  order!: number;
}

export class ReorderRecurringDto {
  @ApiProperty({ type: [RecurringOrderItem] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RecurringOrderItem)
  items!: RecurringOrderItem[];
}
