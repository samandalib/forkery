import * as assert from 'assert';
import * as vscode from 'vscode';

suite('Extension Test Suite', () => {
  vscode.window.showInformationMessage('Start all tests.');

  test('Extension should be present', () => {
    assert.ok(vscode.extensions.getExtension('cursor-preview'));
  });

  test('Commands should be registered', async () => {
    const commands = await vscode.commands.getCommands();
    assert.ok(commands.includes('preview.run'));
    assert.ok(commands.includes('preview.stop'));
    assert.ok(commands.includes('preview.restart'));
  });

  test('Configuration should be available', () => {
    const config = vscode.workspace.getConfiguration('preview');
    assert.ok(config.has('port'));
    assert.ok(config.has('browserMode'));
    assert.ok(config.has('defaultScript'));
  });
});




