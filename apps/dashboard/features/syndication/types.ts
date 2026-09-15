export interface Subscription {
  id: string;
  url: string;
  events: string[];
  active: boolean;
  createdAt: string;
}

export interface Delivery {
  id: string;
  entityType: string;
  entityId: string;
  action: string;
  status: string;
  attempts: number;
  responseCode: number | null;
  createdAt: string;
}
