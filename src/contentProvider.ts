import { Svn } from './svn'
import { Uri, Disposable, workspace } from 'vscode'

export class SvnContentProvider {

    private disposables: Disposable[] = [];

    constructor(private svn: Svn) {
        this.disposables.push(
            workspace.registerTextDocumentContentProvider('svn', this)
        );
    }
    
    async provideTextDocumentContent(uri: Uri): Promise<string> {
        try {
            return await this.svn.getOriginalFileContent(uri.fsPath);
        } catch (err) {
            return '';
        }
    }

    dispose(): void {
        this.disposables.forEach(d => d.dispose());
    }
}