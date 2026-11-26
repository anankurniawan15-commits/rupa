export type ReportStatus = 'open' | 'down' | 'dismissed';

export interface Report {
  id: string;
  pid: string;
  reason: string;
  reporter: string;
  date: string;
  detail: string;
  status: ReportStatus;
}

export interface Dispute {
  id: string;
  order: string;
  buyer: string;
  seller: string;
  date: string;
  reason: string;
  detail: string;
  amount: number;
  status: 'open' | 'closed';
  decision: string;
}

export interface ThreadMessage {
  from: 'me' | 'them';
  text: string;
  time: string;
}
