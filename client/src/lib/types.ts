export type ScreenStatus = 'AVAILABLE' | 'RUNNING' | 'PAUSED' | 'CHECKOUT' | 'MAINTENANCE';

export interface ExtraLine {
  id: string;
  productId: string | null;
  name: string;
  unitPriceFils: number;
  quantity: number;
  totalFils: number;
}

export interface SessionDto {
  id: string;
  screenId: string;
  status: string;
  billingMode: string;
  startTime: string;
  endTime: string | null;
  plannedDurationSeconds: number | null;
  actualDurationSeconds: number;
  pricingRuleName: string;
  billingMethod: string;
  blocksJson: string;
  hourlyRateFils: number;
  gamingCostFils: number;
  extrasCostFils: number;
  discountFils: number;
  totalFils: number;
  paymentStatus: string;
  notes: string | null;
  remainingSeconds: number | null;
  timeExpired: boolean;
  closedAt: string | null;
  extras: ExtraLine[];
  screenName?: string;
  paymentMethod?: string | null;
  amountReceivedFils?: number | null;
  changeFils?: number | null;
}

export interface ScreenCard {
  id: string;
  name: string;
  consoleType: string;
  active: boolean;
  maintenance: boolean;
  status: ScreenStatus;
  hourlyRateFils: number;
  billingMethod: string;
  blocksJson: string;
  pricingRuleName: string;
  session: SessionDto | null;
}

export interface ReportDto {
  start: string;
  end: string;
  gamingRevenueFils: number;
  extrasRevenueFils: number;
  totalRevenueFils: number;
  sessionCount: number;
  totalGamingSeconds: number;
  averageSessionSeconds: number;
  averageTransactionFils: number;
  screens: {
    screenId: string;
    name: string;
    revenueFils: number;
    sessions: number;
    seconds: number;
    averageRevenueFils: number;
  }[];
  products: { name: string; quantity: number; revenueFils: number }[];
}

export interface DashboardDto {
  today: ReportDto;
  activeSessions: number;
  availableScreens: number;
  settings: {
    businessName: string;
    soundNotifications: string;
    lowTimeWarningMinutes: string;
  };
  screens: ScreenCard[];
}

export interface ProductDto {
  id: string;
  name: string;
  category: string;
  priceFils: number;
  active: boolean;
  stockQuantity: number | null;
}

export interface PricingRuleDto {
  id: string;
  name: string;
  billingMethod: string;
  hourlyRateFils: number;
  blocksJson: string;
  active: boolean;
}

export interface ScreenDto {
  id: string;
  name: string;
  consoleType: string;
  pricingRuleId: string;
  active: boolean;
  maintenance: boolean;
  pricingRule: PricingRuleDto;
}
