export type DesignApplication =
  | 'racing'
  | 'freestyle'
  | 'cinema'
  | 'long-range'
  | 'heavy-lift'
  | 'industrial';

export interface DesignBrief {
  application: DesignApplication;
  payloadG: number;
  flightTimeMin: number;
  budgetInr: number;
  material: 'carbon' | 'hybrid' | 'tpu' | 'titanium';
  manufacturing: '3d-print' | 'cnc' | 'hybrid';
  notes?: string;
}

export type AgentStepId = 'requirements' | 'benchmark' | 'plan' | 'cad' | 'evaluate' | 'review';
export type StepStatus = 'queued' | 'running' | 'done' | 'failed';
export type JobStatus = 'queued' | 'running' | 'done' | 'failed';

export interface AgentStep {
  id: AgentStepId;
  label: string;
  status: StepStatus;
  detail?: string;
}

export interface DesignPartIds {
  frameId: string;
  motorId: string;
  batteryId: string;
  propellerId: string;
  escId: string;
  cameraId: string;
  canopyId: string;
  whoopId: string;
}

export interface ChassisParams {
  wheelbaseMm: number;
  motorCageDiameter: number;
  motorCageDepth: number;
  batteryDimensions: [number, number];
  strutCount: number;
  wallThickness: number;
  material: DesignBrief['material'];
  manufacturing: DesignBrief['manufacturing'];
  motorMounts: number;
}

export interface BomLine {
  label: string;
  detail: string;
  price: number;
}

export interface DesignAlternative {
  id: string;
  name: string;
  tagline: string;
  score: number;
  chassisParams: ChassisParams;
  partIds: DesignPartIds;
  bom: BomLine[];
  specs: {
    totalWeight: number;
    maxThrust: number;
    thrustToWeight: number;
    estimatedFlightTime: number;
    maxSpeed: number;
    buildCost: number;
  };
  safety: { severity: 'pass' | 'warn' | 'fail'; title: string; detail: string }[];
  justification: string;
  stlUrl: string | null;
  scadUrl: string | null;
}

export interface DesignJob {
  id: string;
  status: JobStatus;
  createdAt: string;
  updatedAt: string;
  brief: DesignBrief;
  steps: AgentStep[];
  alternatives: DesignAlternative[];
  error?: string;
}

export interface MemoryProject {
  jobId: string;
  createdAt: string;
  application: DesignApplication;
  bestScore: number;
  alternativeCount: number;
  hasStl: boolean;
}
