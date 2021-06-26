/* eslint-disable max-len */
import * as vscode from 'vscode';

export const renderCaptchaRefresh = async (context: vscode.ExtensionContext): Promise<boolean|void> => {
  const captchaWebview = vscode.window.createWebviewPanel(
    'captchaWebview',
    'Replit CAPTCHA Refresh',
    vscode.ViewColumn.One,
    {
      enableScripts: true,
    },
  );
  captchaWebview.webview.onDidReceiveMessage((message) => {
    context.secrets.store('captchaKey', message);
    captchaWebview.dispose();
    return true;
  });
  captchaWebview.webview.html = `
  <!DOCTYPE html>
  <html>
  <head>
  <meta http-equiv="Content-Security-Policy" content="default-src 'unsafe-inline' ${captchaWebview.webview.cspSource} https:;">
  <style>
  body {
    margin: 0;
    border: 0;
    width: 100%
  }
  iframe {
    margin: 0;
    border: 0;
    width: 100%
  }
  </style>
  </head>
  <body>
  <h1>Refresh your Replit CAPTCHA verification</h1>
  <h3>Click the box below to refresh your human verification. This window will close when you've completed the verification.</h3>
  <iframe src="https://vsc-captcha.vscode.repl.co"></iframe>
  <script>
  const vscode = acquireVsCodeApi();
  console.log(window);
  function handleMessage(message){
    vscode.postMessage(message.data);
  }
  window.addEventListener('message', handleMessage, false);
  </script>
  </body>
  </html>
  `;
};
