export interface DroneFrame {
  id: string;
  name: string;
  type: 'quad' | 'hexa' | 'octo' | 'tri';
  weight: number; // grams
  maxPayload: number; // grams
  armLength: number; // mm
  price: number; // INR
  materials: string[];
  dimensions: {
    length: number;
    width: number;
    height: number;
  };
  tags: string[];
  image?: string;
  motorMounts: number;
}

export interface Motor {
  id: string;
  name: string;
  kv: number; // RPM per volt
  weight: number; // grams
  thrustMax: number; // grams at max throttle
  currentMax: number; // amps
  voltage: string; // e.g. "3S-6S"
  price: number; // INR
  tags: string[];
  efficiency: number; // thrust per watt
  diameter: number; // mm
  height: number; // mm
}

export interface Battery {
  id: string;
  name: string;
  capacity: number; // mAh
  voltage: number; // nominal voltage
  cells: number; // 3S, 4S, 6S etc
  weight: number; // grams
  maxDischarge: number; // C rating
  price: number; // INR
  tags: string[];
  estimatedFlightTime: number; // estimated minutes at hover
}

export interface Propeller {
  id: string;
  name: string;
  diameter: number; // inches
  pitch: number; // inches
  weight: number; // grams
  material: string;
  price: number; // INR
  tags: string[];
  maxRPM: number;
}

export interface ESC {
  id: string;
  name: string;
  ampRating: number; // amps continuous
  voltage: string; // e.g. "3S-6S"
  weight: number; // grams
  protocol: 'PWM' | 'OneShot' | 'DShot';
  price: number; // INR
  tags: string[];
}

export interface Camera {
  id: string;
  name: string;
  type: 'FPV' | 'HD' | 'NONE';
  weight: number; // grams
  resolution?: string; // e.g. "1080p"
  fov: number; // degrees
  price: number; // INR
  tags: string[];
  lensType?: string;
}

export interface DroneConfig {
  frame: DroneFrame;
  motors: Motor[];
  battery: Battery;
  propellers: Propeller[];
  escs: ESC[];
  camera: Camera;
  additionalComponents?: {
    gimbal?: boolean;
    lights?: boolean;
    gps?: boolean;
  };
}

export interface DroneSpecs {
  totalWeight: number;
  maxThrust: number;
  thrustToWeight: number;
  estimatedFlightTime: number;
  maxSpeed: number;
  buildCost: number;
}

export interface MarketDrone {
  id: string;
  name: string;
  manufacturer: string;
  type: 'quad' | 'hexa' | 'octo';
  weight: number;
  maxFlightTime: number;
  maxSpeed: number;
  price: number;
  maxPayload: number;
}

export interface ComparisonResult {
  userDrone: DroneSpecs;
  marketDrones: (MarketDrone & { comparisonScore: number })[];
  efficiency: {
    score: number;
    rating: 'excellent' | 'good' | 'average' | 'poor';
    recommendations: string[];
  };
}
