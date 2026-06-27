import { ApiProperty } from '@nestjs/swagger';
import { IsArray, ValidateNested, IsString, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

class CategoryOrderItem {
  @ApiProperty()
  @IsString()
  id!: string;

  @ApiProperty()
  @IsInt()
  @Min(0)
  order!: number;
}

export class ReorderCategoriesDto {
  @ApiProperty({ type: [CategoryOrderItem] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CategoryOrderItem)
  items!: CategoryOrderItem[];
}
