import { scm, commands, Command, Disposable, OutputChannel, SourceControl, SourceControlResourceDecorations,
    SourceControlResourceState, SourceControlResourceGroup, Uri } from "vscode";
import { CommandCenter } from './commands';
import { Svn } from './svn';
import { Model, Resource } from './model';

export class SvnProvider {

    private model: Model;
    private _sourceControl: SourceControl;
    private workingCopyGroup: SourceControlResourceGroup;
    private disposables: Disposable[] = [];

    constructor(
        private svn: Svn,
        private outputChannel: OutputChannel
    ) {
        this._sourceControl = scm.createSourceControl("svn", "Subversion");
        this.disposables.push(this._sourceControl);

        this._sourceControl.quickDiffProvider = this;

        this.workingCopyGroup = this._sourceControl.createResourceGroup('workingCopy', "Changes");

        const commandCenter = new CommandCenter(svn, outputChannel)
        this.disposables.push(commands.registerCommand("svn.openResource", commandCenter.openResource, commandCenter));
        this.disposables.push(commands.registerCommand("svn.diffDocument", commandCenter.diffDocument, commandCenter));
        this.disposables.push(commands.registerCommand("svn.diffActiveDocument", commandCenter.diffActiveDocument, commandCenter));
        this.disposables.push(commands.registerCommand("svn.logActiveDocument", commandCenter.showLogForActiveDocument, commandCenter));
        this.disposables.push(this.workingCopyGroup);

        this.model = new Model(svn);
        this.model.onDidChange(this.onDidModelChange, this, this.disposables);
    }

    private onDidModelChange() {
        this.workingCopyGroup.resourceStates = this.model.workingCopyResources;
    }

    provideOriginalResource(uri: Uri): Uri | undefined {
        if (uri.scheme !== 'file') {
            return;
        }
        return uri.with({scheme: "svn"});
    }

    dispose(): void {
        this.disposables.forEach((d) => d.dispose());
        this.disposables = [];
    }
}
