/** Pinned mathexam version (see TeX/VERSION and docs/MATHEXAM_VENDOR.md). */
export const MATHEXAM_VENDOR_VERSION = '2.3.3';

export const MATHEXAM_GITHUB_URL = 'https://github.com/vanabel/mathexam';

export const mathexamStyDownloadUrl = '/downloads/mathexam.sty';

export function mathexamTemplateZipUrl(version = MATHEXAM_VENDOR_VERSION) {
  return `/downloads/mathexam-v${version}.zip`;
}
