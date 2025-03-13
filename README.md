<p align="center" >
    <img src="https://github.com/effekt-lang/effekt/assets/408265/abacd306-912a-480e-b930-7f1373657641" height="91px"
    alt="The Effekt Programming Language"
    title="The Effekt Programming Language">
</p>

# Effekt Visual Studio Code

The official Visual Studio Code extension for the [Effekt Programming Language](effekt-lang.org).

## Getting Started
You can install the extension through the marketplace (via. tab "Extensions").

Currently, the extension does _not_ bundle the [`Effekt` compiler](https://github.com/effekt-lang/effekt#installation), so you need to install it independently.

As a last step, you might need to set the path to the `effekt` binary in the VSCode plugin settings for effekt.
For Mac OS and Unix users this probably works out of the box after installing `effekt` with npm (that is, once the `effekt` command is in your path). For Windows users, you might need to set the path to `effekt.cmd`.

With this setup the extension should start the server when an Effekt file is opened.

## Inlay Hints

This extension supports inlay hints that can display useful information about Effekt programs that is not explicitly written out in the source code.
For example, this includes showing inferred types and [Effekt captures](https://effekt-lang.org/tour/captures).
You can enable inlay hints in the [VSCode settings](vscode://settings/editor.inlayHints.enabled) at `Editor › Inlay Hints: Enabled`.
