import { Type } from 'class-transformer'
import { IsInt, IsOptional } from 'class-validator'

export class ListCampaignsDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  fieldId?: number
}
