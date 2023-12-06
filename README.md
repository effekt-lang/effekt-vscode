<p align="center" >
    <img src="https://github.com/effekt-lang/effekt/assets/408265/abacd306-912a-480e-b930-7f1373657641" height="91px"
    alt="The Effekt Programming Language"
    title="The Effekt Programming Language">
</p>

# Effekt Visual Studio Code

The official Visual Studio Code extension for the [Effekt Programming Language](effekt-lang.org).

## Getting Started
This extension is not currently published on the extension marketplace so you will have to install it manually in your extensions or run it from VSCode.

After installing the extension Visual Studio Code, you need to install the [`effekt` compiler](https://github.com/effekt-lang/effekt#installation) and set the path to the `effekt` binary in the VSCode plugin settings for effekt.
For Mac OS and Unix users this probably works out of the box after installing `effekt` with npm (that is, once the `effekt` command is in your path). For Windows users, you might need to set the path to `effekt.cmd`.

With this setup the extension should start the server when an Effekt file is opened.
