export async function loadTextUI() {
  const [{ default: chalk }, { default: ora }] = await Promise.all([
    import('chalk'),
    import('ora'),
  ]);

  return { chalk, ora };
}

export async function loadChalk() {
  const { default: chalk } = await import('chalk');
  return chalk;
}
