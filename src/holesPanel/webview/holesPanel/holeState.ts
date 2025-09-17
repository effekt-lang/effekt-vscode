import { EffektHoleInfo } from '../../effektHoleInfo';

export interface HoleState {
  holes: EffektHoleInfo[];
  selectedHoleId: string | null;
  expandedHoleId: string | null;
  selectedBindingIndex: number | null;
  showHoles?: boolean;
}
