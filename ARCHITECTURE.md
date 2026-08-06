# DroneForge Architecture & Customization Guide

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    USER BROWSER (Frontend)                   │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │           React Application Layer                     │   │
│  │  ┌─────────────────────────────────────────────────┐ │   │
│  │  │  Three.js Visualization                         │ │   │
│  │  │  - Real-time drone rendering                    │ │   │
│  │  │  - Spinning propeller animation                 │ │   │
│  │  │  - Camera controls                              │ │   │
│  │  └─────────────────────────────────────────────────┘ │   │
│  │                                                       │   │
│  │  ┌─────────────────────────────────────────────────┐ │   │
│  │  │  Component Selection UI                         │ │   │
│  │  │  - Frame selector                               │ │   │
│  │  │  - Motor selector                               │ │   │
│  │  │  - Battery, propeller, ESC selectors            │ │   │
│  │  │  - Real-time updates                            │ │   │
│  │  └─────────────────────────────────────────────────┘ │   │
│  │                                                       │   │
│  │  ┌─────────────────────────────────────────────────┐ │   │
│  │  │  Specs Display (Live Calculation)               │ │   │
│  │  │  - Weight, thrust, flight time                  │ │   │
│  │  │  - Cost aggregation                             │ │   │
│  │  │  - Performance metrics                          │ │   │
│  │  └─────────────────────────────────────────────────┘ │   │
│  │                                                       │   │
│  │  ┌─────────────────────────────────────────────────┐ │   │
│  │  │  AI Chatbot Interface                           │ │   │
│  │  │  - User prompts                                 │ │   │
│  │  │  - AI assistant responses                       │ │   │
│  │  │  - Permission banner for suggestions            │ │   │
│  │  └─────────────────────────────────────────────────┘ │   │
│  │                                                       │   │
│  │  ┌─────────────────────────────────────────────────┐ │   │
│  │  │  Zustand State Management                       │ │   │
│  │  │  - Drone config state                           │ │   │
│  │  │  - Specs calculation                            │ │   │
│  │  │  - Real-time updates                            │ │   │
│  │  └─────────────────────────────────────────────────┘ │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                               │
└─────────────────────────────────────────────────────────────┘
                           ↓ HTTP/REST
┌─────────────────────────────────────────────────────────────┐
│                  Node.js Express Backend                      │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │            API Routes                                │   │
│  │  • /api/parts                                        │   │
│  │  • /api/calculate-specs                             │   │
│  │  • /api/generate-bom                                │   │
│  │  • /api/chat (Claude Integration)                   │   │
│  │  • /api/ai-build-drone                              │   │
│  │  • /api/compare-drone                               │   │
│  └──────────────────────────────────────────────────────┘   │
│                         ↓                                    │
│  ┌──────────────────────────────────────────────────────┐   │
│  │            Business Logic Layer                       │   │
│  │  ┌─────────────────────────────────────────────────┐ │   │
│  │  │  Calculator Service                             │ │   │
│  │  │  - Specs calculation                            │ │   │
│  │  │  - BOM generation                               │ │   │
│  │  │  - Comparison logic                             │ │   │
│  │  └─────────────────────────────────────────────────┘ │   │
│  │                                                       │   │
│  │  ┌─────────────────────────────────────────────────┐ │   │
│  │  │  Claude AI Service                              │ │   │
│  │  │  - Component suggestions                        │ │   │
│  │  │  - Conversation handling                        │ │   │
│  │  │  - Parts knowledge base                         │ │   │
│  │  └─────────────────────────────────────────────────┘ │   │
│  │                                                       │   │
│  │  ┌─────────────────────────────────────────────────┐ │   │
│  │  │  Comparison Service                             │ │   │
│  │  │  - Score calculation                            │ │   │
│  │  │  - Market drone data                            │ │   │
│  │  │  - Efficiency rating                            │ │   │
│  │  └─────────────────────────────────────────────────┘ │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │            Data Layer                                 │   │
│  │  • Parts Catalog (Frames, Motors, Batteries, etc.)  │   │
│  │  • Market Drones Database                           │   │
│  │  • Component Specifications                         │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                               │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                   Claude AI API                              │
│                (Anthropic - External Service)                │
└─────────────────────────────────────────────────────────────┘
```

## Data Flow

### Manual Drone Building Flow
```
User selects component → Frontend state update → Zustand store
  ↓
