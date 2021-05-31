/* eslint-disable max-classes-per-file */
import {
  Client,
  FetchConnectionMetadataError,
  FetchConnectionMetadataResult,
  GovalMetadata,
} from '@replit/crosis';
import * as vscode from 'vscode';
import ws from 'ws';
import { fetchToken, getReplInfo } from './api';
import { FS } from './fs';
// import { runRepl } from './misc';
import { Options } from './options';
import ReplitOutput from './output';
import ReplitTerminal from './shell';
import { CrosisClient, ReplInfo } from './types';

const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 10);

// migrate secrets from file store to secrets
const migrateSecrets = async (store: Options, context: vscode.ExtensionContext) => {
  if ((await context.secrets.get('migrated')) === 'true') {
    return;
  }
  const key = await store.get('key');
  const captcha = await store.get('captchaKey');
  if (typeof key === 'string') {
    await context.secrets.store('userSid', key);
    console.log('Migrating user sid to secure storage...');
  }
  if (typeof captcha === 'string') {
    await context.secrets.store('captchaKey', captcha);
    console.log('Migrating captcha key to secure storage...');
  }
  if (typeof captcha === 'string' && typeof key === 'string') {
    store.write({});
    context.secrets.store('migrated', 'true');
    console.log('Finished migrating secrets to secure storage.');
  }
};

const getUserSid = async (
  context: vscode.ExtensionContext,
  { forceNew }: { forceNew: boolean } = { forceNew: false },
): Promise<string> => {
  if (!forceNew) {
    let storedSid: string;
    const userSid = await context.secrets.get('userSid');
    if (userSid) {
      storedSid = userSid;
    } else {
      storedSid = '';
    }
    if (storedSid) return storedSid;
  }

  const newSid = await vscode.window.showInputBox({
    prompt: 'Session ID',
    placeHolder: 'Enter your Replit Session ID (the value of the "connect.sid" cookie)',
    value: '',
    ignoreFocusOut: true,
  });

  if (newSid) {
    await context.secrets.store('userSid', newSid);
    return newSid;
  }
  return '';
};

const getCaptchaKey = async (
  context: vscode.ExtensionContext,
  { forceNew }: { forceNew: boolean } = { forceNew: false },
): Promise<string | null> => {
  if (!forceNew) {
    let storedCaptcha: string;
    const captchaKey = await context.secrets.get('captchaKey');
    if (captchaKey) {
      storedCaptcha = captchaKey;
    } else {
      storedCaptcha = '';
    }
    if (storedCaptcha) {
      return storedCaptcha;
    }
  }

  const newKey = await vscode.window.showInputBox({
    prompt: 'Captcha Response',
    placeHolder: 'Enter a captcha key from https://captcha.roblockhead.repl.co',
    value: '',
    ignoreFocusOut: true,
  });

  if (newKey) {
    await context.secrets.store('captchaKey', newKey);
    return newKey;
  }

  return null;
};

const openedRepls: {
  [replId: string]: {
    replInfo: ReplInfo;
    client: CrosisClient;
    output?: ReplitOutput;
  };
} = {};

