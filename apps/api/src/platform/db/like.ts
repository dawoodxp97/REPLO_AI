export const containsPattern = (text: string) =>
  `%${text.replace(/[\\%_]/g, (match) => `\\${match}`)}%`
