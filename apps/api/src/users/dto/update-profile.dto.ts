import { IsIn } from 'class-validator';

const THEMES = ['clair', 'sombre', 'hc-clair', 'hc-sombre', 'matrix', 'rainbow'] as const;

export class UpdateProfileDto {
  @IsIn(THEMES)
  theme!: (typeof THEMES)[number];
}
