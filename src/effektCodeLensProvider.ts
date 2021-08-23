import { CodeLensProvider, CodeLens, TextDocument, Command, CancellationToken } from 'vscode';
import { CapabilityInfo } from './effektLSPTypes';
import { showCapabilityOriginCommand, highlightScopeCommand } from './effektCommands';

/**
 * Provide CodeLenses for effekt files.
 */
export class effektCodeLensProvider implements CodeLensProvider {

    constructor(getCapabilitiesInfo: () => Promise<CapabilityInfo[]> ) {
        this.getCapabilitiesInfo = getCapabilitiesInfo;
    }

    getCapabilitiesInfo: () => Promise<any>;

    async provideCodeLenses(document: TextDocument): Promise<CodeLens[]> {

        let capabilitiesInfo = await this.getCapabilitiesInfo();
        return capabilitiesInfo.map((ca: CapabilityInfo) => {   
            let com: Command;
            if(ca.capabilityKind == "CapabilityBinder"){
                com = {
                    command: showCapabilityOriginCommand,
                    title: 'Origin of <'+ca.capabilityName+'>',
                    arguments: [ca, capabilitiesInfo]
                }
            } else {
                com = {
                    command: highlightScopeCommand,
                    title: 'Scope of <'+ca.capabilityName+'>',
                    arguments: [{capabilityName: ca.capabilityName, scopeStart: ca.scopeRange.start, scopeEnd: ca.scopeRange.end}]
                }
            }
            return new CodeLens(ca.sourceRange, com)
        })
    }

    async resolveCodeLens(codeLens: CodeLens, token: CancellationToken): Promise<CodeLens> {
        console.log("Resolving codelens ", codeLens);
        return codeLens;
    }
}