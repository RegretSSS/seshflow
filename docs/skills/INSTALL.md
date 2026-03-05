# Install Seshflow Light Skill

This skill is distributed from the GitHub repository.

Note: installing `seshflow` with npm/pnpm only installs the CLI, not Codex skill files.

## Option A (recommended): Download from GitHub (PowerShell)

```powershell
$dst = "$HOME\.codex\skills\seshflow-light"
New-Item -ItemType Directory -Force -Path $dst | Out-Null
Invoke-WebRequest `
  -Uri "https://raw.githubusercontent.com/RegretSSS/seshflow/master/docs/skills/seshflow-light/SKILL.md" `
  -OutFile "$dst\SKILL.md"
```

## Option B: Install from local cloned repo (PowerShell)

```powershell
git clone https://github.com/RegretSSS/seshflow.git
$src = ".\seshflow\docs\skills\seshflow-light"
$dst = "$HOME\.codex\skills\seshflow-light"
New-Item -ItemType Directory -Force -Path $dst | Out-Null
Copy-Item -Recurse -Force "$src\*" $dst
```

## Verify

```powershell
Get-Item "$HOME\.codex\skills\seshflow-light\SKILL.md"
```

## Use

```text
Use seshflow-light skill to run this task workflow.
```
