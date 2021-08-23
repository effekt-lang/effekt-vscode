import { Range } from 'vscode'

export class Capability {
    constructor(){
        this.name = "";
    }
    name: string;
    scopeStart: any;
    scopeEnd: any;
}


export class CapabilityHint {
    constructor(){
        this.capabilities = [];
        this.capabilityIDs = null;
        this.line = 0;
        this.column = 0;
    }
    capabilities: Array<Capability>;
    capabilityIDs: any;
    line: number;
    column: number;
}

/**
 * A capability info type.
 * Represents information on a capability, such as its kind, name, range and scope.
 */
export class CapabilityInfo {
    constructor(obj: {capabilityKind: string, capabilityName: string, sourceRange: Range, scopeRange: Range}){
        this.capabilityKind = obj.capabilityKind;
        this.capabilityName = obj.capabilityName;
        this.sourceRange = new Range(obj.sourceRange.start.line, obj.sourceRange.start.character, obj.sourceRange.end.line, obj.sourceRange.end.character);
        this.scopeRange = new Range(obj.scopeRange.start.line, obj.scopeRange.start.character, obj.scopeRange.end.line, obj.scopeRange.end.character);
    }
    capabilityKind: string;
    capabilityName: string;
    sourceRange: Range;
    scopeRange: Range;
}


/**
 * A capability scope info type.
 * Represents information on a capability scope, such as its name, hover range and scope.
 */
export class CapabilityScope {
    constructor(obj: { capabilityName: string, hoverRange: Range; scopeRange: Range; }){
        this.capabilityName = obj.capabilityName;
        this.hoverRange = obj.hoverRange;
        this.scopeRange = obj.scopeRange;   
    }
    capabilityName: string;
    hoverRange: Range;
    scopeRange: Range;
}