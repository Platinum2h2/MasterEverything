
export enum AppMode {
  FIRST_AID = 'First Aid',
  ROBOTICS = 'Robotics & Electronics',
  MECHANICAL = 'Mechanical & Automotive',
  CODING = 'Software Engineering',
  TRADES = 'Workshop & Trades',
  GENERAL = 'Technical Advisor'
}

export interface Material {
  name: string;
  alternative?: string;
}

export interface GuidanceStep {
  id: number;
  title: string;
  instruction: string;
  duration?: string;
  materials?: Material[];
  warnings?: string[];
  checkpoints?: string[];
  audioPrompt: string;
  arOverlayType: 'arrow' | 'circle' | 'hand' | 'press' | 'wash' | 'scan' | 'code' | 'bolt' | 'gear';
}

export interface AnalysisResult {
  category: string;
  confidence: number;
  reasoning: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
  uncertainties?: string[];
  isSafeToProceed: boolean;
  steps: GuidanceStep[];
}

export enum AppState {
  HOME = 'HOME',
  INITIAL_CAPTURE = 'INITIAL_CAPTURE',
  CAPTURE_COMPLETE = 'CAPTURE_COMPLETE',
  VOICE_DESCRIPTION = 'VOICE_DESCRIPTION',
  ANALYZING = 'ANALYZING',
  ANALYSIS_COMPLETE = 'ANALYSIS_COMPLETE',
  PREPARING_INSTRUCTIONS = 'PREPARING_INSTRUCTIONS',
  GUIDANCE = 'GUIDANCE',
  STEP_VALIDATION = 'STEP_VALIDATION',
  ESCALATION = 'ESCALATION',
  COMPLETED = 'COMPLETED'
}
