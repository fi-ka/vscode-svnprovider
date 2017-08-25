import { scm, commands, Command, Disposable, SourceControl, SourceControlResourceDecorations,
    SourceControlResourceState, SourceControlResourceGroup, Uri } from "vscode";
import { CommandCenter } from './commands'
import { Svn, FileStatus } from './svn'

export class SvnProvider {

    private _sourceControl: SourceControl;
    private workingCopyGroup: SourceControlResourceGroup;
    private disposables: Disposable[] = [];

    constructor(private svn: Svn) {
        this._sourceControl = scm.createSourceControl("svn", "Subversion");
        this.disposables.push(this._sourceControl)

        this._sourceControl.quickDiffProvider = this;

        this.workingCopyGroup = this._sourceControl.createResourceGroup('workingCopy', "Changes");

        const commandCenter = new CommandCenter()
        this.disposables.push(commands.registerCommand("svn.diffDocument", commandCenter.diffDocument, commandCenter));
        this.disposables.push(commands.registerCommand("svn.diffActiveDocument", commandCenter.diffActiveDocument, commandCenter));
        this.disposables.push(this.workingCopyGroup);
        
        this.updateWorkingCopyResourceState(svn)
        setInterval(() => { this.updateWorkingCopyResourceState(svn) }, 15000);
    }

    updateWorkingCopyResourceState(svn: Svn) {
        svn.getStatus().then((result: FileStatus[]) => {
            const workingCopy = []
            result.forEach(entry => {
                if (entry.status == "M" || entry.status == "A") {
                    const resource = new Resource();
                    resource.resourceUri = entry.uri;
                    resource.command = { command: "svn.diffDocument", title: "open", arguments: [resource.resourceUri] };
                    workingCopy.push(resource);
                }
            });
            this.workingCopyGroup.resourceStates = workingCopy;
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