function openReplClient(
  replInfo: ReplInfo,
  context: vscode.ExtensionContext,
  userSid: string,
  captchaKey?: string,
): CrosisClient {
  statusBarItem.show();
  statusBarItem.text = `$(sync~spin) Replit: @${replInfo.user}/${replInfo.slug}`;

  const client = new Client<{
    extensionContext: vscode.ExtensionContext;
    replInfo: ReplInfo;
  }>();
  client.setUnrecoverableErrorHandler((e: Error) => {
    delete openedRepls[replInfo.id];
    console.error(e);
    vscode.window.showErrorMessage(e.message);
  });

  client.open(
    {
      context: {
        extensionContext: context,
        replInfo,
      },
      fetchConnectionMetadata: async (_abortSignal: AbortSignal) => {
        console.log('Fetching Token');
        if (!userSid) {
          throw new Error('Replit: Failed to open repl, no API key provided');
        }
        let govalMeta: GovalMetadata;
        let res: FetchConnectionMetadataResult;
        try {
          govalMeta = JSON.parse(await fetchToken(replInfo.id, userSid, captchaKey));
          res = {
            ...govalMeta,
            error: null,
          };
          return res;
        } catch (e) {
          if (e.name === 'AbortError') {
            res = {
              error: FetchConnectionMetadataError.Aborted,
            };
          } else {
            vscode.window.showErrorMessage(`${e}`);
            res = {
              error: e,
            };
          }
          return res;
        }

        // let res: FetchConnectionMetadataResult;
      },
      // eslint-disable-next-line
      // @ts-ignore we don't use addEventListener removeEventListener and dispatchEvent :)
      WebSocketClass: ws as WebSocket,
      // WebSocketClass: WebSocket,
    },
    (result) => {
      if (!result.channel) {
        return;
      }
      statusBarItem.text = `$(link) Replit: @${replInfo.user}/${replInfo.slug}`;
      result.channel.onCommand((cmd) => {
        if (cmd.portOpen?.forwarded) {
          const panel = vscode.window.createWebviewPanel(
            'replView',
            `@${replInfo.user}/${replInfo.slug} webview`,
            vscode.ViewColumn.One,
            {},
          );

          panel.webview.html = `<!DOCTYPE html>
<head>
  <style>
   html, body, iframe {
     height: 100%;
     width: 100%;
     background: white;
     border: none;
     padding: 0;
     margin: 0;
     display: block;
   }
  </style>
</head>
  <body>
    <iframe
    sandbox="allow-forms allow-pointer-lock allow-popups allow-same-origin allow-scripts allow-modals"
    src="https://${replInfo.id}.id.repl.co"
    ><iframe>
  </body>
</html>`;
        }
      });

      return ({ willReconnect }) => {
        if (willReconnect) {
          statusBarItem.text = `$(sync~spin) Replit: @${replInfo.user}/${replInfo.slug}`;
          statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.errorBackground');
          statusBarItem.tooltip = 'Connection interrupted, reconnecting...';
        } else {
          statusBarItem.text = `$(error) Replit: @${replInfo.user}/${replInfo.slug}`;
          statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.errorBackground');
          statusBarItem.tooltip = 'Connection permanently disconnected';
          vscode.window.showWarningMessage(
            `Repl.it: @${replInfo.user}/${replInfo.slug} connection permanently disconnected`,
          );
        }
      };
    },
  );
  if (replInfo.lang.engine === 'goval') {
    const output = new ReplitOutput(client);

    const outputTerminal = vscode.window.createTerminal({
      name: `Output: @${replInfo.user}/${replInfo.slug}`,
      pty: output,
    });
    outputTerminal.show();
    openedRepls[replInfo.id].output = output;
  } else {
    vscode.window.showWarningMessage(
      `This repl is a ${replInfo.lang.engine} repl, so it has limited features.`,
    );
  }
  openedRepls[replInfo.id] = { replInfo, client };
  return client;
}

