import * as vscode from 'vscode';

class MultiplayerTextDocumentProvider implements vscode.TextDocumentContentProvider {
  log = console.log;

  provideTextDocumentContent(uri: vscode.Uri) {
    this.log('File Opened');
    return uri.path;
  }
}

export default MultiplayerTextDocumentProvider;
