# Install Seshflow Light Skill

This document explains how to install `seshflow-light` into Codex skills.

## Option A: Install from local repo (PowerShell)

```powershell
$repo = "D:\path\to\seshflow"
$src = "$repo\docs\skills\seshflow-light"
$dst = "$HOME\.codex\skills\seshflow-light"
New-Item -ItemType Directory -Force -Path $dst | Out-Null
Copy-Item -Recurse -Force "$src\*" $dst
```

## Option B: Install from GitHub clone (PowerShell)

```powershell
git clone https://github.com/RegretSSS/seshflow.git
$src = ".\seshflow\docs\skills\seshflow-light"
$dst = "$HOME\.codex\skills\seshflow-light"
New-Item -ItemType Directory -Force -Path $dst | Out-Null
Copy-Item -Recurse -Force "$src\*" $dst
```

## Verify

Check that this file exists:

```powershell
Get-Item "$HOME\.codex\skills\seshflow-light\SKILL.md"
```

## Use

Mention skill by name in prompt:

```text
Use seshflow-light skill to run this task workflow.
```
