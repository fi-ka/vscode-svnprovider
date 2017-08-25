import { scm, commands, Command, Disposable, SourceControl, SourceControlResourceDecorations,
    SourceControlResourceState, SourceControlResourceGroup, Uri } from "vscode";
import { CommandCenter } from './commands'
import { Svn } from './svn'

export class SvnProvider {

    private _sourceControl: SourceControl;
    private workingCopy: SourceControlResourceGroup;
    private disposables: Disposable[] = [];

    constructor(private svn: Svn) {
        this._sourceControl = scm.createSourceControl("svn", "Subversion");
        this.disposables.push(this._sourceControl)

        this._sourceControl.quickDiffProvider = this;

        this.workingCopy = this._sourceControl.createResourceGroup('workingCopy', "Changes");

        const commandCenter = new CommandCenter()
        this.disposables.push(commands.registerCommand("svn.diffDocument", commandCenter.diffDocument, commandCenter));
        this.disposables.push(commands.registerCommand("svn.diffActiveDocument", commandCenter.diffActiveDocument, commandCenter));
        this.disposables.push(this.workingCopy);
        
        this.updateWorkingCopyResourceState(svn)
        setInterval(() => { this.updateWorkingCopyResourceState(svn) }, 15000);
    }

    updateWorkingCopyResourceState(svn: Svn) {
        svn.get_modified_files().then((uris: Uri[]) => {
            const modified_resources = []
            uris.forEach(uri => {
                const resource = new Resource();
                resource.resourceUri = uri;
                resource.command = { command: "svn.diffDocument", title: "open", arguments: [resource.resourceUri] };
                modified_resources.push(resource);
            });
            this.workingCopy.resourceStates = modified_resources;
        });
    }

    provideOriginalResource(uri: Uri): Uri | undefined {
        if (uri.scheme !== 'file') {
            return;
        }
        return uri.with({scheme: "svn"})
    }

    dispose(): void {
        this.disposables.forEach((d) => d.dispose());
        this.disposables = [];
    }
}

export class Resource implements SourceControlResourceState {
    resourceUri: Uri;
    command: Command;
    decorations: SourceControlResourceDecorations;
}
