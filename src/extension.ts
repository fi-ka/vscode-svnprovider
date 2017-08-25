'use strict';

import { Svn } from './svn'
import { SvnProvider } from './svnProvider'
import { SvnContentProvider } from './contentProvider'
import { ExtensionContext, window } from "vscode";

async function init(context: ExtensionContext) {
    
    const outputChannel = window.createOutputChannel('SvnProvider');
    const svn = new Svn(outputChannel);
    const version = await svn.getVersion();

    outputChannel.appendLine("Using SVN version: " + version)

    const svnProvider = new SvnProvider(svn);
    const contentProvider = new SvnContentProvider(svn);

    context.subscriptions.push(svnProvider, contentProvider, outputChannel);
}

export function activate(context: ExtensionContext) {
    init(context)
        .catch(err => console.error(err));
}
