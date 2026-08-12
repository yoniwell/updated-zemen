export interface CreateFaqDto {
  question: string;
  answer: string;
  category?: string;
  order?: number;
  isActive?: boolean;
}

export interface CreateNewsDto {
  title: string;
  content: string;
  summary?: string;
  imageUrl?: string;
  publishedAt?: Date;
  isActive?: boolean;
}

export interface CreateServiceDto {
  title: string;
  description: string;
  icon?: string;
  order?: number;
  isActive?: boolean;
}

export interface CreateAnnouncementDto {
  title: string;
  content: string;
  type: string;
  startDate?: Date;
  endDate?: Date;
  isActive?: boolean;
}

// Re-use Partial for Update DTOs
export interface UpdateFaqDto extends Partial<CreateFaqDto> {}
export interface UpdateNewsDto extends Partial<CreateNewsDto> {}
export interface UpdateServiceDto extends Partial<CreateServiceDto> {}
export interface UpdateAnnouncementDto extends Partial<CreateAnnouncementDto> {}
