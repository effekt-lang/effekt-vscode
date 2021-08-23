import { window } from 'vscode';


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
    light: { backgroundColor: "rgba(180, 130, 145,0.125)"},
    dark: { backgroundColor: "rgba(185, 207, 212,0.125)"},
    
});