import { CodeLensProvider, CodeLens, TextDocument, Command, CancellationToken, EventEmitter, Event } from 'vscode';
import { CapabilityInfo } from './effektLSPTypes';
import { showCapabilityOriginCommand, highlightScopeCommand } from './effektCommands';

/**
 * Provide CodeLenses for effekt files.
 */
export class effektCodeLensProvider implements CodeLensProvider {

    constructor(getCapabilitiesInfo: () => Promise<CapabilityInfo[]>, enabled: boolean = true) {
        this.getCapabilitiesInfo = getCapabilitiesInfo;
        this.enabled = enabled;
    }

    private enabled: boolean;
    private getCapabilitiesInfo: () => Promise<any>;
    private _onDidChangeCodeLenses: EventEmitter<void> = new EventEmitter<void>();
    public readonly onDidChangeCodeLenses: Event<void> = this._onDidChangeCodeLenses.event;

    async toggleActive(): Promise<void> {
        this.enabled = !this.enabled;
    }

    // manually trigger an update of the code lenses
    public async updateCodeLenses(): Promise<void> {
        this._onDidChangeCodeLenses.fire();
    }

    async provideCodeLenses(document: TextDocument): Promise<CodeLens[]> {

        if(this.enabled) {
            let capabilitiesInfo = await this.getCapabilitiesInfo();
            return capabilitiesInfo.map((ca: CapabilityInfo) => {   
                let com: Command;
                if(ca.capabilityKind == "CapabilityBinder"){
                    com = {
                        command: showCapabilityOriginCommand,
                        title: ca.capabilityName+' $(eye)',
                        arguments: [ca, capabilitiesInfo]
                    }
                } else {
                    com = {
                        command: highlightScopeCommand,
                        title: ca.capabilityName+' $(json)',
                        arguments: [{capabilityName: ca.capabilityName, scopeStart: ca.scopeRange.start, scopeEnd: ca.scopeRange.end}]
                    }
                }
                return new CodeLens(ca.sourceRange, com)
            })
        } else {
            return [];
        }
    }

    async resolveCodeLens(codeLens: CodeLens, token: CancellationToken): Promise<CodeLens> {
        console.log("Resolving codelens ", codeLens);
        return codeLens;
    }
}