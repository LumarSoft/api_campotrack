import { Type } from 'class-transformer'
import { IsInt, IsOptional } from 'class-validator'

export class ListFinanceDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  fieldId?: number

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  campaignId?: number
}
