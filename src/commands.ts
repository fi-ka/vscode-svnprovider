import { commands, SourceControlResourceState, Uri, window } from 'vscode'
import * as path from 'path'

export class CommandCenter {

    async diffDocument(uri: Uri) {
        const original = uri.with({scheme: "svn"})
        const fileName = path.basename(uri.fsPath)
        const title = fileName + " (Diff)"
        commands.executeCommand('vscode.diff', original, uri, title);
    }

    async diffActiveDocument() {
        const editor = window.activeTextEditor;
        if (editor != null) {
            this.diffDocument(editor.document.uri);
        }
    }
}
