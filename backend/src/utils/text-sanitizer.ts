const CONTROL_CHAR_REGEX = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;
const HTML_TAG_REGEX = /<[^>]*>/g;
const MULTI_SPACE_REGEX = /[ \t]{2,}/g;
const MULTI_NEWLINE_REGEX = /\n{3,}/g;

export function sanitizeFreeText(value: string): string {
  return value
    .replace(/\r\n/g, '\n')
    .replace(CONTROL_CHAR_REGEX, '')
    .replace(HTML_TAG_REGEX, '')
    .replace(MULTI_SPACE_REGEX, ' ')
    .replace(MULTI_NEWLINE_REGEX, '\n\n')
    .trim();
}
