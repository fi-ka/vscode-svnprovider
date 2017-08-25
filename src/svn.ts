import { Uri, workspace } from 'vscode'
import * as cp from 'child_process';

export class Svn {

    private outputChannel;

    constructor(outputChannel) {
        this.outputChannel = outputChannel;
    }        

    async get_version(): Promise<string> {
        return await this._exec(["--version", "-q"]);
    }

    async get_original_file_content(path): Promise<string> {
        return await this._exec(["cat", path]);
    }

    async get_modified_files(): Promise<Uri[]> {
        return await this._exec(["status", workspace.rootPath]).then((output: string) => {
            const modified_files: Uri[] = []
            const lines = output.split("\n");
            lines.forEach(line => {
                const flags = line.substr(0, 7);
                const file = line.substr(8).trim();
                if (flags[0] == 'M') {
                    modified_files.push(Uri.file(file))
                }
            });
            return modified_files;
        });
    }

    private _exec(args: string[], options: any = {}): Promise<string> {
       return new Promise<string>((c, e) => {
            const buffers: Buffer[] = [];
            const child = cp.spawn("svn", args, options);
            this.outputChannel.appendLine("svn " + args.join(" "))
            child.stdout.on('data', (b: Buffer) => buffers.push(b));
            child.on('error', e);
            child.on('exit', code => { 
                code ? e(new Error('SVN Error')) : c(Buffer.concat(buffers).toString('utf8'))});
        });
    }
}
