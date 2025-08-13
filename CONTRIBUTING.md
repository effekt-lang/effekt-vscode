# Developer and Contributor Information

Thank you for contributing to the Effekt VSCode extension!
This document contains information about our developer workflow.
If you have any questions, do not hesitate to join our [Discord server](https://discord.gg/dMdPZVeWNJ).

## Requirements

* VSCode `>= 1.90`
* NodeJS `>= 20.0` and npm

## Build and Run

To build and run the VSCode extension, open this repository in VSCode.
From within the terminal, install the dependencies by running:

```sh
npm install
```

Then, compile the project using:

```sh
npm run compile
```

Finally, within VSCode, press `F5`.
This should launch the extension in debug mode in a separate VSCode window for you to test.

## Release Process

This section describes how to release a new version of the Effekt VSCode extension to the VSCode Marketplace.

Make sure you're on the latest `master` by running:

```sh
git checkout master && git pull
```

Depending on whether the new change is minor or a patch (choose one), run:

```sh
npm version [minor/patch] -m "Release v%s"
```

This creates a commit with the version bump and a tag.

Push the resulting commit:

```sh
git push
```

Push the tag:

```sh
git push origin tag "v<version>" # replace <version> with the version returned by `npm version`!
```

then check if the deploy pipeline went through in the Actions tab: https://github.com/effekt-lang/effekt-vscode/actions/workflows/deploy.yml.
