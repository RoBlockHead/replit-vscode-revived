import * as vscode from 'vscode';
import { Channel } from '@replit/crosis';
import { api } from '@replit/protocol';
import { CrosisClient } from './types';

export default class ReplitOutput implements vscode.Pseudoterminal {
  private client: CrosisClient;

  private channel: Channel | null;

  private closeChannel: (() => void) | null;

  private dimensions: vscode.TerminalDimensions | undefined;

  private writeEmitter: vscode.EventEmitter<string>;

  private closeEmitter: vscode.EventEmitter<void>;

  private state: api.State | null;

  onDidWrite: vscode.Event<string>;

  onDidClose: vscode.Event<void>;

  constructor(client: CrosisClient) {
    this.dimensions = undefined;
    this.channel = null;
    this.closeChannel = null;
    this.state = null;
    this.client = client;

    this.writeEmitter = new vscode.EventEmitter<string>();
    this.onDidWrite = this.writeEmitter.event;

    this.closeEmitter = new vscode.EventEmitter<void>();
    this.onDidClose = this.closeEmitter.event;
  }

  close(): void {
    if (this.closeChannel) {
      this.closeChannel();
    }
  }

  handleInput(input: string): void {
    if (!this.channel) {
      return;
    }

    this.channel.send({ input });
  }

  open(dimensions: vscode.TerminalDimensions | undefined): void {
    this.dimensions = dimensions;

    this.closeChannel = this.client.openChannel(
      {
        service: 'shellrun2',
        name: 'shellrunner',
        action: 2,
      },
      ({ channel }) => {
        if (!channel) {
          return;
        }

        this.channel = channel;

        channel.onCommand((cmd) => {
          if (cmd.state) {
            this.state = cmd.state;
            console.log(JSON.stringify(cmd));
            return;
          }
          if (!cmd.output) {
            return;
          }
          // replace the 0xEEA7 PUA with Braille 'o', a similar character
          let out = cmd.output;
          out = out.replace(/\uEEA7/g, '⠕');

          this.writeEmitter.fire(out);
        });

        if (this.dimensions) {
          channel.send({
            resizeTerm: {
              cols: this.dimensions.columns,
              rows: this.dimensions.rows,
            },
          });
        }

        return ({ willReconnect }) => {
          if (willReconnect) {
            return;
          }

          this.closeEmitter.fire();
        };
      },
    );
  }

  // TODO: Make run button care about state
  run(): void {
    console.log(this.state);
    // if (this.state !== 1) return;
    this.channel?.send({
      runMain: {},
    });
  }

  setDimensions(dimensions: vscode.TerminalDimensions): void {
    this.dimensions = dimensions;

    if (!this.channel) {
      return;
    }

    this.channel.send({
      resizeTerm: {
        cols: dimensions.columns,
        rows: dimensions.rows,
      },
    });
  }
}
