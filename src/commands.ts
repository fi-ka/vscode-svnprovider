import { commands, OutputChannel,  SourceControlResourceState, Uri, QuickPickItem, QuickPickOptions, window } from 'vscode';
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
            const uri = editor.document.uri;
            const fileName = path.basename(uri.fsPath);
            this.svn.getLog(uri.fsPath, 20).then(logEntries => {
                if (logEntries.length == 0) {
                    window.showInformationMessage("No log recorded for " + fileName);
                } else {
                    return this.createQuickPickList(logEntries);
                }
            }).then(item => {
                if (typeof item != 'undefined')
                    this.showLogItemDiff(item);
            })
            .catch(reason => {
                window.showErrorMessage("Error showing svn log for " + fileName);
            });
        }
    }

    private createQuickPickList(logEntries) {
        var pickItems: LogQuickPickItem[] = [];
        logEntries.forEach(entry => {
            const label = "r" + entry.revision;
            const description = entry.author
            pickItems.push({label, detail: entry.message, description, entry});
        });
        const quickPickOptions: QuickPickOptions = {
            matchOnDescription: true,
            matchOnDetail: true,
        };
        return window.showQuickPick(pickItems, quickPickOptions);
    }

    private showLogItemDiff(item) {
        const selected = new Uri().with({path: item.entry.path, query: JSON.stringify({rev: item.entry.revision}), scheme: "svn"});
        const prev = selected.with({query: JSON.stringify({rev: (item.entry.revision - 1)})});
        const title = path.basename(item.entry.path) + " | r" + item.entry.revision;
        commands.executeCommand('vscode.diff', prev, selected, title);
    }
}

class LogQuickPickItem implements QuickPickItem {
    label: string;
    description: string;
    detail: string;
    entry: NodeLogEntry;
}
