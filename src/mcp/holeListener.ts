import { EffektHoleInfo } from '../holesPanel/effektHoleInfo';

export interface EffektPublishHolesParams {
  uri: string;
  holes: EffektHoleInfo[];
}

export class HoleListener {
  private holes = new Map<string, EffektHoleInfo[]>();
  private pendingUpdates = new Map<
    string,
    ((holes: EffektHoleInfo[]) => void)[]
  >();

  public updateHoles(uri: string, holes: EffektHoleInfo[]): void {
    this.holes.set(uri, holes);

    const waiters = this.pendingUpdates.get(uri);
    if (waiters) {
      waiters.forEach((resolve) => resolve(holes));
      this.pendingUpdates.delete(uri);
    }
  }

  public getHoles(uri: string): EffektHoleInfo[] {
    return this.holes.get(uri) || [];
  }

  public getHoleById(uri: string, holeId: string): EffektHoleInfo | undefined {
    const holes = this.holes.get(uri);
    if (!holes) {
      return undefined;
    }
    return holes.find((hole) => hole.id === holeId);
  }

  public getAllHoles(): Map<string, EffektHoleInfo[]> {
    return new Map(this.holes);
  }

  public clearHoles(uri: string): void {
    this.holes.delete(uri);
  }

  public hasHoles(uri: string): boolean {
    const holes = this.holes.get(uri);
    return holes !== undefined && holes.length > 0;
  }

  public waitForHoles(
    uri: string,
    timeoutMs = 10_000,
  ): Promise<EffektHoleInfo[]> {
    return new Promise((resolve, reject) => {
      if (this.holes.has(uri)) {
        resolve(this.holes.get(uri)!);
        return;
      }

      const timeout = setTimeout(() => {
        const waiters = this.pendingUpdates.get(uri);
        if (waiters) {
          const index = waiters.indexOf(resolve);
          if (index > -1) {
            waiters.splice(index, 1);
          }
          if (waiters.length === 0) {
            this.pendingUpdates.delete(uri);
          }
        }
        reject(
          new Error(
            `Timeout waiting for holes for ${uri} after ${timeoutMs}ms`,
          ),
        );
      }, timeoutMs);

      const resolver = (holes: EffektHoleInfo[]) => {
        clearTimeout(timeout);
        resolve(holes);
      };

      if (!this.pendingUpdates.has(uri)) {
        this.pendingUpdates.set(uri, []);
      }
      this.pendingUpdates.get(uri)!.push(resolver);
    });
  }
}
