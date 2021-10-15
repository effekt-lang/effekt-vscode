import { DecorationOptions, TextEditor, Range } from 'vscode';
import { CapabilityScope, CapabilityInfo } from './effektLSPTypes';
import { capabilityReceiverDecoration, capabilityBinderDecoration, capabilityArgumentDecoration } from './effektDecorationTypes';
var path = require('path')


/**
 * Visualize information about capability receivers provided by the LSP server.
 * @param {TextEditor|undefined} editor: The editor to apply the decoration to.
 * @param {CapabilityInfo[]} capabilityReceivers: The capability information to visualize.
 * @param {CapabilityScope[]} capabilityScopes: an array to store information on the scopes of the given capabilityReceivers.
 */
export function displayCapabilityReceivers(editor: TextEditor | undefined, capabilityScopes: CapabilityScope[], capabilityReceivers: CapabilityInfo[]){
    capabilityReceivers.forEach(cr => {
        capabilityScopes.push({capabilityName: cr.capabilityName, hoverRange: cr.sourceRange, scopeRange: cr.scopeRange})
    })

    //let decoRanges = capabilityArguments.map(ca => ca.sourceRange)
    let decorations: DecorationOptions[] = [];

    capabilityReceivers.forEach(ca => {
        const decoration: DecorationOptions = { 
            range: ca.sourceRange,
            renderOptions: {
                after: {
                    contentText: ' «',
                    fontWeight: "bold"
                },
                light: {
                    after: {
                        // contentIconPath: path.join(__dirname, '..', 'icons', 'scope_bar_light.svg'),
                        color: "rgb(165, 36, 61)"
                    }
                },
                dark: {
                    after: {
                        // contentIconPath: path.join(__dirname, '..', 'icons', 'scope_bar_dark.svg'),
                        color: "rgb(180, 130, 145)"
                    }
                }
            }
        };
        decorations.push(decoration);
    })
    
    editor?.setDecorations(capabilityReceiverDecoration, decorations)
}


/**
 * Visualize information about capabilitiy binders provided by the LSP server.
 * @param {TextEditor|undefined} editor: The editor to apply the decoration to.
 * @param {CapabilityInfo[]} capabilityBinders: The capability information to visualize.
 * @param {CapabilityScope[]} capabilityScopes: an array to store information on the scopes of the given capabilityBinders.
 */
export function displayCapabilityBinders(editor: TextEditor | undefined, capabilityScopes: CapabilityScope[], capabilityBinders: CapabilityInfo[]){

    let decorations: DecorationOptions[] = [];

    capabilityBinders.forEach(cb => {
        let binderDecorationPosition = new Range(cb.sourceRange.start, cb.sourceRange.end)

        const decoration: DecorationOptions = { 
            range: binderDecorationPosition,
            renderOptions: {
                after: {
                    // contentText:  ' '+ cb.capabilityName +' =>',
                    fontStyle: "bold"
                },
                light: {
                    after: {
                        color: "rgb(194, 194, 194)"
                    }
                },
                dark: {
                    after: {
                        color: "rgb(102, 102, 102)"
                    }
                }
            }
        };
        decorations.push(decoration);
    })

    editor?.setDecorations(capabilityBinderDecoration, decorations) 
}




 /**
 * Visualize information about capability arguments provided by the LSP server.
 * @param {TextEditor|undefined} editor: The editor to apply the decoration to.
 * @param {CapabilityInfo[]} capabilityArguments: The capability information to visualize.
 * @param {CapabilityScope[]} capabilityScopes: an array to store information on the scopes of the given capabilityArguments.
 */
export function displayCapabilityArguments(editor: TextEditor | undefined, capabilityScopes: CapabilityScope[], capabilityArguments: CapabilityInfo[]){
    capabilityArguments.forEach(ca => {
        capabilityScopes.push({capabilityName: ca.capabilityName, hoverRange: ca.sourceRange, scopeRange: ca.scopeRange})
    })

    //let decoRanges = capabilityArguments.map(ca => ca.sourceRange)
    let decorations: DecorationOptions[] = [];

    capabilityArguments.forEach(ca => {
        const decoration: DecorationOptions = { 
            range: ca.sourceRange,
            renderOptions: {
                after: {
                    contentText: ' »',
                    fontWeight: "bold" 
                },
                light: {
                    after: {                        
                        color: "rgb(36, 165, 140)"
                    }
                },
                dark: {
                    after: {
                        color: "rgb(130, 180, 162)"
                    }
                }
            }
        };
        decorations.push(decoration);
    })
    
    editor?.setDecorations(capabilityArgumentDecoration, decorations)
}