export const GOV_CAPTURE_DOMAINS = [
  'gra.gov.gh', 'gifmis.gov.gh', 'ppa.gov.gh', 'ohcs.gov.gh',
  'ghanapostgps.com', 'nia.gov.gh', 'nhis.gov.gh', 'dvla.gov.gh',
  'ssnit.org.gh', 'bost.gov.gh', 'cocobod.gh', 'ghanatenders.gov.gh',
  'eprocurement.gov.gh', 'controller.gov.gh', 'mint.gov.gh',
];

export function isGovCaptureDomain(url: string): boolean {
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    return GOV_CAPTURE_DOMAINS.some(d => hostname === d || hostname.endsWith('.' + d));
  } catch {
    return false;
  }
}
