import { IsDateString } from 'class-validator';

/** Schedule payload: ISO instant in the future (future-ness enforced in service → 422). */
export class ScheduleDto {
  @IsDateString()
  scheduledAt!: string;
}
