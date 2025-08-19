import { EffektHoleInfo } from '../../effektHoleInfo';

export interface HoleState {
  holes: EffektHoleInfo[];
  selectedHoleId: string | null;
  highlightedHoleId: string | null;
  showHoles?: boolean;
}
