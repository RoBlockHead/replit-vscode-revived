# Replit (unofficial) VSCode Extension

[![Support Server](https://img.shields.io/discord/591914197219016707.svg?label=Discord&logo=Discord&colorB=7289da&style=for-the-badge)](https://discord.gg/yXs2ZgEzJQ)

This extension is based off of [the original Replit VScode extension](https://marketplace.visualstudio.com/items?itemName=masad-frost.replit). It is not as smooth to use as the original, but it works the same at its core.

It allows you to connect to any replit repl and edit files.

# How to use

After installing this extension, bring up the command palette and paste a link to the repl (or the repl's uuid). You can open multiple repls in the same workspace.

![](https://i.imgur.com/1liRgmn.png)

To use this, you will need to set your SID value, which is your session ID, this can be found by copying the value of the cookie named "connect.sid" on replit.com.

Additionally, in order to verify that you're a human, you'll likely need to set a captcha response, which can be obtained from [my service](https://captcha.roblockhead.repl.co). This value will change every so often, so you'll have to reset it. This is the drawback of using this extension without official access to Crosis.

Once you open a repl you can start making changes to the filesystem from the file tree and the editor.

# Filewatching

Currently, the extension does not watch the repl's filesystem, so if you, or a multiplayer collaborator, are making changes on Repl.it or programmatically (via shell or a running program), you won't see them propagate in VSCode in real-time. You can hit the refresh button in the file tree and the workspace should pick up the changes.

# Development

- `npm install`
- `npm run watch`
- Launch extension from debugger sidebar (or hit F5)

This extension uses Replit's API and the Crosis client, refer to the docs here https://crosisdoc.util.repl.co/

# Disclaimer

This extension was developed as a proof of concept and as an exploratory project. You can consider it in a pre-alpha state and it's a community-led project. Replit is not responsible for any content or security issues that may arise due to this plugin, if you do find any, feel free to open an issue or a pull request.