Automatic specs recalculation → DroneSpecs object generated
  ↓
Visualization updates → Three.js re-renders drone
  ↓
Display updated specs → Real-time animation of changes
```

### AI-Assisted Building Flow
```
User describes drone → ChatBot component displays message
  ↓
Frontend sends prompt to backend → /api/chat endpoint
  ↓
Backend enriches with parts catalog → Claude AI processes
  ↓
AI suggests components → Backend extracts recommendations
  ↓
Permission banner shows changes → User confirms/denies
  ↓
If approved → Update frontend state → All updates cascade
```

### Comparison Flow
```
User completes drone config → Click "Compare with Market"
  ↓
Frontend sends drone specs → /api/compare-drone
  ↓
Backend scores against market drones → Calculates efficiency
  ↓
Returns comparison result → Frontend displays comparison UI
  ↓
User expands market drones → See detailed comparisons
```

## File Structure Explanation

### Frontend (`frontend/src/`)

```
components/
├── 3d/
│   └── DroneVisualizer.tsx
│       • Three.js scene setup
│       • Drone geometry creation
│       • Propeller animations
│       • Camera controls
│
├── ui/
│   ├── ComponentSelector.tsx     • Dropdown for part selection
│   ├── SpecsDisplay.tsx          • Live specs visualization
│   ├── AIPermissionBanner.tsx    • User confirmation UI
│   ├── Chatbot.tsx               • AI conversation interface
│   └── DroneComparison.tsx       • Market comparison display
│
store/
└── droneStore.ts
    • Zustand global state
    • Component update functions
    • Specs recalculation
    
shared/
├── types.ts                      • TypeScript interfaces
├── database.ts                   • Parts catalog
└── calculator.ts                 • Specs calculation logic

App.tsx                           • Main component
main.tsx                          • React entry point
index.css                         • Global styles
```

### Backend (`backend/src/`)

```
server.ts
• Express app setup
• Route definitions
• Claude integration
• Error handling

shared/
├── types.ts                      • Type definitions
├── database.ts                   • Parts catalog
└── calculator.ts                 • Spec calculations
```

## Customization Guide

When adding or changing shared logic, update both `frontend/src/shared/` and `backend/src/shared/`.

### Adding New Drone Frame Type

1. **Edit `frontend/src/shared/database.ts` and `backend/src/shared/database.ts`:**
```typescript
export const droneFrames: DroneFrame[] = [
  // ... existing frames
  {
    id: 'frame-airplane-1',
    name: 'FPV Airplane',
    type: 'airplane', // Add to type union in types.ts first
    weight: 450,
    maxPayload: 500,
    armLength: 0, // Not applicable
    price: 5500,
    materials: ['Carbon Fiber', 'Foam'],
    dimensions: { length: 800, width: 1200, height: 150 },
    tags: ['airplane', 'fpv', 'speed'],
    motorMounts: 2,
  }
];
```

2. **Update type definition in `frontend/src/shared/types.ts` and `backend/src/shared/types.ts`:**
```typescript
type: 'quad' | 'hexa' | 'octo' | 'tri' | 'airplane';
```

3. **Update calculator logic if needed** in `frontend/src/shared/calculator.ts` and `backend/src/shared/calculator.ts`

### Adding New Motors

**Edit `frontend/src/shared/database.ts` and `backend/src/shared/database.ts`:**
```typescript
export const motors: Motor[] = [
  // ... existing motors
  {
    id: 'motor-3508-400kv',
    name: 'Sunnysky X3508 400KV',
    kv: 400,
    weight: 52,
    thrustMax: 2800,
    currentMax: 28,
    voltage: '4S-6S',
    price: 3500,
    tags: ['industrial', 'reliable'],
    efficiency: 45.2,
    diameter: 35,
    height: 8,
  }
];
```

### Modifying Specs Calculation

**Edit `frontend/src/shared/calculator.ts` and `backend/src/shared/calculator.ts`:**

Current calculation uses simplified physics. For more accuracy:

```typescript
export function calculateDroneSpecs(config: DroneConfig): DroneSpecs {
  // ... existing code ...
  
  // For better flight time estimation, use:
  const hoverCurrent = calculateHoverCurrent(
    config.motors,
    config.frame,
    totalWeight
  );
  
  // For better speed estimation, use:
  const maxSpeed = calculateMaxSpeed(
    config.motors,
    config.propellers,
    config.battery
  );
}

