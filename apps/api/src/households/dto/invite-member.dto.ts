import { ApiProperty } from '@nestjs/swagger';
import { IsEmail } from 'class-validator';

export class InviteMemberDto {
  @ApiProperty({ example: 'marie@example.com' })
  @IsEmail()
  email!: string;
}