export async function activate(context: vscode.ExtensionContext): Promise<void> {
  // migrate secrets to more secure vscode secret store
  const store = await Options.create();
  await migrateSecrets(store, context);

  await getUserSid(context);

  const fs = new FS(async (replId) => {
    if (openedRepls[replId]) {
      return openedRepls[replId].client;
    }

    const apiKey = await getUserSid(context);

    if (!apiKey) {
      vscode.window.showErrorMessage('Expected API key');

      throw new Error('expected API key');
    }

    const captchaKey = await getCaptchaKey(context);

    if (!captchaKey) {
      vscode.window.showErrorMessage('Expected CAPTCHA key');

      throw new Error('expected CAPTCHA key');
    }
    let replInfo: ReplInfo;
    try {
      replInfo = await getReplInfo(replId, apiKey);
    } catch (e) {
      console.error(e);

      vscode.window.showErrorMessage(e.message || 'Error with no message, check console');

      throw e;
    }

    return openReplClient(replInfo, context, apiKey, captchaKey);
  });

  context.subscriptions.push(
    vscode.workspace.registerFileSystemProvider('replit', fs, {
      isCaseSensitive: true,
    }),
  );

  context.subscriptions.push(
    vscode.workspace.onDidChangeWorkspaceFolders((ev) => {
      ev.removed.forEach((folder) => {
        const maybeReplId = folder.uri.authority;

        if (openedRepls[maybeReplId]) {
          openedRepls[maybeReplId].client.destroy();
          delete openedRepls[maybeReplId];
        }
      });
    }),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('replit.shell', async () => {
      const r = Object.values(openedRepls);

      // handle no repls open
      if (r.length === 0) {
        return vscode.window.showErrorMessage('Please open a repl first');
      }

      let replId;
      if (r.length > 1) {
        const replsToPick = Object.values(openedRepls).map(
          ({ replInfo }) => `@${replInfo.user}/${replInfo.slug} ::${replInfo.id}`,
        );

        const selected = await vscode.window.showQuickPick(replsToPick, {
          placeHolder: 'Select a repl to open a shell to',
        });

        if (!selected) {
          return;
        }

        [, replId] = selected.split('::');
      } else {
        replId = r[0].replInfo.id;
      }

      const { client, replInfo } = openedRepls[replId];

      const terminal = vscode.window.createTerminal({
        name: `@${replInfo.user}/${replInfo.slug}`,
        pty: new ReplitTerminal(client),
      });

      terminal.show();
    }),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('replit.run', async () => {
      const r = Object.values(openedRepls);

      // handle no repls open
      if (r.length === 0) {
        return vscode.window.showErrorMessage('Please open a repl first');
      }

      let replId;
      if (r.length > 1) {
        const replsToPick = Object.values(openedRepls).map(
          ({ replInfo }) => `@${replInfo.user}/${replInfo.slug} ::${replInfo.id}`,
        );

        const selected = await vscode.window.showQuickPick(replsToPick, {
          placeHolder: 'Select a repl to run',
        });

        if (!selected) {
          return;
        }

        [, replId] = selected.split('::');
      } else {
        replId = r[0].replInfo.id;
      }
      if (openedRepls[replId].replInfo.lang.engine !== 'goval') {
        vscode.window.showErrorMessage(
          'This repl has limited features, so the run button cannot be used.',
        );
        return;
      }
      openedRepls[replId].output?.run();
    }),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('replit.apikey', async () =>
      getUserSid(context, { forceNew: true }),
    ),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('replit.captchakey', async () =>
      getCaptchaKey(context, { forceNew: true }),
    ),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('replit.openrepl', async () => {
      const input = await vscode.window.showInputBox({
        prompt: 'Repl Name',
        placeHolder: '@user/repl or full url to repl',
        ignoreFocusOut: true,
      });
      const apiKey = await getUserSid(context);
      // const repls = await getSelfRepls(apiKey, 10);
      // const parsedRepls = Object.values(repls).map((v) => `@${v.user}/${v.slug}`);
      // const input = await vscode.window.showQuickPick(parsedRepls, {
      //   canPickMany: false,
      //   placeHolder: 'Choose a repl or enter @user/repl',
      // });

      if (!input) {
        return vscode.window.showErrorMessage('Repl.it: please supply a valid repl url or id');
      }

      let replInfo: ReplInfo;
      try {
        replInfo = await getReplInfo(input, apiKey);
      } catch (e) {
        console.error(e);

        return vscode.window.showErrorMessage(e.message || 'Error with no message, check console');
      }

      // Insert the workspace folder at the end of the workspace list
      // otherwise the extension gets decativated and reactivated
      const { workspaceFolders } = vscode.workspace;
      let start = 0;
      if (workspaceFolders?.length) {
        start = workspaceFolders.length;
      }

      vscode.workspace.updateWorkspaceFolders(start, 0, {
        uri: vscode.Uri.parse(`replit://${replInfo.id}/`),
        name: `@${replInfo.user}/${replInfo.slug}`,
      });
    }),
  );
}

export function deactivate(): void {
  Object.values(openedRepls).forEach(({ client, replInfo }) => {
    delete openedRepls[replInfo.id];
    client.destroy();
  });
}
