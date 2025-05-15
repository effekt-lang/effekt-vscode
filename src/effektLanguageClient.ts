import { LanguageClient } from 'vscode-languageclient/node';

/*
 * Overrides the `registerFeature` method to disable the built-in inlay hints feature.
 *
 * By default the LanguageClient provides inlay hints automatically, which does not allow
 * for filtering Inlay Hints based on their 'data'-field. We use the 'data'-field to allow
 * the user to select which inlay hints the extension should show.
 *
 * By doing this, we retain full control over how inlay hints are displayed, allowing us to
 * implement custom logic.
 *
 * Note: This approach relies on identifying the inlay hints feature by its constructor name
 * (`InlayHintsFeature`). If the LSP implementation changes, this logic may need to be updated.
 */
export class EffektLanguageClient extends LanguageClient {
  public registerFeature(feature: any) {
    if (feature.constructor.name === 'InlayHintsFeature') {
      return;
    }
    super.registerFeature(feature);
  }
}
