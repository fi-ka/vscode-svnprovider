import { commands, OutputChannel,  SourceControlResourceState, Uri, QuickPickItem, window } from 'vscode';
import { Resource, Status } from './model';
import { Svn, NodeLogEntry } from './svn';
import * as path from 'path';

export class CommandCenter {

    constructor(
        private svn: Svn,
        private outputChannel: OutputChannel
    ) {}

    async openResource(resource: Resource) {
        if (resource.status === Status.DELETED) {
            const original = resource.resourceUri.with({ scheme: "svn" });
            await commands.executeCommand('vscode.open', original);
        } else {
            await this.diffDocument(resource.resourceUri);
        }
    }

    async diffDocument(uri: Uri) {
        const original = uri.with({scheme: "svn"})
        const fileName = path.basename(uri.fsPath)
        const title = fileName + " (Diff)"
        await commands.executeCommand('vscode.diff', original, uri, title);
    }

    async diffActiveDocument() {
        const editor = window.activeTextEditor;
        if (editor != null) {
            await this.diffDocument(editor.document.uri);
        }
    }

    async logActiveDocument() {
        const editor = window.activeTextEditor;
        if (editor != null) {
            this.svn.getLog(editor.document.uri.fsPath).then(logEntries => {
                if (logEntries.length == 0) {
                    window.showInformationMessage("No log recorded for " + editor.document.uri.fsPath);
                } else {
                    this.createQuickPickList(logEntries).then((item) => {
                        var selected = new Uri().with({path: item.entry.path, query: JSON.stringify({rev: item.entry.revision}), scheme: "svn"});
                        var prev = selected.with({query: JSON.stringify({rev: (parseInt(item.entry.revision) - 1)})});
                        commands.executeCommand('vscode.diff', prev, selected);
                    });
                }
            }, (reason) => {
                window.showErrorMessage("Could not show log for " + editor.document.uri.fsPath);
            });
        }
    }

    private createQuickPickList(logEntries) {
        var pickItems: LogQuickPickItem[] = [];
        logEntries.forEach(entry => {
            const label = "$" + entry.revision;
            const description = entry.author
            pickItems.push({label, detail: entry.message, description, entry});
        });
        return window.showQuickPick(pickItems);
    }
}

class LogQuickPickItem implements QuickPickItem {
    label: string;
    description: string;
    detail: string;
    entry: NodeLogEntry;
}
