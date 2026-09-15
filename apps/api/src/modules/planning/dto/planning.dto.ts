import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ListQueryDto } from '../../../common/dto/list-query.dto';
import { PLANNING_PRIORITIES, PLANNING_STATUSES, PLANNING_TYPES } from '../../../common/planning-transitions';

const toBoolean = ({ value }: { value: unknown }) => {
  if (value === undefined || value === null || value === '') return undefined;
  if (value === true || value === 'true') return true;
  if (value === false || value === 'false') return false;
  return value;
};

export class CreatePlanningDto {
  @IsIn([...PLANNING_TYPES])
  type!: string;

  @IsString()
  @MinLength(3)
  @MaxLength(200)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @IsOptional()
  @IsUUID()
  assigneeId?: string;

  @IsOptional()
  @IsUUID()
  reviewerId?: string;

  @IsOptional()
  @IsIn([...PLANNING_PRIORITIES])
  priority?: string;

  @IsOptional()
  @IsDateString()
  dueAt?: string;

  @IsOptional()
  @IsIn(['article', 'opinion'])
  entityType?: string;

  @IsOptional()
  @IsUUID()
  entityId?: string;
}

export class UpdatePlanningDto {
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(200)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string | null;

  @IsOptional()
  @IsUUID()
  categoryId?: string | null;

  @IsOptional()
  @IsUUID()
  assigneeId?: string | null;

  @IsOptional()
  @IsUUID()
  reviewerId?: string | null;

  @IsOptional()
  @IsIn([...PLANNING_PRIORITIES])
  priority?: string;

  @IsOptional()
  @IsDateString()
  dueAt?: string | null;

  @IsOptional()
  @IsIn(['article', 'opinion'])
  entityType?: string | null;

  @IsOptional()
  @IsUUID()
  entityId?: string | null;
}

export class PlanningQueryDto extends ListQueryDto {
  @IsOptional()
  @IsIn([...PLANNING_STATUSES])
  status?: string;

  @IsOptional()
  @IsIn([...PLANNING_TYPES])
  type?: string;

  @IsOptional()
  @IsUUID()
  assignee?: string;

  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  overdue?: boolean;

  @IsOptional()
  @IsString()
  q?: string;
}

export class CalendarQueryDto {
  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;
}

export class AssignPlanningDto {
  @IsUUID()
  assigneeId!: string;

  @IsOptional()
  @IsUUID()
  reviewerId?: string;
}
