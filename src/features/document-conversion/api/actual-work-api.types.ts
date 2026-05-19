export interface ActualWorkAffectedWork {
  workId: number;
  workName: string;
  actualDates: string[];
}

export interface ActualWorkResponse {
  id: number;
  date: string;
  context: string;
  workTypeId: number;
  workTypeName: string;
  affectedWorks: ActualWorkAffectedWork[];
}

export interface ActualWorkCreateRequest {
  date: string;
  workTypeId: number;
  context: string;
}

export interface ActualWorkUpdateRequest {
  date?: string;
  workTypeId?: number;
  context?: string;
}
