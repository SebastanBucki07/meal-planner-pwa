import { NewWeightLogDTO, WeightEntry } from '../models';

export class WeightLogMapper {
  static toDomain(dto: NewWeightLogDTO): WeightEntry {
    return {
      id: dto.id,
      date: dto.date,
      weight: Number(dto.weight)
    };
  }
}
