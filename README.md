# DroneForge - Interactive Drone Customizer

🚁 A professional web application for building, visualizing, and customizing drones with real-time specifications calculation and AI-assisted component selection.

## Features

### Core Features
- **Live 3D Drone Visualization**: Interactive Three.js visualization with spinning propellers and floating animation
- **Real-Time Specs Calculation**: Instant calculation of weight, thrust, flight time, max speed, and build cost
- **Dual Configuration Modes**:
  - Manual: Click-based component selection
  - AI-Assisted: Describe your ideal drone and let Claude AI suggest components
- **AI Permission Banner**: Intelligent system that asks for user confirmation before applying AI suggestions
- **BOM Export**: Download a complete Bill of Materials with pricing
- **Drone Comparison**: Compare your custom drone with market alternatives
- **Interactive Chatbot**: Chat with the AI assistant for building advice

### Technical Architecture

#### Frontend (React + Vite)
- Three.js 3D visualization with dynamic drone rendering
- Framer Motion for smooth animations and transitions
- Zustand for state management
- Tailwind CSS for responsive design
- Real-time specs display with animated updates

#### Backend (Node.js + Express)
- RESTful API for parts catalog and calculations
- Claude AI integration for intelligent component suggestions
- Drone comparison engine
- Bill of Materials generation

#### Database
- Parts catalog (Frames, Motors, Batteries, Propellers, ESCs, Cameras)
- Smart specs calculator with physics-based estimations
- Drone efficiency scoring system

## Project Structure

```
Chassiser/
├── frontend/                    # React + Vite application
│   ├── src/
│   │   ├── components/
│   │   │   ├── 3d/
│   │   │   │   └── DroneVisualizer.tsx      # Three.js visualization
│   │   │   └── ui/
│   │   │       ├── ComponentSelector.tsx     # Part selector component
│   │   │       ├── SpecsDisplay.tsx         # Live specs display
│   │   │       ├── AIPermissionBanner.tsx   # AI suggestion banner
│   │   │       └── Chatbot.tsx              # AI chatbot interface
│   │   ├── store/
│   │   │   └── droneStore.ts               # Zustand store
│   │   ├── shared/
│   │   │   ├── types.ts                    # TypeScript interfaces
│   │   │   ├── database.ts                 # Parts catalog
│   │   │   └── calculator.ts               # Specs calculation logic
│   │   ├── App.tsx                          # Main app component
│   │   ├── main.tsx                         # Entry point
│   │   └── index.css                        # Global styles
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   └── package.json
│
└── backend/                     # Node.js + Express server
    ├── src/
    │   ├── server.ts           # Main Express server
    │   └── shared/
    │       ├── types.ts        # TypeScript interfaces
    │       ├── database.ts     # Parts catalog
    │       └── calculator.ts   # Specs calculation logic
    ├── tsconfig.json
    └── package.json
```

## Installation & Setup

### Prerequisites
- Node.js 18+
- npm or yarn
- Claude API key (https://console.anthropic.com)

### Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
Open http://localhost:5173 in your browser.

### Backend Setup
```bash
cd backend
npm install

# Create .env file
cp .env.example .env
# Update CLAUDE_API_KEY in .env

npm run dev
```
Backend runs on http://localhost:5000

## API Endpoints

### Public Endpoints
- `GET /health` - Health check
- `GET /api/parts` - Get all available parts catalog

### Calculation Endpoints
- `POST /api/calculate-specs` - Calculate drone specifications
- `POST /api/generate-bom` - Generate Bill of Materials
- `POST /api/compare-drone` - Compare drone with market alternatives

### AI Endpoints
- `POST /api/chat` - Chat with AI assistant
- `POST /api/ai-build-drone` - AI builds complete drone from prompt

## Key Components

### DroneVisualizer
Real-time 3D visualization of the drone with:
- Dynamic frame and motor rendering
- Spinning propeller animations
- Camera mount visualization
- Responsive canvas sizing
- Auto-rotating camera view

### SpecsDisplay
Live calculation and display of:
- Total weight (grams)
- Max thrust (grams)
- Thrust-to-weight ratio
- Estimated flight time (minutes)
- Max speed (km/h)
- Build cost (INR)

### AIPermissionBanner
Permission system for AI suggestions:
- Shows proposed changes
- Requires user confirmation
- Smooth animations
- Maintains user control flow

### Chatbot
Interactive AI assistant with:
- Real-time conversation
- Component knowledge base
- Suggestion extraction
- Async message handling

## Drone Specifications Calculation

The calculator uses:
- Component weights for total mass
- Motor thrust specifications
- Battery capacity and voltage
- Weight-to-thrust ratio for performance metrics
- Simplified flight time estimation
- Cost aggregation from all components

## AI Features

### Component Suggestions
Claude AI analyzes user descriptions and suggests:
- Most appropriate frame type
- Optimized motors for use case
- Battery size for flight duration
- Propeller size for balance
- ESC ratings for safety
- Camera configuration

### Smart Context
AI only knows about parts in the catalog, preventing hallucination of fictional components.

## Customization Guide

### Adding New Components
1. Add to respective arrays in `frontend/src/shared/database.ts` and `backend/src/shared/database.ts`
2. Update TypeScript interfaces in `frontend/src/shared/types.ts` and `backend/src/shared/types.ts`
3. Create selector component in frontend
4. Update calculation logic if needed

### Modifying Drone Types
Edit `droneFrames` array to add frames like:
- Tricopter
- Airplane
- Helicopter configurations

### Extending AI Capabilities
Modify `backend/src/server.ts` to:
- Change AI model
- Add specialized build types
- Improve suggestion extraction

## Performance Notes

- 3D rendering at 60fps with optimized Three.js
- Real-time spec updates (sub-100ms)
- Lazy loading of component list
- Efficient Zustand state management
- Tailwind CSS for minimal CSS size

## Browser Compatibility
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Future Enhancements

1. **3D Parts Library**: Detailed 3D models for each component
2. **Flight Simulation**: Physics-based drone flight simulator
3. **Component Compatibility Checker**: Automatic voltage/connector validation
4. **Community Builds**: Share and compare drone designs
5. **Price Tracker**: Real-time component pricing from suppliers
6. **Build Assembly Guide**: Step-by-step video assembly instructions
7. **Weather Impact Analysis**: Flight time estimation based on weather
8. **Multi-Language Support**: International drone builder community

## License

MIT License - Feel free to use and modify for your projects

## Support

For issues or feature requests, please create an issue in the repository.

---

**Built with ❤️ for drone enthusiasts and builders worldwide**
