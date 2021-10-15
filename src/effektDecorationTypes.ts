import { window } from 'vscode';
var path = require('path')

/**
 * A decoration used to decorate a capability binder.
 */
export const capabilityBinderDecoration = window.createTextEditorDecorationType({
    borderRadius: '4pt'
});


/**
 * A decoration used to decorate a capability receiver.
 */
export const capabilityReceiverDecoration = window.createTextEditorDecorationType({
    borderRadius: '4pt',
    light: { backgroundColor: "rgba(206, 224, 220,0.025)"},
    dark: { backgroundColor: "rgba(180,130,145,0.025)"},
});


/**
 * A decoration used to decorate a capability argument.
 */
export const capabilityArgumentDecoration = window.createTextEditorDecorationType({
    borderRadius: '4pt',
    // gutterIconPath: path.join(__dirname, '..', 'src', 'light-navbar-brand.svg'),
    // gutterIconSize: '50%'
});



/**
 * Decoration type used to highlight a capability scope
 */
export const scopeDecorationType = window.createTextEditorDecorationType({
    light: {
        backgroundColor: "rgba(180, 130, 145,0.125)",
        gutterIconPath: path.join(__dirname, '..', 'icons', 'scope_bar_light.svg'),
        gutterIconSize: "contain",
        after: {
            backgroundColor: "rgba(180, 130, 145,0.125)",
        },
        before: {
            backgroundColor: "rgba(180, 130, 145,0.125)",
        }
    },
    dark: {
        backgroundColor: "rgba(185, 207, 212,0.125)",
        gutterIconPath: path.join(__dirname, '..', 'icons', 'scope_bar_dark.svg'),
        gutterIconSize: "contain",
        after: {
            backgroundColor: "rgba(185, 207, 212,0.125)",
        },
        before: {
            backgroundColor: "rgba(185, 207, 212,0.125)",
        }
    }
    
});


/**
 * Decoration type used to highlight a capabilitys origin
 */
 export const originDecorationType = window.createTextEditorDecorationType({
    light: {
        backgroundColor: "rgba(180, 130, 145,0.125)",
        gutterIconPath: path.join(__dirname, '..', 'icons', 'scope_bar_light.svg'),
        gutterIconSize: "contain",
        after: {
            backgroundColor: "rgba(180, 130, 145,0.125)",
        },
        before: {
            backgroundColor: "rgba(180, 130, 145,0.125)",
        }
    },
    dark: {
        backgroundColor: "rgba(185, 207, 212,0.125)",
        gutterIconPath: path.join(__dirname, '..', 'icons', 'scope_bar_dark.svg'),
        gutterIconSize: "contain",
        after: {
            backgroundColor: "rgba(185, 207, 212,0.125)",
        },
        before: {
            backgroundColor: "rgba(185, 207, 212,0.125)",
        }
    },
    before: {
        color: "rgba(210, 210, 210, 0.25)",
        fontWeight: "bold"
    },
    after: {
        color: "rgba(210, 210, 210, 0.25)",
        fontWeight: "bold"
    }
    
});