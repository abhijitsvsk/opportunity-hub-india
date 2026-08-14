export type Opportunity = {
  id: string;
  title: string;
  type: string;
  description: string;
  source_url: string;
  deadline: string;
  domain_tags: string[];
  effort_level: string;
  competitiveness: string;
  eligibility?: any;
  created_at?: string;
};

export type UserSavedStatus = {
  opportunity_id: string;
  status: string;
};
