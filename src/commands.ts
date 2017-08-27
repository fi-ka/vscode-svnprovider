import { commands, SourceControlResourceState, Uri, window } from 'vscode';
import { Resource, Status } from './model';
import * as path from 'path';

export class CommandCenter {

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
}