function calculateHoverCurrent(motors: Motor[], frame: DroneFrame, totalWeight: number): number {
  // More complex calculation considering motor efficiency at hover thrust
  const hoverThrust = totalWeight; // Need equal thrust to weight to hover
  // Use motor thrust curves if available...
}
```

### Extending AI Capabilities

**Edit `backend/src/server.ts`:**

```typescript
// Add specialized prompt for specific drone types
const systemPrompt = `
You are DroneForge AI. When a user asks for:

RACING DRONES:
- Minimize weight
- Maximize power-to-weight ratio
- Suggest high KV motors
- Recommend carbon fiber parts

PHOTOGRAPHY DRONES:
- Maximize payload capacity
- Minimize vibration
- Suggest gimbals
- Recommend heavier, stable frames

INDUSTRIAL DRONES:
- Maximize flight time
- Prioritize reliability
- Suggest redundant systems
- Recommend heavy-lift frames
`;
```

### Adding Market Drones for Comparison

**Edit `backend/src/server.ts`:**

In the `/api/compare-drone` endpoint, update:

```typescript
const marketDrones = [
  // ... existing drones
  {
    id: 'market-auterion-enterprise',
    name: 'Auterion Enterprise',
    manufacturer: 'Auterion',
    type: 'octo' as const,
    weight: 2500,
    maxFlightTime: 65,
    maxSpeed: 85,
    price: 3500000,
    maxPayload: 8000,
  },
];
```

### Modifying 3D Visualization

**Edit `frontend/src/components/3d/DroneVisualizer.tsx`:**

```typescript
// Add more detailed motor rendering
const motorGeometry = new THREE.CylinderGeometry(
  frameSize * 0.25, 
  frameSize * 0.25, 
  frameSize * 0.3, 
  32  // More segments for better quality
);

// Add stator details
const statorGeometry = new THREE.CylinderGeometry(
  frameSize * 0.28,
  frameSize * 0.28,
  frameSize * 0.15,
  32
);

// Add landing gear
const landingGearGeometry = new THREE.CylinderGeometry(
  frameSize * 0.05,
  frameSize * 0.05,
  frameSize * 0.5,
  8
);
```

### Adding New UI Components

Create a new component:

```bash
touch frontend/src/components/ui/NewFeature.tsx
```

```typescript
import React from 'react';
import { motion } from 'framer-motion';

export const NewFeature: React.FC = () => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="bg-slate-800 rounded-lg p-6"
    >
      {/* Your component JSX */}
    </motion.div>
  );
};
```

## Performance Optimization Tips

### Frontend
1. **Memoize heavy components**: Use `React.memo()` for `DroneVisualizer`
2. **Optimize Three.js**: Use `frequency.js` or `LOD` (Level of Detail)
3. **Lazy load parts list**: Virtual scrolling for large component lists
4. **Cache calculations**: Use `useMemo()` for spec calculations

### Backend
1. **Cache parts catalog**: Redis for frequently accessed parts
2. **Rate limit AI calls**: Prevent abuse of Claude API
3. **Batch processing**: Group multiple comparison requests
4. **Database indexing**: If using persistent storage

## Testing Strategy

### Frontend Tests
```bash
# Component testing with Vitest + React Testing Library
npm install --save-dev vitest @testing-library/react

# Test examples
test('DroneVisualizer renders', () => { ... })
test('ComponentSelector updates state', () => { ... })
```

### Backend Tests
```bash
# API testing with Jest
npm install --save-dev jest supertest

# Test examples
test('GET /api/parts returns components', () => { ... })
test('POST /api/chat returns AI response', () => { ... })
```

## Deployment Guide

### Vercel (Frontend)
```bash
vercel
```

### Railway/Render (Backend)
```bash
# Create GitHub repo, connect, deploy
```

### Docker
```bash
docker-compose up -d
```

## Future Enhancement Ideas

1. **WebGL Optimizations**: Instance rendering for multiple drones
2. **Real-time Collaboration**: WebSocket for shared drone building
3. **Mobile Responsive**: Full mobile UI overhaul
4. **Advanced Physics**: Real flight simulation
5. **Parts Supplier Integration**: Real-time pricing and availability
6. **Community Sharing**: Save and share drone designs
7. **AR Preview**: Augmented reality drone visualization
8. **Video Tutorials**: Step-by-step building guides

---

For questions, refer to README.md or open an issue!
