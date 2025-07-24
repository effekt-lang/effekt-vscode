import MiniSearch, { SearchResult } from 'minisearch';

export interface DocEntry {
  name: string;
  module?: string;
  signature?: string;
  doc?: string;
}

const EFFEKT_API_JSON_URL =
  'https://effekt-lang.github.io/effekt-api/full.json.gz';

export class DocIndexer {
  private definitions: DocEntry[] = [];
  private isLoaded = false;
  private mini!: MiniSearch<DocEntry>;

  private isDefinition(kind: string): boolean {
    return [
      'FunDef',
      'ValDef',
      'RegDef',
      'VarDef',
      'DefDef',
      'NamespaceDef',
      'InterfaceDef',
      'DataDef',
      'RecordDef',
      'TypeDef',
      'EffectDef',
      'ExternType',
      'ExternDef',
      'ExternResource',
      'ExternInterface',
      'ExternInclude',
    ].includes(kind);
  }

  public async search(query: string, maxResults = 10): Promise<DocEntry[]> {
    await this.loadStdlibDocs();

    const raw: SearchResult[] = this.mini.search(query, {
      combineWith: 'OR',
      boost: { name: 4, doc: 2, module: 1, signature: 1 },
      fuzzy: 0.2,
      prefix: true,
    });

    return raw.slice(0, maxResults).map((r) => this.definitions[r.id]);
  }

  private async loadStdlibDocs(): Promise<void> {
    if (this.isLoaded) {
      return;
    }

    const response = await fetch(EFFEKT_API_JSON_URL);
    if (!response.ok) {
      throw new Error('Missing library');
    }

    if (typeof DecompressionStream === 'undefined') {
      throw new Error('DecompressionStream is not supported');
    }

    const ds = new DecompressionStream('gzip');
    const decompressedStream = response.body!.pipeThrough(ds);
    const textStream = decompressedStream.pipeThrough(new TextDecoderStream());
    const reader = textStream.getReader();

    let result = '';
    let { value, done } = await reader.read();
    while (!done) {
      result += value;
      ({ value, done } = await reader.read());
    }

    const library = JSON.parse(result);
    this.definitions = this.extractDefinitions(library);

    this.mini = new MiniSearch<DocEntry>({
      fields: ['name', 'doc', 'module', 'signature'],
      storeFields: [],
      searchOptions: {
        combineWith: 'OR',
        boost: { name: 4, doc: 2, module: 1, signature: 1 },
        fuzzy: 0.2,
        prefix: true,
      },
    });

    this.definitions.forEach((d, i) => this.mini.add({ id: i, ...d } as any));

    this.isLoaded = true;
  }

  private extractDefinitions(obj: any, modulePath = ''): DocEntry[] {
    const results: DocEntry[] = [];

    if (Array.isArray(obj)) {
      for (const item of obj) {
        results.push(...this.extractDefinitions(item, modulePath));
      }
    } else if (typeof obj === 'object' && obj !== null) {
      if (obj.kind === 'ModuleDecl' && obj.path) {
        modulePath = obj.path;
      }

      if (obj.id?.name && obj.kind && this.isDefinition(obj.kind)) {
        const entry: DocEntry = {
          name: obj.id.name,
          module: modulePath,
        };

        if (obj.doc) {
          entry.doc = this.sanitizeDoc(obj.doc);
        }

        const signature = this.showSignature(obj);
        if (signature) {
          entry.signature = signature;
        }

        results.push(entry);
      }

      for (const value of Object.values(obj)) {
        results.push(...this.extractDefinitions(value, modulePath));
      }
    }

    return results;
  }

  private sanitizeDoc(doc: string): string {
    return doc
      .split('\n')
      .map((line) => {
        if (line[0] === ' ') {
          return line.substring(1);
        } else {
          return line;
        }
      })
      .join('\n');
  }

  private showType(t: any): string {
    const optional = (arr: any[], f: (args: string) => string): string =>
      arr.length > 0
        ? f(arr.map((item) => this.showType(item)).join(', '))
        : '';

    switch (t.kind) {
      case 'BoxedType':
        return `${this.showType(t.tpe)} at {${t.capt.map((c: any) => c.name || c.id?.name || '').join(', ')}}`;
      case 'TypeRef': {
        const typeName = t.id?.name || '';
        return typeName + optional(t.args || [], (args) => `[${args}]`);
      }
      case 'FunctionBlockParam':
        if ('id' in t && t.id?.name) {
          return `${t.id.name}: ${this.showType(t.tpe)}`;
        }
        return `${this.showType(t.tpe)}`;
      case 'FunctionType':
        return (
          optional(t.vparams || [], (args) => `(${args})`) +
          optional(t.tparams || [], (args) => `[${args}]`) +
          optional(t.bparams || [], (args) => `{${args}}`) +
          ` => ${this.showType(t.result)}` +
          optional(t.effects || [], (args) => ` / {${args}}`)
        );
      default:
        console.warn('unknown type', t.kind);
        return t.kind || '';
    }
  }

  private showSignature(term: any): string {
    let res = term.id?.name || term.name || '';

    if ('tparams' in term && term.tparams && term.tparams.length > 0) {
      res += `[${term.tparams.map((tp: any) => tp.id?.name || tp.name || '').join(', ')}]`;
    }

    if ('vparams' in term && term.vparams && term.vparams.length > 0) {
      res += ` (${term.vparams
        .map((vp: any) => `${vp.id?.name || ''}: ${this.showType(vp.tpe)}`)
        .join(', ')})`;
    }

    if ('bparams' in term && term.bparams && term.bparams.length > 0) {
      res += ` ${term.bparams
        .map((bp: any) => `{ ${bp.id?.name || ''}: ${this.showType(bp.tpe)} }`)
        .join(' ')}`;
    }

    if ('ret' in term && term.ret && term.ret.kind === 'Effectful') {
      res += `: ${this.showType(term.ret.tpe)} / {${(term.ret.eff || [])
        .map((eff: any) => this.showType(eff))
        .join(', ')}} `;
    }

    if (res !== '') {
      return `\`${res}\``;
    }
    return '';
  }
}
