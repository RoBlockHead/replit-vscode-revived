import { Client } from '@replit/crosis';
import * as vscode from 'vscode';

export interface ReplInfo {
  id: string;
  user: string;
  slug: string;
  lang: {
    id: string;
    canUseShellRunner: boolean;
    engine: string;
  };
}

export type CrosisClient = Client<{
  extensionContext: vscode.ExtensionContext;
  replInfo: ReplInfo;
}>;

export interface ReplProps {
  token: Promise<string>;
  engine: string;
}

  | FetchConnectionMetadataResult
  | {
      message: string;
    };
