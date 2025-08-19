import { EffektHoleInfo } from '../../effektHoleInfo';

export interface HoleState {
  holes: EffektHoleInfo[];
  selectedHoleId: string | null;
  expandedHoleId: string | null;
  showHoles?: boolean;
}
