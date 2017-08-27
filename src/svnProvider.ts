import { scm, commands, Command, Disposable, SourceControl, SourceControlResourceDecorations,
    SourceControlResourceState, SourceControlResourceGroup, Uri } from "vscode";
import { CommandCenter } from './commands';
import { Svn, FileStatus } from './svn';

import * as path from 'path';

const iconsRootPath = path.join(path.dirname(__dirname), '..', 'resources', 'icons');

function getIconUri(iconName: string, theme: string): Uri {
    return Uri.file(path.join(iconsRootPath, theme, `${iconName}.svg`));
}

export class SvnProvider {

    private _sourceControl: SourceControl;
    private workingCopyGroup: SourceControlResourceGroup;
    private disposables: Disposable[] = [];

    constructor(private svn: Svn) {
        this._sourceControl = scm.createSourceControl("svn", "Subversion");
        this.disposables.push(this._sourceControl);

        this._sourceControl.quickDiffProvider = this;

        this.workingCopyGroup = this._sourceControl.createResourceGroup('workingCopy', "Changes");

        const commandCenter = new CommandCenter()
        this.disposables.push(commands.registerCommand("svn.diffDocument", commandCenter.diffDocument, commandCenter));
        this.disposables.push(commands.registerCommand("svn.diffActiveDocument", commandCenter.diffActiveDocument, commandCenter));
        this.disposables.push(this.workingCopyGroup);
        
        this.updateWorkingCopyResourceState();
        setInterval(() => { this.updateWorkingCopyResourceState() }, 15000);
    }

    updateWorkingCopyResourceState() {
        this.svn.getStatus().then((result: FileStatus[]) => {
            const workingCopy = [];
            result.forEach(entry => {
                switch(entry.status) {
                    case "M":
                    case "A":
                        const resource = new Resource(entry.uri, entry.status);
                        workingCopy.push(resource);
                        break;
                    default:
                        //Skip files with other statuses for now.
                }
            });
            this.workingCopyGroup.resourceStates = workingCopy;
        });
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

export class Resource implements SourceControlResourceState {

    status: string;
    resourceUri: Uri;

    get command(): Command {
        return {
            command: "svn.diffDocument",
            title: "open",
            arguments: [this.resourceUri]
        };
    }

    get decorations(): SourceControlResourceDecorations {
        const light = { iconPath: this.getIconPath('light') };
        const dark = { iconPath: this.getIconPath('dark') };

        return {light, dark};
    }

    constructor(
        resourceUri: Uri,
        status: string
    ){
        this.resourceUri = resourceUri;
        this.status = status;
    }

    private static Icons = {
        light: {
            Modified: getIconUri('status-modified', 'light'),
            Added: getIconUri('status-added', 'light'),
            Deleted: getIconUri('status-deleted', 'light'),
            Renamed: getIconUri('status-renamed', 'light'),
            Copied: getIconUri('status-copied', 'light'),
            Untracked: getIconUri('status-untracked', 'light'),
            Ignored: getIconUri('status-ignored', 'light'),
            Conflict: getIconUri('status-conflict', 'light'),
        },
        dark: {
            Modified: getIconUri('status-modified', 'dark'),
            Added: getIconUri('status-added', 'dark'),
            Deleted: getIconUri('status-deleted', 'dark'),
            Renamed: getIconUri('status-renamed', 'dark'),
            Copied: getIconUri('status-copied', 'dark'),
            Untracked: getIconUri('status-untracked', 'dark'),
            Ignored: getIconUri('status-ignored', 'dark'),
            Conflict: getIconUri('status-conflict', 'dark')
        }
    };

    private getIconPath(theme: string): Uri | undefined {
        switch (this.status) {
            case "M": return Resource.Icons[theme].Modified;
            case "A": return Resource.Icons[theme].Added;
            default: return void 0;
        }
    }
}
