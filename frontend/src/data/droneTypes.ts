export type DroneClassId =
  | 'racing-fpv'
  | 'cinewhoop'
  | 'photography'
  | 'heavy-lift'
  | 'industrial'
  | 'custom';

export interface DronePeekLayout {
  tilt: string;
  scale: number;
}

export interface DroneTypeCard {
  id: DroneClassId;
  category: string;
  brand: string;
  name: string;
  series: string;
  tagline: string;
  headline: string;
  startingFrom: string;
  accent: string;
  glow: string;
  cardTint: string;
  frameId: string;
  image: string;
  mission: string;
  features: string[];
  leadDays: number;
  peek: DronePeekLayout;
}

const IMG = {
  hero: '/drones/cutouts/hero-flagship.png',
  velocity: '/drones/cutouts/series-velocity.png',
  cinema: '/drones/cutouts/series-cinema.png',
  imaging: '/drones/cutouts/series-imaging.png',
  cargo: '/drones/cutouts/series-cargo.png',
  enterprise: '/drones/cutouts/series-enterprise.png',
  iconV: '/drones/cutouts/icon-velocity.png',
  iconI: '/drones/cutouts/icon-imaging.png',
  iconE: '/drones/cutouts/icon-enterprise.png',
  login: '/drones/cutouts/login-float.png',
} as const;

export const DRONE_ASSETS = IMG;

export const DRONE_TYPES: DroneTypeCard[] = [
  {
    id: 'racing-fpv',
    category: 'SPEED',
    brand: 'GENESIS',
    name: 'VX-Racer',
    series: 'Velocity Series',
    tagline: 'Gate-cutting agility for freestyle & race circuits',
    headline: 'Spin Your World',
    startingFrom: '₹18,500',
    accent: '#E23D2B',
    glow: 'rgba(226,61,43,0.35)',
    cardTint: 'linear-gradient(160deg, #fff8f6 0%, #ffffff 100%)',
    frameId: 'frame-quad-250',
    image: IMG.velocity,
    mission: 'Racing / Freestyle',
    features: ['5″ class', 'High KV', 'FPV ready', 'T/W 4.2×'],
    leadDays: 14,
    peek: { tilt: '-6deg', scale: 1.04 },
  },
  {
    id: 'cinewhoop',
    category: 'CINEMA',
    brand: 'GENESIS',
    name: 'CinePulse',
    series: 'Indoor Film Series',
    tagline: 'Pro cinema lift with stabilized glass',
    headline: 'Whisper Capture',
    startingFrom: '₹24,000',
    accent: '#0E8A74',
    glow: 'rgba(14,138,116,0.3)',
    cardTint: 'linear-gradient(160deg, #f4fbf8 0%, #ffffff 100%)',
    frameId: 'frame-quad-450',
    image: IMG.cinema,
    mission: 'Cinematic / Film',
    features: ['Gimbal class', 'Quiet props', 'HD cine', 'Smooth hover'],
    leadDays: 18,
    peek: { tilt: '4deg', scale: 0.98 },
  },
  {
    id: 'photography',
    category: 'IMAGING',
    brand: 'GENESIS',
    name: 'Aether 450',
    series: 'Aerial Imaging Series',
    tagline: 'Stable glass for landscape & commercial stills',
    headline: 'Triple Lens Flagship',
    startingFrom: '₹42,000',
    accent: '#2F7DE1',
    glow: 'rgba(47,125,225,0.3)',
    cardTint: 'linear-gradient(160deg, #f5f9ff 0%, #ffffff 100%)',
    frameId: 'frame-quad-450',
    image: IMG.imaging,
    mission: 'Photography / Survey',
    features: ['450mm', '4K glass', 'Guarded', 'Survey ready'],
    leadDays: 21,
    peek: { tilt: '-2deg', scale: 1.08 },
  },
  {
    id: 'heavy-lift',
    category: 'CARGO',
    brand: 'GENESIS',
    name: 'Atlas Hex',
    series: 'Payload Series',
    tagline: 'Redundant lift for logistics & field ops',
    headline: 'Heavy Pathfinder',
    startingFrom: '₹95,000',
    accent: '#C47A12',
    glow: 'rgba(196,122,18,0.32)',
    cardTint: 'linear-gradient(160deg, #fff9f0 0%, #ffffff 100%)',
    frameId: 'frame-hexa-600',
    image: IMG.cargo,
    mission: 'Heavy Lift / Cargo',
    features: ['6-axis', 'Payload bay', 'Redundant', 'Field ops'],
    leadDays: 28,
    peek: { tilt: '3deg', scale: 1.0 },
  },
  {
    id: 'industrial',
    category: 'INDUSTRIAL',
    brand: 'GENESIS',
    name: 'Forge Octo',
    series: 'Enterprise Series',
    tagline: 'Mission-critical endurance for site inspection',
    headline: 'Enterprise Ready',
    startingFrom: '₹1,85,000',
    accent: '#2B6CB0',
    glow: 'rgba(43,108,176,0.3)',
    cardTint: 'linear-gradient(160deg, #f6f8fb 0%, #ffffff 100%)',
    frameId: 'frame-octo-800',
    image: IMG.enterprise,
    mission: 'Industrial / Inspection',
    features: ['Pro gimbal', 'Site inspect', 'Long sortie', 'Rugged arms'],
    leadDays: 35,
    peek: { tilt: '-3deg', scale: 1.0 },
  },
];

export const SERIES_PICKER = [
  { id: 'racing-fpv' as DroneClassId, label: 'Velocity Series', image: IMG.iconV, tone: '#E23D2B' },
  { id: 'photography' as DroneClassId, label: 'Imaging Series', image: IMG.iconI, tone: '#2F7DE1' },
  { id: 'industrial' as DroneClassId, label: 'Enterprise Series', image: IMG.iconE, tone: '#2B6CB0' },
];

export const BROWSE_CATEGORIES = [
  {
    id: 'best-sellers',
    title: 'Best Sellers',
    subtitle: 'Most forged this month',
    glow: 'radial-gradient(ellipse at 75% 45%, rgba(226,61,43,0.55) 0%, #0b0d12 70%)',
    droneId: 'racing-fpv' as DroneClassId,
  },
  {
    id: 'timeless',
    title: 'Timeless Builds',
    subtitle: 'Proven airframes',
    glow: 'radial-gradient(ellipse at 75% 45%, rgba(47,125,225,0.5) 0%, #0b0d12 70%)',
    droneId: 'photography' as DroneClassId,
  },
  {
    id: 'enterprise',
    title: 'Enterprise',
    subtitle: 'Industrial grade',
    glow: 'radial-gradient(ellipse at 75% 45%, rgba(14,138,116,0.45) 0%, #0b0d12 70%)',
    droneId: 'industrial' as DroneClassId,
  },
];

export function imageForClass(id: DroneClassId | null): string {
  if (id === 'custom' || !id) return IMG.hero;
  return DRONE_TYPES.find((d) => d.id === id)?.image || IMG.hero;
}
