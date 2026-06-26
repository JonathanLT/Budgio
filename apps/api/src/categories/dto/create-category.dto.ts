import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, Matches } from 'class-validator';

export class CreateCategoryDto {
  @ApiProperty({ example: 'Animaux' })
  @IsString()
  @IsNotEmpty()
  label!: string;

  @ApiProperty({ example: '#f97316', description: 'Couleur hex (#rrggbb)' })
  @IsString()
  @Matches(/^#[0-9a-fA-F]{6}$/, { message: 'color doit être une valeur hex valide (#rrggbb)' })
  color!: string;
}
