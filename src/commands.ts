import { commands, env, OutputChannel,  SourceControlResourceState, Uri, QuickPickItem, QuickPickOptions, window } from 'vscode';
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

    async showLogForActiveDocument(showAll=false) {
        const editor = window.activeTextEditor;
        if (editor != null) {
            const uri = editor.document.uri;
            const fileName = path.basename(uri.fsPath);
            const limit = showAll ? null : 10;
            this.svn.getLog(uri.fsPath, limit).then(logEntries => {
                if (logEntries.length == 0) {
                    window.showInformationMessage("No log recorded for " + fileName);
                } else {
                    return this.createQuickPickList(logEntries, limit);
                }
            }).then(item => {
                if (typeof item != 'undefined')
                {
                    if (item.label === "Show All") {
                        this.showLogForActiveDocument(showAll=true)
                    } else {
                        this.showLogItemDiff(item);
                    }
                }
            }).catch(reason => {
                window.showErrorMessage("Error showing svn log for " + fileName);
                console.log("Error: " + reason);
            });
        }
    }

    private createQuickPickList(logEntries, limit) {
        var pickItems: LogQuickPickItem[] = [];
        logEntries.forEach(entry => {
            const label = entry.message;
            const revision = "r" + entry.revision;
            const detail = revision + " | " + entry.author + " | " + this.formatDate(entry.date);
            pickItems.push({label, detail, description: "", entry});
        });
        if (limit != null && limit == pickItems.length) {
            pickItems.push({label: "Show All", description: "Show all svn log entries."});
        }
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

    private formatDate(date: Date) {
        const dateOptions = { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: 'numeric' };
        return date.toLocaleString(env.language, dateOptions);
    }
}

class LogQuickPickItem implements QuickPickItem {
    label: string;
    description: string;
    detail?: string;
    entry?: NodeLogEntry;
}
