#!/usr/bin/env node
const path = require('path');
const chalk = require('chalk');
const inquirer = require('inquirer');
const { execSync } = require('child_process');

inquirer.registerPrompt(
  'autocomplete',
  require('inquirer-autocomplete-prompt')
);

autocomplete().then(switchBranch);

function findBranch() {
  const remotes = findRemotes();
  const remoteRegexStr = '^(' + remotes.join('|') + ')\/';
  const remoteRegex = new RegExp(remoteRegexStr);

  return [
    ...toAutocompleteOptionList(runCommand('git branch')),
    ...toAutocompleteOptionList(runCommand('git branch -r')),
  ].filter(dedupe);

  function toAutocompleteOptionList(branchesString) {
    return branchesString
      .split('\n')
      .map(cleanBranch)
      .filter(Boolean)
      .map(branch => {
        const isRemote = remoteRegex.test(branch);
        branch = branch.replace(remoteRegex, '');
        return {
          value: branch,
          name: branch + (isRemote ? chalk.dim(' (remote)') : ''),
        };
      });
  }
}

function findRemotes() {
  return runCommand('git remote')
    .split('\n')
    .map(str => str.trim())
    .filter(Boolean);
}

function cleanBranch(str) {
  return str.trim().replace(/^\* /, '');
}

function runCommand(cmd) {
  return execSync(cmd, { encoding: 'utf-8' });
}

function dedupe(item, index, array) {
  return array.findIndex(i => i.value === item.value) === index;
}

function autocomplete() {
  const options = findBranch();

  return inquirer
    .prompt([
      {
        type: 'autocomplete',
        name: 'branch',
        message: 'gs',
        source: function(answersSoFar, input) {
          const _input = (input || '').toLowerCase();
          return Promise.resolve(
            options.filter(
              option => option.value.toLowerCase().indexOf(_input) > -1
            )
          );
        },
      },
    ])
    .then(function(answers) {
      return answers.branch;
    });
}

function switchBranch(branch) {
  try {
    execSync(`git checkout ${branch}`, { stdio: 'inherit' });
  } catch (e) {
    process.exit(1);
  }
}
