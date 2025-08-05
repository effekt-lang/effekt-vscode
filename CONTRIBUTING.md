# Developer and Contributor Information

This document contains information about the developer workflow.
If you have any questions, do not hesitate to join our [Discord server](https://discord.gg/dMdPZVeWNJ).

## Release Process

This section describes how to release a new version of the Effekt VSCode extension to the VSCode Marketplace.

Make sure you're on the latest `master` by running:

```sh
git checkout master && git pull
```

Depending on if the new change is minor or a patch (choose one), run:

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
git push origin tag "v<version>" # replace <version>with the version returned by `npm version`!
```

then check the deploy pipeline went through in the Actions tab: https://github.com/effekt-lang/effekt-vscode/actions/workflows/deploy.yml.
